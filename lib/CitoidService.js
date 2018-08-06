'use strict';

/**
 * Handles requests to the citoid service
 */

/* Import Modules */
const BBPromise = require('bluebird');
const preq = require('preq');
const urlParse = require('url');

/* Import Local Modules */
const AddressError = require('./hostIsAllowed').AddressError;
const Citation = require('./Citation.js');
const cRef = require('./translators/crossRef.js');
const CrossRefService = require('./external-apis/CrossRefService.js');
const Exporter = require('./Exporter.js').Exporter;
const fetchPubMedIDs = require('./Exporter.js').fetchPubMedIDs;
const hostIsAllowed = require('./hostIsAllowed').hostIsAllowed;
const JSONReader = require('./JSONReader.js');
const pubMedRequest = require('./external-apis/pubMedRequest.js');
const Scraper = require('./Scraper.js').Scraper;
const Translator = require('./Translator.js');
const unshorten = require('./unshorten.js');
const WorldCatService = require('./external-apis/WorldCatService.js');
const XMLReader = require('./XMLReader.js');
const ZoteroService = require('./ZoteroService.js');

class CitoidService {

    /**
    * Constructor for CitoidService object
    * @param {Object} app   Express object containing logger, stats, conf
    */
    constructor(app) {

        this.pubmed = app.conf.pubmed;

        this.userAgent = app.conf.userAgent;
        this.logger = app.logger;
        this.stats = app.metrics;
        this.conf = app.conf;

        // Only create zoteroService if configured to
        if (this.conf.zotero) {
            this.zoteroService = new ZoteroService(app);
        }

        // Exports internal format (zotero) to other formats (i.e., mediawiki)
        this.exporter = new Exporter(app);
        // Provides translation functions for following Objs
        this.translator = new Translator(app);
        // Loads html and scrapes it
        this.scraper = new Scraper(app, this.translator, this.exporter);
        this.crossRefService = new CrossRefService(app);

        // Create worldcat service if using either isbn service
        if (this.conf.xisbn || this.conf.wskey) {
            this.worldCatService = new WorldCatService(app, this.translator);
        }

        // Only create xisbn scrapers if configured to
        if (this.conf.xisbn) {
            this.json = new JSONReader(app, this.translator); // Translates from xisbn services
        }

        // WorldCat services that require wskey
        if (this.conf.wskey) {
            this.xml = new XMLReader(app, this.translator, this.worldCatService);
        }

        // Only create circular references for zoteroService if configured to
        if (this.conf.zotero) {
            this.zoteroService.exporter = this.exporter;
            this.exporter.zoteroService = this.zoteroService;
        }

    }

    /**
    * Requests to the citoid service
    * @param  {Object}   cr     CitoidRequest object
    * @return {Object}          BBPromise for CitoidRequest object
    */
    request(cr) {

        return this.addResponseFunction(cr).then((cr) => {
            return BBPromise.all(cr.getResults.map(x => x.reflect()))
                .then(cr.fillBody.bind(cr), cr.fillBody.bind(cr));
        }, cr.fillBody.bind(cr)).catch((e) => {
            this.logger.log('debug/citoidRequest', e);
        });
    }

