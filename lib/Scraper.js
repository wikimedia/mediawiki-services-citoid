'use strict';

/**
 * Request and translate HTML
 */

/*
 * Dependencies
*/
const BBPromise = require('bluebird');
const cheerio = require('cheerio');
const contentType = require('content-type');
const hostIsAllowed = require('./hostIsAllowed').hostIsAllowed;
const iconv = require('iconv-lite');
const parseAll = require('html-metadata').parseAll;
const urlParse = require('url');
const preq = require('preq');

/*
 * Translators
 */
const coins = require('./translators/coins.js');
const bp = require('./translators/bePress.js');
const dc = require('./translators/dublinCore.js');
const gen = require('./translators/general.js');
const og = require('./translators/openGraph.js');

const crossRefRequest = require('./crossRefRequest.js');

// TODO: Remove
let defaultLogger;
let userAgent;
let defaultTranslator;


/**
 * Get content type from response header with metatags as fall back
 * in a response object with Buffer body
 * @param  {Object} response response object with Buffer body
 * @return {string}          Content-type string or null
 */
function contentTypeFromResponse(response) {

    // Try to get content-type from header
    try {
        const obj = contentType.parse(response);// Parsed content-type header
        if (obj.parameters && obj.parameters.charset) {
            return obj.parameters.charset;
        }
    } catch (e) { // Throws a TypeError if the Content-Type header is missing or invalid.
        return null;
    }

}

/**
 * Get content type from the metadata tags in a response
 * object with cheerio loaded body with default encoding
 * @param  {Object} chtml    Cheerio object
 * @return {string}          Content-type string or null
 */
function contentTypeFromBody(chtml) {
    // TODO: Stream and read buffer with regex
    // i.e. <meta charset="iso-8859-1" />
    const charset = chtml('meta[charset]').first().attr('charset');
    if (charset) { return charset; }

    // Case insensitive since content-type may appear as Content-Type or Content-type
    let contentTypeHeader = chtml('meta[http-equiv]').filter(function() {
        // eslint-disable-next-line no-invalid-this
        return (/content-type/i).test(chtml(this).attr('http-equiv'));
    });
    if (contentTypeHeader) {
        // <meta http-equiv="Content-type" content="text/html; charset=iso-8859-1">
        contentTypeHeader = contentTypeHeader.first().attr('content');
    } else { return null; }

    if (contentTypeHeader) {
        try {
            const obj = contentType.parse(contentTypeHeader);// Parsed content-type header
            if (obj.parameters && obj.parameters.charset) {
                return obj.parameters.charset;
            }
        } catch (e) { // Throws a TypeError if the Content-Type header is missing or invalid.
            return null;
        }
    }

    return null;
}

/**
 * Create initial citation from empty citationObj
  * @param  {Object}  citationObj CitoidRequest object
 * @param  {Object}  cr           CitoidRequest object
 * @return {Object}         Pointer to citation in cr
 */
function citationFromCR(citationObj, cr) {
    // Wipe any previous citation in case a partial citation elsewhere has been created
    const content = citationObj.content;

    content.url = citationObj.url; // This field is universally present in all Zotero types

    // This itemType will be overwritten if a crossRef request is successful later on
    // todo:remove cr.
    if (cr.doi || cr.idType === 'pmid'  || cr.idType === 'pmcid' ||
            content.doi || content.idType === 'pmid'  || content.idType === 'pmcid') {
        content.itemType = 'journalArticle';
    }

    return BBPromise.resolve(content);

}

// Highwire and bepress metadata itemType determination-
// Partially copied from Zotero translators http://github.com/zotero/translators
function itemTypeFromPress(metadataBlock) {
    let i;
    let itemType = 'journalArticle';
    const keys = Object.keys(metadataBlock);
    for (i = 0; i < keys.length; i++) {
        // eslint-disable-next-line default-case
        switch (keys[i]) {
            case "journal_title":
                itemType = "journalArticle";
                return itemType;
            case "technical_report_institution":
                itemType = "report";
                return itemType;
            case "conference_title":
            case "conference":
                itemType = "conferencePaper";
                return itemType;
            case "book_title":
                itemType = "bookSection";
                return itemType;
            case "dissertation_institution":
                itemType = "thesis";
                return itemType;
            case "title":       // fall back to journalArticle, since this is quite common
            case "series_title":    // possibly journal article, though it could be book
                itemType = "journalArticle";
                return itemType;
            case 'citation_isbn':
                // Unlikely, but other item types may have ISBNs as well (e.g. Reports?)
                itemType = "book";
                return itemType;
        }
    }
    return itemType;
}


