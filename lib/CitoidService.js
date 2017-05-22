'use strict';

/**
 * Handles requests to the citoid service
 */

/* Import Modules */
var BBPromise = require('bluebird');
var dns = BBPromise.promisifyAll(require('dns'));
var ip = require('ip');
var net = require('net');
var preq = require('preq');
var urlParse = require('url');

/* Import Local Modules */
var Citation = require('./Citation.js');
var CitoidRequest = require('./CitoidRequest.js');
var hostIsAllowed = require('./hostIsAllowed').hostIsAllowed;
var AddressError = require('./hostIsAllowed').AddressError;
var pubMedRequest = require('./pubMedRequest.js');
var unshorten = require('./unshorten.js');
var WorldCatService = require('./WorldCatService.js');
var ZoteroService = require('./ZoteroService.js');

var Translator = require('./Translator.js');
var Scraper = require('./Scraper.js');
var Exporter = require('./Exporter.js');
var JSONReader = require('./JSONReader.js');
var XMLReader = require('./XMLReader.js');

/**
 * Constructor for CitoidService object
 * @param {Object} app   Express object containing logger, stats, conf
 */
function CitoidService(app) {

    this.userAgent = app.conf.userAgent;
    this.logger = app.logger;
    this.stats = app.metrics;
    this.conf = app.conf;

    // Only create zoteroService if configured to
    if (this.conf.zotero) {
        this.zoteroService = new ZoteroService(app);
    }

    this.exporter = new Exporter(app); // Exports internal format (zotero) to other formats (i.e., mediawiki)
    this.translator = new Translator(app); // Provides translation functions for following Objs
    this.scraper = new Scraper(app, this.translator, this.exporter); // Loads html and scrapes it

    // Create worldcat service if using either isbn service
    if (this.conf.xisbn || this.conf.wskey){
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
 * @param   {Object}   cr     CitoidRequest object
 * @returns {Object}          BBPromise for CitoidRequest object
 */
CitoidService.prototype.request = function(cr) {

    var logger = this.logger;

    return this.addResponseFunction(cr).then(function(cr){
        return BBPromise.all(cr.getResults.map(x => x.reflect())).then(cr.fillBody.bind(cr), cr.fillBody.bind(cr));
    }, cr.fillBody.bind(cr)).catch(function(e){
        logger.log('debug/citoidRequest', e);
    });
};

/**
 * Promise for adding correct response function given input type
 * @param  {Object}   cr     CitoidRequest object with new functions added to getResults Array
 * @return {Object}          BBPromise object for modified CitoidRequest object from input
 */
CitoidService.prototype.addResponseFunction = BBPromise.method(function(cr){
    var xisbn = this.conf.xisbn; // Bool determining whether worldcat xisbn use is enabled
    var wskey = this.conf.wskey; // String containing wskey for worldcat Search API
    var url;
    var self = this;
    var search = cr.search;
    var lowerSearch = search.toLowerCase();
    var parsedURL = urlParse.parse(lowerSearch); // Parse search field as if it is a url
    var logger = this.logger;
    var doi;
    var idValue;
    var cit;

    logger.log('debug/CitoidService', "Adding response function");

    // Set protocol to http if it is missing, and re-parse url
    if (!parsedURL.protocol){
        url = 'http://'+ lowerSearch;
        parsedURL = urlParse.parse(url);
    }

    // Remove query string from parsed url and re-generate string url
    parsedURL.query = null;
    parsedURL.search = null;
    url = urlParse.format(parsedURL);

    // Regex fields
    var reHTTP = new RegExp('^((https?)://.+\\..+)'); // Assumes all strings with http/s protocol are URLs
    var reWWW = new RegExp('^((www)\\..+\\..+)'); // Assumes all strings with www substring are URLs
    var reDOI = new RegExp('\\b10\\.[0-9]{3,5}(?:[.][0-9]+)*/.*');
    var reISBN = new RegExp('((?:978[\\--– ])?[0-9][0-9\\--– ]{10}[\\--– ][0-9xX])|((?:978)?[0-9]{9}[0-9Xx])', 'g'); // Used for detecting matches only, not selecting.

    var matchHTTP = search.match(reHTTP);
    var matchWWW = search.match(reWWW);

    // Look for DOI in URL with query string removed or original search parameter
    var matchDOI = url.match(reDOI) || lowerSearch.match(reDOI);

    if (matchDOI && matchDOI[0]) {
        doi = cr.doi = matchDOI[0];
    }

    function foundURI(idValue){
        logger.log('debug/CitoidService', "URI detected");
        cit = new Citation('url', idValue);
        cr.response.citations.push(cit);
        cr.getResults.push(self.requestFromURL(cit, cr));
        self.stats.increment('input.url');
        return cr;
    }

    if (matchHTTP || matchWWW){
        idValue = matchHTTP ? encodeURI(matchHTTP[0]) : 'http://' + encodeURI(matchWWW[0]);
        return foundURI(idValue);
    }

    if (matchDOI) {
        logger.log('debug/CitoidService', "DOI detected");
        cit = new Citation('doi', matchDOI[0]);
        cr.response.citations.push(cit);
        cr.getResults.push(self.requestFromDOI(cit, cr));
        self.stats.increment('input.doi');
        return cr;
    }

    var rePMCID = new RegExp('\\bPMC\\d{7}\\b');
    var matchPMCID = search.match(rePMCID);
    if (matchPMCID) {
        logger.log('debug/CitoidService', "PMCID detected");
        cit = new Citation('pmcid', matchPMCID[0]);
        cr.response.citations.push(cit);
        cr.getResults.push(self.requestFromPM(cit, cr));
        self.stats.increment('input.pmcid');
        return cr;
    }

    if (reISBN.test(search)) { // Original isbn match is too lenient; this gets actual isbn more accurately by cleaning out non-numerical characters
        if (xisbn || wskey) { // Enable isbn usage
            var reDash = new RegExp('[\\-–]', 'g');
            var reISBN2 = new RegExp('((978 ?)[0-9]{10}|[0-9]{9}[0-9xX])', 'g');
            var value = search.trim().replace(reDash, '');
            var match = value.match(reISBN2);
            if (match) {
                logger.log('debug/CitoidService', "ISBN detected");
                var matchISBN2 = match[0];
                matchISBN2 = matchISBN2.replace(/ /g, ''); // Remove any spaces (e.g. 978 0810935310)
                cit = new Citation('isbn', matchISBN2);
                cr.response.citations.push(cit);
                if (wskey) {
                    cr.getResults.push(self.requestToWSKEY(cit, cr));
                } else if (xisbn) {
                    cr.getResults.push(self.requestToXISBN(cit, cr));
                }
                self.stats.increment('input.isbn');
                return cr;
            }
        }
    } else { // Avoid interpreting ISBNs as PMIDs if ISBNs are not enabled (since PMID regex captures strings of one to eight numbers)
        var rePMID = /^(?:PMID )?([1-9]\d{0,8})\b/; // Accepts 'PMID 1234' or '1234'; No 9 digit pmids yet.
        var matchPMID = search.match(rePMID);
        if (matchPMID) {
            logger.log('debug/CitoidService', "PMID or PMCID detected");
            cit = new Citation('pmid', matchPMID[1]);
            cr.response.citations.push(cit);
            cr.getResults.push(self.requestFromPM(cit, cr));
            self.stats.increment('input.pmid');
            // Possibly a PMCID or an OCLC
            if (matchPMID[0] === matchPMID[1]){ // Just a string of less than 9 digits
                cit = new Citation('pmcid', 'PMC' + matchPMID[1]);
                cr.response.citations.push(cit);
                cr.getResults.push(self.requestFromPM(cit, cr));
            }
            return cr;
        }
    }

    // Case: Unknown input
    // try url
    return foundURI(url);

});

/**
 * Promise of requested citation metadata from a URL
 * @param  {Object}   cr         CitoidRequest object with new functions added to getResults Array
* @param  {Object}   (citation)  Optional Citation object.
 * @return {Object}              BBPromise object for modified CitoidRequest object from input
 */
CitoidService.prototype.requestFromURL = function(citation, cr) {
    this.logger.log('debug/CitoidService', "requestFromURL method");
    citation.format = cr.format;
    citation.doi = citation.doi || cr.doi;

    var zotero = this.conf.zotero;
    var url = citation.url;
    var self = this;

    if (!url){
        return BBPromise.reject('No url in Citation object');
    }

    function rejectWithError(error){
        if (error){
            citation.error = {Error: error.message};
        } else {
            citation.error = {Error: 'Unknown error'};
        }
        if (error && error instanceof AddressError) {
                citation.responseCode = 400;
        }
        else {
            citation.responseCode = 404;
        }
        return cr;
    }

    return hostIsAllowed(url, self.conf, self.logger, true)
    .then( function() {
        var logger = self.logger;
        var requestedURL = url;
        var format = cr.format;
        var prom;
        var zoteroWebRequest;

        if (zotero) {
            zoteroWebRequest = self.zoteroService.zoteroWebRequest.bind(self.zoteroService);
            prom = zoteroWebRequest(cr, citation);
        }
        // Uses Zotero
        function onResolve(cr){
            logger.log('debug/zotero', "Successfully retrieved body from Zotero");
            citation.source.push('Zotero');
            return cr;
        }
        // Uses Zotero
        function onReject(response){
            logger.log('trace/zotero', "No Zotero translator found, looking for redirects");
            // Try again following all redirects-
            // We don't do this initially because many sites
            // will redirect to a log-in screen
            return unshorten(requestedURL, self.userAgent, cr.jar, self.conf, self.logger)
                .then(function(expandedURL) {
                    logger.log('trace/zotero', "Redirect detected to "+ expandedURL);
                    citation.url = expandedURL;
                    return zoteroWebRequest(cr, citation)
                        .then(onResolve,
                            // Rejection handler zoteroWebRequest
                            function(){
                                logger.log('debug/zotero', "No Zotero response available.");
                                citation.url = requestedURL;
                                return self.scrapeHTML(citation, cr);
                            })
                        .catch(function(error){
                            logger.log('warn/zotero', error);
                            self.stats.increment('zotero.req.error');
                        });
                })
                // Rejection handler for unshorten
                .catch(function (error){
                    logger.log('debug/zotero', error);
                    return self.scrapeHTML(citation, cr).then(function(){
                        if (citation.responseCode !== 200 && error instanceof AddressError ){
                            return rejectWithError(error);
                        }
                        return cr;
                    });
                });
        }

        // Use Zotero onResolve and onReject functions above
        if (zotero) {
            return prom
            .then(onResolve, onReject)
            .catch(function(error){
                logger.log('warn/zotero', error);
                self.stats.increment('zotero.req.error');
                return BBPromise.reject(error);
            });
        // Don't query Zotero if disabled
        } else {
            return self.scrapeHTML(citation, cr);
        }

    },
    // Failure
    function(reason){
        return rejectWithError(reason);
    })
    .catch(function(error){
        return rejectWithError(error);
    });

};

/**
 * Promise of citation metadata from a DOI
 * @param  {Object}   cr     CitoidRequest object with doi and format
 * @return {Object}          BBPromise for CitoidRequest object
 */
CitoidService.prototype.requestFromDOI = function(citation, cr) {
    this.logger.log('debug/CitoidService', "requestFromDOI method");
    citation.format = cr.format;
    citation.doi = citation.doi || cr.doi;

    var doi = citation.doi;

    if (doi === undefined) {
        return BBPromise.reject('No doi in citoid request object');
    }

    var doiLink = 'https://doi.org/'+ doi;

    var self = this;
    var urlOpts =  {};
    // Options for obtaining url the DOI resolves to
    var resolveOpts = {
        uri : doiLink,
        method: 'head',
        followRedirect : false,
        headers: {
            'User-Agent': this.userAgent
        }
    };

    // Set responses if below is rejected
    function reject(cr){
        var message = 'Unable to resolve DOI ' + doi;
        var error = {Error: message};
        self.logger.log('debug/DOI', message);

        citation.error = error;
        citation.responseCode = 404;

        return cr;
    }

    // Resolve canonical URL from DOI URL
    return preq(resolveOpts).then(
    // Preq resolve handler
    function (res) {
        if (res && res.status > 300 && res.status < 400 &&
                res.headers.location) {

            citation.url = res.headers.location;

            // Send canonical URL to requestFromURL
            self.logger.log('debug/DOI', "Resolved DOI "
                + doi + " to URL " + citation.url +
                "; Sending to requestFromURL");
            return self.requestFromURL(citation, cr);
        } else {
            return reject(cr);
        }
    },
    // Preq rejection handler
    function(res){
        return reject(cr);
    });
};

/**
 * Requests citation metadata from a PMID or PMCID identifier.
 * @param  {Object}   cr     CitoidRequest object with pm(c)id, type and format
 * @returns {Object}         BBPromise for CitoidRequest object
 */
CitoidService.prototype.requestFromPM = function(citation, cr){
    this.logger.log('debug/CitoidService', "requestFromPM method");
    citation.format = cr.format;
    citation.doi = citation.doi || cr.doi;

    var e;
    var message;
    var self = this;
    var type = citation.idType;
    var baseURL = 'https://www.ncbi.nlm.nih.gov/';
    var logger = self.logger;
    var format = cr.format;
    var zotero = self.conf.zotero;
    var zoteroWebRequest;

    // Only create object if Zotero is enabledcrypto
    if (zotero) {
        zoteroWebRequest = self.zoteroService.zoteroWebRequest.bind(self.zoteroService);
    }

    switch(type) {
        case 'pmid':
            // Set url in Citation object for subseqent zoteroWebRequest
            citation.url = baseURL + 'pubmed/' + citation.pmid;
            break;
        case 'pmcid':
            // Set url in Citation object for subseqent zoteroWebRequest
            citation.url = baseURL + 'pmc/articles/' + citation.pmcid + '/';
            break;
        default:
            message = 'Unknown PubMed type: ' + type;
            e = {Error: message};
            logger.log('warn/pubmed', message);
            citation.error = e;
            citation.responseCode = 404;
            return cr;
    }

    self.logger.log('debug/pubmed', {from: citation.idValue, to: citation.url,
        type: type});

    // Create error and return citoidResponse with error
    function failure(cr){
        message = 'Unable to locate resource with ' + type + ' ' + citation.idValue;
        e = {Error: message};

        citation.error = e;
        citation.responseCode = 404;

        logger.log('info/pubmed', message);
        return cr;
    }

    // Fallback to pubmed doi translator if Zotero is down or translator not found
    function fallback(cr){
        return pubMedRequest(citation.idValue, self.userAgent, logger).then(function(obj){
            var doi = obj.records[0].doi;
            logger.log('debug/pubmed', "Got DOI " + doi);
            if (doi){
                cr.doi = doi;
                citation.doi = doi;
                citation.source.push('PubMed');

                return self.requestFromDOI(citation, cr).catch(function(e){
                    logger.log('debug/pubmed', e.Error);
                    return failure(cr);
                });
            } else {
                logger.log('debug/pubmed', "No DOI found");
                return failure(cr);
            }
        }, function(){
            logger.log('debug/pubmed', "Pubmed request failed");
            return failure(cr);
        });
    }

    function onResolve(cr){
        logger.log('debug/zotero', "Successfully retrieved body from Zotero");
        return cr;
    }

    function onReject(response){
        // Case: Zotero service is unreachable
        if (response && response.status === 504){
            return fallback(cr);
        }
        // Case: Translator for pubmed is not present or is broken
        // TODO: Test
        if (response && response.status === 501){
            return fallback(cr);
        } else {
            return failure(cr);
        }
    }

    // Only query Zotero if it is enabled
    if (zotero) {
        return zoteroWebRequest(cr, citation)
        .then(onResolve, onReject)
        .catch(function(error){
            logger.log('warn/zotero', error);
            self.stats.increment('zotero.req.error');
        });
    } else {
        return fallback(cr);
    }

};

/**
 * Promise of requested citation metadata from an ISBN. Uses worldcat search API
 * @param  {Object}   cr     CitoidRequest object with new functions added to getResults Array
 * @return {Object}          BBPromise object for modified CitoidRequest object from input
 */
CitoidService.prototype.requestToWSKEY = function(citation, cr) {
    this.logger.log('debug/CitoidService', "requestToWSKEY method");
    citation.format = cr.format;
    citation.doi = cr.doi;

    var self = this;

    var dcXML;
    var scrapeDC;

    var marcXML;
    var scrapeMARC;

    // Set responses if below is rejected
    function reject(){
        var message = 'Unable to retrieve data from ISBN ' + citation.isbn;
        var error = {Error: message};
        self.logger.log('debug/ISBN', message);

        citation.error = error;
        citation.responseCode = 404;

        return cr;
    }

    dcXML = this.worldCatService.singleRecordRequest(citation.isbn, 'isbn', 'dc');
    marcXML = this.worldCatService.singleRecordRequest(citation.isbn, 'isbn', 'marc');

    // Make concurrent requests for the data in both Dublin Core and MarcXML
    return BBPromise.all([dcXML, marcXML]).then(function(results){

        // Promises for scraping results from each of dc and marc
        scrapeDC =  self.scrapeXML(citation, cr, results[0], 'dc', true); // Boolean at end allows multiple creators translators to be used within the dc translator
        scrapeMARC =  self.scrapeXML(citation, cr, results[1], 'marc');

        // Scrape dc first because it can determine type
        return scrapeDC.then(function(){
            return scrapeMARC.then(function(){
                citation.responseCode = 200;
                citation.source.push('WorldCat');
                return cr;
            },
            // If rejected by scrapeMARC, still send 200 because DC was successfully added
            function(){
                citation.responseCode = 200;
                citation.source.push('WorldCat');
                return cr;
            });
        },
        // If unable to scrape DC, reject.
        function(){
            reject();
        });
    },
    function(){
        reject();
    });


};

/**
 * Promise of requested citation metadata from an ISBN. Uses worldcat xISBN service.
 * @param  {Object}   cr     CitoidRequest object with new functions added to getResults Array
 * @return {Object}          BBPromise object for modified CitoidRequest object from input
 */
CitoidService.prototype.requestToXISBN = function(citation, cr) {
    this.logger.log('debug/CitoidService', "requestToXISBN method");
    citation.format = cr.format;
    citation.doi = cr.doi;

    var self = this;

    // Set responses if below is rejected
    function reject(cit){
        var message = 'Unable to retrieve data from ISBN ' + cit.isbn;
        var error = {Error: message};
        self.logger.log('debug/ISBN', message);

        cit.error = error;
        cit.responseCode = 404;

        return cr;
    }

    // Make request to WorldCat xisbn service
    return this.worldCatService.xisbnRequest(citation.isbn).then(
        function(body){
            // Add oclc number to the request object
            if (body.list[0].oclcnum && body.list[0].oclcnum[0] && typeof body.list[0].oclcnum[0] === 'string') {
                cr.oclc = body.list[0].oclcnum[0];
                citation.oclc = body.list[0].oclcnum[0];
                // Add WorldCat as a source of the metadata
                citation.source.push('WorldCat');
                // Convert xisbn json into citation
                return self.xisbnTranslator(citation, cr, body);
            } else {
                return reject(citation);
            }
        },
        // Rejection handler
        function(){
            return reject(citation);
        }
    );

};

/**
 * Scrape and export to Zotero translator if nessecary
 * @param  {Object}   citation         Citation object
 * @param  {Object}   cr               CitoidRequest object
 * @return {Object}                    BBPromise for CitoidRequest object
 */
CitoidService.prototype.scrapeHTML = function(citation, cr){
    return this.scraper.scrape(citation, cr);
};

/**
 * Convert JSON into citation - currently takes xisbn JSON only
 * @param  {Object}   citation         Citation object
 * @param  {Object}   cr               CitoidRequest object
 * @param  {Object}   json             Object containing JSON to convert into citation
 * @return {Object}                    BBPromise for CitoidRequest object
 */
CitoidService.prototype.xisbnTranslator = function(citation, cr, json){
    return this.json.translate(citation, cr, json);
};

/**
 * Convert XML into citation - currently takes worldcat search API xml only
 * @param  {Object}   citation         Citation object
 * @param  {Object}   cr               CitoidRequest object
 * @param  {Object}   xml              Raw xml returned in response
 * @param  {String}   wskeyFormat      Format the XML citation will come back in. Can be 'dc', 'marcXML', or WorldCat's native 'openSearch' format
 * @return {Object}                    BBPromise for CitoidRequest object
 */
CitoidService.prototype.scrapeXML = function(citation, cr, xml, wskeyFormat, creatorOverwrite){
    return this.xml.translate(citation, cr, xml, wskeyFormat, creatorOverwrite);
};

module.exports = CitoidService;