    /**
    * Promise for adding correct response function given input type
    * @param  {Object}  cr  CitoidRequest object with new functions added to getResults Array
    * @return {Object}      BBPromise object for modified CitoidRequest object from input
    */
    addResponseFunction(cr) {
        const logger = this.logger;
        const wskey = this.conf.wskey; // String containing wskey for worldcat Search API
        const xisbn = this.conf.xisbn; // Bool determining whether worldcat xisbn use is enabled

        const search = cr.search.trim();
        const lowerSearch = search.toLowerCase();

        let cit;
        let idValue;
        let parsedURL;
        let url;

        logger.log('debug/CitoidService', "Adding response function");

        // Try to parse a candidate url and add http as protocol if missing
        const setParsedURL = (candidate) => {
            parsedURL = urlParse.parse(candidate);
            // Set protocol to http if it is missing, and re-parse url
            if (!parsedURL.protocol) {
                url = `http://${candidate}`;
                parsedURL = urlParse.parse(url);
            }

            // Remove query string from parsed url and re-generate string url TODO: why?
            parsedURL.query = null;
            parsedURL.search = null;
            url = urlParse.format(parsedURL);
        };

        setParsedURL(lowerSearch);

        /* Regex fields */
        // Assumes all strings with http/s protocol are URLs
        const reDOI = new RegExp('\\b10\\.[0-9]{3,5}(?:[.][0-9]+)*/.*');
        const reHTTP = new RegExp('^((https?)://.+)');
        // Used for detecting matches only, not selecting.
        // eslint-disable-next-line max-len
        const reISBN = new RegExp('((?:978[\\--– ])?[0-9][0-9\\--– ]{10}[\\--– ][0-9xX])|((?:978)?[0-9]{9}[0-9Xx])', 'g');
        const reQID = /^[Qq][1-9]+[0-9]*$/; // Strict QIQ match - doesn't get it out of whitespace
        // Assumes all strings with www substring are URLs
        const reWWW = new RegExp('^((www)\\..+\\..+)');
        // Detects url *inside* a search string
        // eslint-disable-next-line max-len
        const reURI = /(?:https?:\/\/|www\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[A-Z0-9+&@#/%=~_|$])/igm;

        /* Regex Matches */
        // Look for DOI in URL with query string removed or original search parameter
        const matchDOI = url.match(reDOI) || lowerSearch.match(reDOI);
        const matchHTTP = search.match(reHTTP);
        const matchQID = search.match(reQID);
        const matchWWW = search.match(reWWW);
        const matchURI = search.match(reURI);

        if (matchDOI && matchDOI[0]) {
            cr.doi = matchDOI[0];
        }
        if (matchHTTP || matchWWW) {
            idValue = matchHTTP ? encodeURI(matchHTTP[0]) : `http://${encodeURI(matchWWW[0])}`;
            logger.log('debug/CitoidService', "Found URI");
            cit = new Citation('url', idValue);
            cr.response.citations.push(cit);
            cr.getResults.push(this.requestFromURL(cit, cr));
            this.stats.increment('input.url');
            return BBPromise.resolve(cr);
        }

        if (matchDOI) {
            logger.log('debug/CitoidService', "DOI detected");
            cit = new Citation('doi', matchDOI[0]);
            cr.response.citations.push(cit);
            cr.getResults.push(this.requestFromDOI(cit, cr));
            this.stats.increment('input.doi');
            return BBPromise.resolve(cr);
        }

        if (matchQID) {
            logger.log('debug/CitoidService', "QID detected");
            const wikidataURL = `https://www.wikidata.org/wiki/${matchQID[0]}`;
            cit = new Citation('url', wikidataURL);
            cit.qid = matchQID[0].toUpperCase();
            cr.response.citations.push(cit);
            cr.getResults.push(this.requestFromURL(cit, cr));
            this.stats.increment('input.qid');
            return BBPromise.resolve(cr);
        }

        const rePMCID = new RegExp('\\bPMC\\d{7}\\b');
        const matchPMCID = search.match(rePMCID);
        if (matchPMCID) {
            logger.log('debug/CitoidService', "PMCID detected");
            cit = new Citation('pmcid', matchPMCID[0]);
            cr.response.citations.push(cit);
            cr.getResults.push(this.requestFromPM(cit, cr));
            this.stats.increment('input.pmcid');
            return BBPromise.resolve(cr);
        }

        // Original isbn match is too lenient; this gets actual isbn more
        // accurately by cleaning out non-numerical characters
        if (reISBN.test(search)) {
            if (xisbn || wskey) { // Enable isbn usage
                const reDash = new RegExp('[\\-–]', 'g');
                const reISBN2 = new RegExp('((978 ?)[0-9]{10}|[0-9]{9}[0-9xX])', 'g');
                const value = search.trim().replace(reDash, '');
                const match = value.match(reISBN2);
                if (match) {
                    logger.log('debug/CitoidService', "ISBN detected");
                    let matchISBN2 = match[0];
                    // Remove any spaces (e.g. 978 0810935310)
                    matchISBN2 = matchISBN2.replace(/ /g, '');
                    cit = new Citation('isbn', matchISBN2);
                    cr.response.citations.push(cit);
                    if (wskey) {
                        cr.getResults.push(this.requestToWSKEY(cit, cr));
                    } else if (xisbn) {
                        cr.getResults.push(this.requestToXISBN(cit, cr));
                    }
                    this.stats.increment('input.isbn');
                    return BBPromise.resolve(cr);
                }
            }
        } else {
            // Avoid interpreting ISBNs as PMIDs if ISBNs are not enabled
            // (since PMID regex captures strings of one to eight numbers)
            // Accepts 'PMID 1234' or '1234'; No 9 digit pmids yet.
            const rePMID = /^(?:PMID )?([1-9]\d{0,8})\b/;
            const matchPMID = search.match(rePMID);
            if (matchPMID) {
                logger.log('debug/CitoidService', "PMID or PMCID detected");
                cit = new Citation('pmid', matchPMID[1]);
                cr.response.citations.push(cit);
                cr.getResults.push(this.requestFromPM(cit, cr));
                this.stats.increment('input.pmid');
                // Possibly a PMCID or an OCLC
                if (matchPMID[0] === matchPMID[1]) { // Just a string of less than 9 digits
                    cit = new Citation('pmcid', `PMC${matchPMID[1]}`);
                    cr.response.citations.push(cit);
                    cr.getResults.push(this.requestFromPM(cit, cr));
                }
                return BBPromise.resolve(cr);
            }
        }

        // If it has at least one period and no spaces, assume it's a url
        // Matches things like 'example.com', excludes things like 'mediawiki' and 'Harry Potter'.
        if (search.indexOf('.') >= 0 && search.indexOf(' ') === -1) {
            logger.log('debug/CitoidService', "Trying URI");
            cit = new Citation('url', url);
            cr.response.citations.push(cit);
            cr.getResults.push(this.requestFromURL(cit, cr));
            this.stats.increment('input.url');
            return BBPromise.resolve(cr);
        }

        // Case: Unknown input
        // Try open search, and also try to extract URI from inside input

        // Try open search for all other queries
        logger.log('debug/CitoidService', "Trying open search query");
        cit = new Citation('any', search);
        cr.response.citations.push(cit);
        cr.getResults.push(this.requestFromSearch(cit, cr));
        this.stats.increment('input.any');

        // Pulls URL from inside a query contain spaces and other text, i.e. formatted
        // citations like 'The Title. www.example.com. Accessed 5/3/18'
        if (matchURI) {
            setParsedURL(matchURI[0]);
            idValue = encodeURI(url);
            logger.log('debug/CitoidService', "Found URI");
            cit = new Citation('url', idValue);
            cr.response.citations.push(cit);
            cr.getResults.push(this.requestFromURL(cit, cr));
        }

        return BBPromise.resolve(cr);

    }

    /**
    * Generic function for citation objects which are unable to be created
    * @param  {Object}  citation    Citation object
    * @param  {Object}  cr          CitoidRequest ojbect
    * @param  {Object}  [error]     optional Error object
    * @return {Object}              CitoidRequest object
    */
    rejectWithError(citation, cr, error) {
        if (error) {
            citation.error = { Error: error.message };
        } else {
            citation.error = { Error: 'Unknown error' };
        }
        if (error && error instanceof AddressError) {
            citation.responseCode = 400;
        } else {
            citation.responseCode = 404;
        }
        return cr;
    }

    /**
    * Generic function for failed creation of ISBN requests
    * @param  {Object}  citation    Citation object
    * @param  {Object}  cr          CitoidRequest object
    * @return {Object}              CitoidRequest object
    */
    rejectISBN(citation, cr) {
        const message = `Unable to retrieve data from ISBN ${citation.isbn}`;
        const error = { Error: message };
        this.logger.log('debug/ISBN', message);
        citation.error = error;
        citation.responseCode = 404;

        return cr;
    }

    /**
    * Promise of citation metadata from a DOI
    * @param  {Object}  citation  the citation object
    * @param  {Object}  cr        CitoidRequest object with doi and format
    * @return {Object}            BBPromise for CitoidRequest object
    */
    requestFromDOI(citation, cr) {
        this.logger.log('debug/CitoidService', "requestFromDOI method");
        citation.format = cr.format;
        const doi = citation.doi = citation.doi || cr.doi;
        const timeout = this.conf.timeout; // Milliseconds to wait before returning w/ crossref data

        if (doi === undefined) {
            return BBPromise.reject('No doi in citoid request object');
        }

        // If pubmed !== true, we don't wait for this promise to finish because it
        // can be quite slow;
        // If it gets the IDs in time, good, if not, it won't.
        if (!citation.hasRequestedPubMed && (doi || citation.pmcid || citation.pmid)) {
            citation.hasRequestedPubMed = fetchPubMedIDs(citation);
        }

        const doiLink = `https://doi.org/${doi}`;
        // Options for obtaining url the DOI resolves to
        const resolveOpts = {
            uri : doiLink,
            method: 'head',
            followRedirect : false,
            headers: {
                'User-Agent': this.userAgent
            }
        };

        const reject = () => {
            const message = `Unable to resolve DOI ${doi}`;
            const error = { Error: message };
            this.logger.log('debug/DOI', message);

            citation.error = error;
            citation.responseCode = 404;

            return cr;
        };

        // Get data from crossref - reject promise if not 200
        const crossref = () => {
            return this.crossRefService.doi(doi).then((metadata) => {
                if (metadata.type && cRef.types[metadata.type]) {
                    citation.content.itemType = cRef.types[metadata.type];
                } else {
                    citation.content.itemType = 'journalArticle'; // Default itemType
                }

                const typeTranslator = cRef[citation.content.itemType];
                // If there are no appropriate translators, return.
                if (!typeTranslator) { return reject(); }

                citation.content = this.translator.translate(citation.content,
                    metadata, typeTranslator);

                citation.source.push('Crossref');
                citation.responseCode = 200;

                return BBPromise.resolve(cr);
            // Rejection handler
            }, () => {
                this.logger.log('debug/scraper', "Failed to get crossRef data");
                return BBPromise.reject();
            }).catch((e) => {
                this.logger.log('debug/citoidRequest', e);
                return BBPromise.reject();
            });
        };

        // Resolve canonical URL from DOI URL - reject promise if not 200
        const fromURL = preq(resolveOpts).then((res) => {
            if (res && res.status > 300 && res.status < 400 &&
            res.headers.location) {

                citation.url = res.headers.location;

                // Send canonical URL to requestFromURL
                this.logger.log('debug/DOI', `Resolved DOI ${
                    doi} to URL ${citation.url
                }; Sending to requestFromURL`);
                return this.requestFromURL(citation, cr).then(
                    () => {
                        // requestFromURL doesn't normally reject with failure,
                        // so we have to force it based on the response code
                        // TODO: potentially fix this
                        if (citation.responseCode !== 200) {
                            return BBPromise.reject();
                        } else {
                            return cr;
                        }
                    });
            } else {
                return BBPromise.reject();
            }
        }, () => { return BBPromise.reject(); }

        );

        function tm() {
            return BBPromise.reject(`Timeout of ${timeout} ms exceeded`).delay(timeout);
        }

        // If no timeout is set, use crossref as back-up method
        if (!timeout) {
            return fromURL.then(
                () => { return cr; },
                // Try cross if it fails
                () => {
                    return crossref().then(
                        () => { return cr; },
                        // 404 response if crossref fails as well
                        () => { return reject(); }
                    );
                });
        } else {
            // Returns crossref data only if the data from the URL has exceeded
            // the timeout; unless there is no data from crossref, in which case
            // we wait the full amount of time for fromURL to complete.
            return BBPromise.some([crossref(), fromURL, tm], 2).then((res) => {
                return cr;
            }, () => {
                return reject();
            });
        }

    }

    /**
    * Requests citation metadata from a PMID or PMCID identifier.
    * @param  {Object}  citation  the citation object
    * @param  {Object}  cr        CitoidRequest object with pm(c)id, type and format
    * @return {Object}            BBPromise for CitoidRequest object
    */
    requestFromPM(citation, cr) {
        this.logger.log('debug/CitoidService', "requestFromPM method");
        citation.format = cr.format;
        citation.doi = citation.doi || cr.doi;

        // If pubmed != true, we don't wait for this promise to finish because it can be quite slow
        // If it gets the IDs in time, good, if not, it won't.
        if (!citation.hasRequestedPubMed && (citation.doi || citation.pmcid || citation.pmid)) {
            citation.hasRequestedPubMed = fetchPubMedIDs(citation);
        }

        let e;
        let message;
        const type = citation.idType;
        const baseURL = 'https://www.ncbi.nlm.nih.gov/';
        const logger = this.logger;
        const zotero = this.conf.zotero;

        switch (type) {
            case 'pmid':
                // Set url in Citation object for subseqent zoteroWebRequest
                citation.url = `${baseURL}pubmed/${citation.pmid}`;
                break;
            case 'pmcid':
                // Set url in Citation object for subseqent zoteroWebRequest
                citation.url = `${baseURL}pmc/articles/${citation.pmcid}/`;
                break;
            default:
                message = `Unknown PubMed type: ${type}`;
                e = { Error: message };
                logger.log('warn/pubmed', message);
                citation.error = e;
                citation.responseCode = 404;
                return cr;
        }

        this.logger.log('debug/pubmed', {
            from: citation.idValue,
            to: citation.url,
            type
        });

        // Create error and return citoidResponse with error
        const failure = (cr) => {
            message = `Unable to locate resource with ${type} ${citation.idValue}`;
            e = { Error: message };

            citation.error = e;
            citation.responseCode = 404;

            logger.log('info/pubmed', message);
            return cr;
        };

        // Fallback to pubmed doi translator if Zotero is down or translator not found
        const fallback = (cr) => {
            return pubMedRequest(citation.idValue, this.userAgent, logger).then((obj) => {
                const doi = obj.records[0].doi;
                logger.log('debug/pubmed', `Got DOI ${doi}`);
                if (doi) {
                    cr.doi = doi;
                    citation.doi = doi;
                    citation.source.push('PubMed');

                    return this.requestFromDOI(citation, cr).catch((e) => {
                        logger.log('debug/pubmed', e.Error);
                        return failure(cr);
                    });
                } else {
                    logger.log('debug/pubmed', "No DOI found");
                    return failure(cr);
                }
            }, () => {
                logger.log('debug/pubmed', "Pubmed request failed");
                return failure(cr);
            });
        };

        const onResolve = (cr) => {
            logger.log('debug/zotero', "Successfully retrieved body from Zotero");
            return cr;
        };

        const onReject = (response) => {
            // Case: Zotero service is unreachable
            if (response && response.status === 504) {
                return fallback(cr);
            }
            // Case: Translator for pubmed is not present or is broken
            // TODO: Test
            if (response && response.status === 501) {
                return fallback(cr);
            } else {
                return failure(cr);
            }
        };

        // Only query Zotero if it is enabled
        if (zotero) {
            return this.zoteroService.zoteroWebRequest(cr, citation)
            .then(onResolve, onReject)
            .catch((error) => {
                logger.log('warn/zotero', error);
                this.stats.increment('zotero.req.error');
            });
        } else {
            return fallback(cr);
        }

    }

    /**
    * Promise of requested citation metadata from a URL
    * @param  {Object}  citation  Pointer to particular citation object
    * @param  {Object}  cr        CitoidRequest object with new functions added to getResults Array
    * @return {Object}            BBPromise object for modified CitoidRequest object from input
    */
    requestFromURL(citation, cr) {
        this.logger.log('debug/CitoidService', "requestFromURL method");
        citation.format = cr.format;
        citation.doi = citation.doi || cr.doi;

        // If pubmed != true, we don't wait for this promise to finish because it can be quite slow
        // If it gets the IDs in time, good, if not, it won't.
        if (!citation.hasRequestedPubMed && (citation.doi || citation.pmcid || citation.pmid)) {
            citation.hasRequestedPubMed = fetchPubMedIDs(citation);
        }

        const zotero = this.conf.zotero;
        const url = citation.url;

        if (!url) {
            return BBPromise.reject('No url in Citation object');
        }

        const reject = (error) => {
            if (cr.doi) {
                return this.requestFromDOI(citation, cr).catch((e) => {
                    return this.rejectWithError(citation, cr, e);
                });
            } else {
                return this.rejectWithError(citation, cr, error);
            }
        };

        return hostIsAllowed(url, this.conf, this.logger, true)
        .then(() => {
            const logger = this.logger;
            const requestedURL = url;

            // Uses Zotero
            const onResolve = (cr) => {
                logger.log('debug/zotero', "Successfully retrieved body from Zotero");
                return cr;
            };
            // Uses Zotero
            const onReject = (response) => {
                logger.log('trace/zotero', "No Zotero translator found, looking for redirects");
                // Try again following all redirects-
                // We don't do this initially because many sites
                // will redirect to a log-in screen
                return unshorten(requestedURL, this.userAgent, cr.jar, this.conf, this.logger)
                .then((expandedURL) => {
                    logger.log('trace/zotero', `Redirect detected to ${expandedURL}`);
                    citation.url = expandedURL;
                    return this.zoteroService.zoteroWebRequest(cr, citation)
                    .then(onResolve,
                        // Rejection handler zoteroWebRequest
                        () => {
                            logger.log('debug/zotero', "No Zotero response available.");
                            citation.url = requestedURL;
                            return this.scraper.scrape(citation, cr);
                        })
                    .catch((error) => {
                        logger.log('warn/zotero', error);
                        this.stats.increment('zotero.req.error');
                    });
                })
                // Rejection handler for unshorten
                .catch((error) => {
                    logger.log('debug/zotero', error);
                    // May have disallowed IP, but scraper will check this
                    return this.scraper.scrape(citation, cr).then(() => {
                        if (citation.responseCode !== 200 && error instanceof AddressError) {
                            return this.rejectWithError(citation, cr, error);
                        }
                        return cr;
                    });
                });
            };

            // Use Zotero onResolve and onReject functions above
            if (zotero) {
                return this.zoteroService.zoteroWebRequest(cr, citation)
                .then(onResolve, onReject)
                .catch((error) => {
                    logger.log('warn/zotero', error);
                    this.stats.increment('zotero.req.error');
                    return BBPromise.reject(error);
                });
            // Don't query Zotero if disabled
            } else {
                return this.scrapeHTML(citation, cr);
            }

        },
        // Failure
        reason => reject(reason)
        ).catch(error => reject(error));

    }

    /**
    * Promise of requested citation metadata from an open search query,
    * i.e. a plain text formatted citation or the title of a work.
    * Currently uses crossRef, support for worldcat to be added later.
    * @param  {Object}  citation  Pointer to particular citation object
    * @param  {Object}  cr        CitoidRequest object with new functions added to getResults Array
    * @return {Object}            BBPromise object for modified CitoidRequest object from input
    */
    requestFromSearch(citation, cr) {
        this.logger.log('debug/CitoidService', "requestFromSearch method");
        citation.format = cr.format;
        let worldcatPromise = false; // Only used if wskey is enabled

        // Try worldcat open search too if enabled in conf
        if (this.conf.wskey) {
            const wscit = new Citation('any', citation.any);
            wscit.format = cr.format;
            cr.response.citations.push(wscit);

            worldcatPromise = this.worldCatService.openSearch(wscit.any).then((results) => {

                return this.xml.translate(wscit, cr, results, 'open', false).then(() => {},
                    () => {
                        return this.rejectWithError(wscit, cr,
                            'Failed to get results from worldcat');
                    });
            }).catch((error) => {
                this.logger.log('debug/WorldCatService', error);
                return this.rejectWithError(wscit, cr, 'Failed to get results from worldcat');
            });

        }

        const crossrefPromise = this.crossRefService.search(citation.any).then((metadata) => {
            // Set citation type from crossref type
            // This will *not* overwrite previously set itemType i.e. from citationFromCR
            if (metadata.type && cRef.types[metadata.type]) {
                citation.content.itemType = cRef.types[metadata.type];
            } else {
                citation.content.itemType = 'journalArticle'; // Default itemType
            }

            const typeTranslator = cRef[citation.content.itemType];
            // If there are no appropriate translators, return.
            if (!typeTranslator) { return this.rejectWithError(citation, cr); }

            citation.content = this.translator.translate(citation.content,
                metadata, typeTranslator);

            citation.content.accessDate = (new Date()).toISOString().substring(0, 10);

            citation.source.push('Crossref');
            citation.responseCode = 200;

            return BBPromise.resolve(cr);

        // Rejection handler
        }, () => {
            this.logger.log('debug/scraper', "Failed to get results from crossref");
            return this.rejectWithError(citation, cr);
        }).catch((e) => {
            this.logger.log('debug/citoidRequest', e);
            return this.rejectWithError(citation, cr, e);
        });

        if (!worldcatPromise) {
            return crossrefPromise;
        } else {
            return BBPromise.all([crossrefPromise, worldcatPromise]).then(() => {
                return cr;
            }).catch((e) => {
                this.logger.log('debug/citoidRequest', e);
                return cr;
            });
        }

    }

    /**
    * Promise of requested citation metadata from an ISBN. Uses worldcat search API
    * @param  {Object}  citation  Pointer to particular citation object
    * @param  {Object}  cr        CitoidRequest object with pm(c)id, type and format
    * @return {Object}            BBPromise object for modified CitoidRequest object from input
    */
    requestToWSKEY(citation, cr) {
        this.logger.log('debug/CitoidService', "requestToWSKEY method");
        citation.format = cr.format;
        citation.doi = cr.doi;

        const dcXML = this.worldCatService.singleRecordRequest(citation.isbn, 'isbn', 'dc');
        const marcXML = this.worldCatService.singleRecordRequest(citation.isbn, 'isbn', 'marc');

        // Make concurrent requests for the data in both Dublin Core and MarcXML
        return BBPromise.all([dcXML, marcXML]).then((results) => {

            // Promises for scraping results from each of dc and marc
            // Boolean at end allows multiple creators translators to be used within
            // the dc translator
            const scrapeDC = this.xml.translate(citation, cr, results[0], 'dc', true);
            const scrapeMARC = this.xml.translate(citation, cr, results[1], 'marc');

            // Scrape dc first because it can determine type
            return scrapeDC.then(() => {
                return scrapeMARC.then(() => {
                    citation.responseCode = 200;
                    citation.source.push('WorldCat');
                    return cr;
                },
                // If rejected by scrapeMARC, still send 200 because DC was successfully added
                () => {
                    citation.responseCode = 200;
                    citation.source.push('WorldCat');
                    return cr;
                });
            },
            // If unable to scrape DC, reject.
            () => this.rejectISBN(citation, cr));
        }, () => this.rejectISBN(citation, cr));

    }

    /**
    * Promise of requested citation metadata from an ISBN. Uses worldcat xISBN service.
    * @param  {Object}  citation  Pointer to particular citation object
    * @param  {Object}  cr        CitoidRequest object with pm(c)id, type and format
    * @return {Object}            BBPromise object for modified CitoidRequest object from input
    */
    requestToXISBN(citation, cr) {
        this.logger.log('debug/CitoidService', "requestToXISBN method");
        citation.format = cr.format;
        citation.doi = cr.doi;

        // Make request to WorldCat xisbn service
        return this.worldCatService.xisbnRequest(citation.isbn).then(
            (body) => {
                // Add oclc number to the request object
                if (body.list[0].oclcnum && body.list[0].oclcnum[0] &&
                        typeof body.list[0].oclcnum[0] === 'string') {
                    cr.oclc = body.list[0].oclcnum[0];
                    citation.oclc = body.list[0].oclcnum[0];
                    // Add WorldCat as a source of the metadata
                    citation.source.push('WorldCat');
                    // Convert xisbn json into citation
                    return this.xisbnTranslator(citation, cr, body);
                } else {
                    return this.rejectISBN(citation, cr);
                }
            },
            // Rejection handler
            () => this.rejectISBN(citation, cr)
        );

    }

    /**
    * Scrape and export to Zotero translator if nessecary
    * @param  {Object}  citation  Citation object
    * @param  {Object}  cr        CitoidRequest object
    * @return {Object}            BBPromise for CitoidRequest object
    */
    scrapeHTML(citation, cr) {
        return this.scraper.scrape(citation, cr);
    }

    /**
    * Convert JSON into citation - currently takes xisbn JSON only
    * @param  {Object}  citation  Citation object
    * @param  {Object}  cr        CitoidRequest object
    * @param  {Object}  json      Object containing JSON to convert into citation
    * @return {Object}            BBPromise for CitoidRequest object
    */
    xisbnTranslator(citation, cr, json) {
        return this.json.translate(citation, cr, json);
    }

}


module.exports = CitoidService;