/**
 * Adds crossref rft properties to content
* @param  {Object} citationObj     Citation instance
 * @param  {Object} cr             CitoidRequest instance
 * @return {Object}                BBPromise for citation object
 */
function crossRef(citationObj, cr) {
    let citation = citationObj.content;
    const doi = citationObj.doi || cr.doi;
    if (!doi) {
        return BBPromise.reject('No DOI supplied');
    }
    return crossRefRequest(doi, userAgent, defaultLogger).then((metadata) => {
        // Set citation type from crossRef type
        // This will overwrite any previously set itemType i.e. from citationFromCR
        if (metadata.genre && coins.genre[metadata.genre]) {
            // if there is a type in the results and that type is defined in coins.js
            citation.itemType = coins.genre[metadata.genre];
        } else {
            citation.itemType = 'journalArticle'; // default itemType
        }

        // Add universal (non genre specific) coins properties
        try {
            citation = coins.other.spage(citation, metadata); // Won't add if incorrect type
        } catch (e) {
            defaultLogger.log('debug/scraper', "Failed to translate spage and epage field");
        }

        try {
            citation = coins.other.addCreators(citation, metadata); // Won't add if incorrect type
        } catch (e) {
            defaultLogger.log('debug/scraper', "Failed to translate creators field");
        }

        // Add type specific coins properties
        let typeTranslator = coins[citation.itemType];
        // If there are no appropriate translators, return.
        if (!typeTranslator) { return citation; }
        // Clone before modifying translator
        typeTranslator = Object.assign({}, typeTranslator);
        // The date field from crossRef only contains the year,
        // which results in the month being wrong
        delete typeTranslator.date;
        citation = defaultTranslator.translate(citation, metadata, typeTranslator);

        citationObj.source.push('Crossref');
        return BBPromise.resolve(cr);
    // Rejection handler
    }, () => {
        defaultLogger.log('debug/scraper', "Failed to get crossRef data");
        return BBPromise.resolve(cr);
    });
}


/**
 * Generate type for citation from metaData - currently uses OpenGraph only
 * @param  {Object} metadata objectGraph metadata obtained from html-metadata
 * @param  {Object} citation citation object
 * @return {Object}          citation object
 */
function addItemType(metadata, citation) {
    citation = citation || {};
    metadata = metadata || {};
    // Set citation type from metadata
    if (!citation.itemType) { // Don't overwrite itemtype
        if (metadata.bePress) {
            citation.itemType = itemTypeFromPress(metadata.bePress);
        } else if (metadata.highwirePress) {
            citation.itemType = itemTypeFromPress(metadata.highwirePress);
        } else if (metadata.openGraph && metadata.openGraph.type &&
                og.types[metadata.openGraph.type]) {
            // if there is a type in the results and that type is defined in openGraph.js
            citation.itemType = og.types[metadata.openGraph.type];
        } else if (metadata.dublinCore && metadata.dublinCore.type &&
                dc.types[metadata.dublinCore.type]) {
            // if there is a type in the results and that type is defined in dublinCore.js
            citation.itemType = dc.types[metadata.dublinCore.type];
        } else {
            citation.itemType = 'webpage'; // default itemType
        }
    }
    return citation;
}

/**
 * Gets title in other ways if not metadata is available
 * @param  {string} url   url
 * @param  {Object} chtml Cheerio object with html loaded
 * @return {string}       best title available for citation
 **/

function getTitle(url, chtml) {

    // Try to get title from itemprop="heading" // Schema.org microdata
    const title = chtml('*[itemprop~="headline"]').first().text();
    if (title) { return title; }

    // Default
    return url;
}

/**
 * Fallback methods for if metadata from html-metadata library can't be obtained
 * @param  {Object} content  citation content
 * @param  {string} url      user requested url
 * @param  {Object} chtml    cheerio html object
 * @return {Object}          citaiton object
 */
function fallback(content, url, chtml) {
    let parsedUrl;

    // Required fields: title, itemType

    // itemType
    if (!content.itemType) {
        content.itemType = 'webpage';
    }

    // Title
    if (!content.title) {
        content.title = getTitle(url, chtml);
    }

    // URL
    if (!content.url) {
        content.url = url;
    }

    // Access date - universal - format YYYY-MM-DD
    content.accessDate = (new Date()).toISOString().split('T').shift();

    // Fall back websiteTitle - webpage only
    if (content.itemType === 'webpage' && !content.websiteTitle) {
        parsedUrl = urlParse.parse(url);
        if (content.title && parsedUrl && parsedUrl.hostname) {
            content.websiteTitle = parsedUrl.hostname;
        }
    }

    return content;
}

/**
 * Create 4xx citation- defaults to creates 200 if crossRef succeeds
 * @param  {Object} citationObj    Citation object
 * @param  {Object} cr             CitoidRequest object
 * @return {Object}          BBPromise for CitoidRequest object
 */
function build4xx(citationObj, cr) {
    // Try to use DOI before returning 404
    return crossRef(citationObj, cr).then((citoidRequest) => {
        citoidRequest.response.responseCode = 200;
        citationObj.responseCode = 200;
        // todo remove cr.doi
        defaultLogger.log('debug/scraper',
            `Sucessfully got metadata from doi ${citationObj.doi}`);
        return BBPromise.resolve(citoidRequest);
    // Rejection
    }, (e) => {
        // todo remove cr.doi
        defaultLogger.log('info/scraper', {
            msg: `Unable to get any metadata from doi ${citationObj.doi}; returning 404 response.`,
            reason: `${e}`
        });
        citationObj.responseCode = 404;
        citationObj.error = { Error: `Unable to load URL ${citationObj.url}` };
        return BBPromise.resolve(cr);
    });
}


class Scraper {


    constructor(app, translator, exporter) {

        this.logger = app.logger;

        this.exporter = exporter;
        this.translator = translator;

        this.userAgent = app.conf.userAgent;
        this.conf = app.conf;

        userAgent = app.conf.userAgent;
        defaultLogger = this.logger;
        defaultTranslator = this.translator;
    }

    /**
    * Promise that always returns a citoidRequest object,
    * with a citation and a response code added to the citationObj
    * citoidResponse object
    * @param  {Object} citation
    * @param  {Object} cr
    * @return {Object}          CitoidRequest object
    */
    scrape(citation, cr) {
        const citationObj = citation;
        let chtml;
        const logger = this.logger;
        const acceptLanguage = cr.acceptLanguage;
        const url = citation.url;
        const userAgent = this.userAgent;
        const citationPromise = citationFromCR(citationObj, cr); // Promise for citation

        return hostIsAllowed(url, this.conf, this.logger, true)
        .then(() => {

            logger.log('debug/scraper', `Using native scraper on ${url}`);
            return preq({
                uri: url,
                followAllRedirects: true,
                jar: cr.jar, // Set cookie jar for request
                encoding: null, // returns page in Buffer object
                headers: {
                    'Accept-Language': acceptLanguage,
                    'User-Agent': userAgent
                }
            }).then((response) => {
                if (!response || response.status !== 200) {
                    if (!response) {
                        logger.log('warn/scraper', `No response from resource server at ${url}`);
                    } else {
                        logger.log('warn/scraper', `Status from resource server at ${url
                        }: ${response.status}`);
                    }
                    return citationPromise.then((citation) => {
                        return build4xx(citationObj, cr);
                    });
                } else {
                    let str; // String from decoded Buffer object
                    const defaultCT = 'utf-8'; // Default content-type
                    let contentType = contentTypeFromResponse(response);

                    // Load html into cheerio object; if neccesary, determine
                    // content type from html loaded with default content-type, and
                    // then reload again if non-default content-type is obtained.
                    if (contentType) {
                        // Content Type detected in response
                        try {
                            str = iconv.decode(response.body, contentType);
                            chtml = cheerio.load(str);
                        } catch (e) {
                            logger.log('warn/scraper', e);
                        }
                    } else {
                        str = iconv.decode(response.body, defaultCT);
                        try {
                            chtml = cheerio.load(str);
                            contentType = contentTypeFromBody(chtml);
                            // If contentType is scraped from body and is NOT the default
                            // CT already loaded, re-decode and reload into cheerio.
                            if (contentType && contentType !== defaultCT) {
                                try {
                                    str = iconv.decode(response.body, contentType);
                                    chtml = cheerio.load(str);
                                } catch (e) {
                                    // On failure, defaults to loaded body with default CT.
                                    logger.log('warn/scraper', e);
                                }
                            }
                        } catch (e) {
                            logger.log('warn/scraper', e);
                        }
                    }

                    // If the html has been successfully loaded into cheerio, proceed.
                    if (chtml) {
                        // Create initial citation, which returns citation
                        return citationPromise.then((citation) => {
                            return this.parseHTML(citationObj, cr, chtml).then(
                                // Success handler for parseHTML
                                () => {
                                    logger.log('debug/scraper',
                                        `Sucessfully scraped resource at ${url}`);
                                    citationObj.responseCode = 200;
                                    citationObj.source.push('citoid');

                                    return cr;
                                },
                                // Rejection handler for parseHTML
                                (e) => {
                                    logger.log('debug/scraper', {
                                        msg: `Failed to parse HTML of resource at ${url}`,
                                        error: `${e}`
                                    });
                                    return build4xx(citationObj, cr);
                                }
                            );
                        });
                    } else {
                        logger.log('debug/scraper', `Failed to scrape resource at ${url}`);
                        return citationPromise.then((citation) => {
                            return build4xx(citationObj, cr);
                        });
                    }
                }
            },
            // Rejection handler for preq
            (response) => {
                logger.log('debug/scraper', {
                    msg: `Failed to scrape resource at ${url}`,
                    error: `${response}`
                });
                return citationPromise.then((citation) => {
                    return build4xx(citationObj, cr);
                });
            })
            // Error handling for preq
            .catch((error) => {
                logger.log('warn/scraper', error);
                return citationPromise.then((citation) => {
                    return build4xx(citationObj, cr);
                });
            });
        })
        // Error handling for hostIsAllowed
        .catch((error) => {
            logger.log('warn/scraper', error);
            return citationPromise.then((citation) => {
                return build4xx(citationObj, cr);
            });
        });
    }


    /**
    * Promise for citation object with html metadata added to default
    * citation object
    * @param  {Object} citationObj the citation object
    * @param  {string} cr          CitoidRequest object
    * @param  {Object} chtml       Cheerio object with html loaded
    * @return {Object}             Bluebird promise for citation object
    */
    parseHTML(citationObj, cr, chtml) {
        const logger = this.logger;
        let content = citationObj.content;

        const addMetadata = (metadata) => {
            logger.log('debug/scraper', "Running syncronous methods");

            content = addItemType(metadata, content);

            // Use bePress.js translator for highwirePress metadata
            content = this.translator.translate(content, metadata.highwirePress,
                bp[content.itemType]);

            // Use bePress.js translator for bepress metadata
            content = this.translator.translate(content, metadata.bePress,
                bp[content.itemType]);

            // openGraph.js translator properties
            content = this.translator.translate(content, metadata.openGraph,
                og[content.itemType]);

            // dublinCore.js translator properties
            content = this.translator.translate(content, metadata.dublinCore,
                dc[content.itemType]);

            // general.js translator properties
            content = this.translator.translate(content, metadata.general,
                gen[content.itemType]);

            // Fall back on direct scraping methods
            content = fallback(content, content.url, chtml);

            // DOI is only a valid field in Zotero for journalArticle and conferencePaper types
            if (citationObj.doi && (content.itemType === 'journalArticle' ||
                    content.itemType === 'conferencePaper')) {
                content.DOI = citationObj.doi;
            }
            return BBPromise.resolve(content);
        };

        return parseAll(chtml)
        .then((metadata) => {
            // Try to get DOI from metadata before doing crossRef request
            if (!citationObj.doi) {
                const reDOI = new RegExp('\\b10\\.[0-9]{3,5}(?:[.][0-9]+)*/.*');
                // TODO: make work with Array
                if (metadata.dublinCore && metadata.dublinCore.identifier &&
                        metadata.dublinCore.identifier.match(reDOI)) {
                    citationObj.doi = metadata.dublinCore.identifier.match(reDOI)[0];
                } else if (metadata.highwirePress && metadata.highwirePress.doi &&
                        metadata.highwirePress.doi.match(reDOI)) {
                    citationObj.doi = metadata.highwirePress.doi.match(reDOI)[0];
                } else if (metadata.bePress &&
                        metadata.bePress.doi && metadata.bePress.doi.match(reDOI)) {
                    citationObj.doi = metadata.bePress.doi.match(reDOI)[0];
                }
            }
            return crossRef(citationObj, cr).then((citoidRequest) => {
                return addMetadata(metadata);
            },
            // Rejection handler for crossRef
            (e) => {
                logger.log('debug/scraper', { msg: "crossRef failure", reason: `${e}` });
                return addMetadata(metadata);
            });
        },
        // Rejection handler for parseAll
        (e) => {
            logger.log('debug/scraper', { msg: "ParseAll failure", reason: `${e}` });
            return fallback(content);
        });

    }


}


module.exports = {
    contentTypeFromResponse,
    contentTypeFromBody,
    itemTypeFromPress,
    addItemType,
    Scraper
};
