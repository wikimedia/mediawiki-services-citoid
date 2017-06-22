'use strict';

/**
 * Request and translate HTML
 */

/*
 * Dependencies
*/
var AddressError = require('./hostIsAllowed').AddressError;
var BBPromise = require('bluebird');
var cheerio = require('cheerio');
var contentType = require('content-type');
var hostIsAllowed = require('./hostIsAllowed').hostIsAllowed;
var iconv = require('iconv-lite');
var parseAll = require('html-metadata').parseAll;
var urlParse = require('url');
var preq = require('preq');

/*
 * Translators
 */
var coins = require('./translators/coins.js');
var bp = require('./translators/bePress.js');
var dc = require('./translators/dublinCore.js');
var gen = require('./translators/general.js');
var og = require('./translators/openGraph.js');

var crossRefRequest = require('./crossRefRequest.js');

//TODO: Remove
var defaultLogger;
var userAgent;
var defaultTranslator;

var Scraper = function(app, translator, exporter){

    this.logger = app.logger;

    this.exporter = exporter;
    this.translator = translator;

    this.userAgent = app.conf.userAgent;
    this.conf = app.conf;

    userAgent = app.conf.userAgent;
    defaultLogger = this.logger;
    defaultTranslator = this.translator;
};

exports = module.exports = Scraper;

/**
 * Promise that always returns a citoidRequest object,
 * with a citation and a response code added to the citationObj
 * citoidResponse object
 * @param  {Object}          CitoidRequest object
 * @return {Object}          CitoidRequest object
 */
Scraper.prototype.scrape = function(citation, cr){
    var citationObj = citation;
    var chtml;
    var logger = this.logger;
    var self = this;
    var acceptLanguage = cr.acceptLanguage;
    var url = citation.url;
    var userAgent = self.userAgent;
    var citationPromise = citationFromCR(citationObj, cr); // Promise for citation

    return hostIsAllowed(url, self.conf, self.logger, true)
    .then( function() {

        logger.log('debug/scraper', "Using native scraper on " + url);
        return preq({
            uri: url,
            followAllRedirects: true,
            jar: cr.jar, // Set cookie jar for request
            encoding: null, // returns page in Buffer object
            headers: {
                'Accept-Language': acceptLanguage,
                'User-Agent': userAgent
            }
        }).then(function(response){
            if (!response || response.status !== 200) {
                if (!response){
                    logger.log('warn/scraper', "No response from resource server at " + url);
                } else {
                    logger.log('warn/scraper', "Status from resource server at " + url +
                        ": " + response.status);
                }
                return citationPromise.then(function(citation){
                    return build4xx(citationObj, cr);
                });
            } else {
                var str; // String from decoded Buffer object
                var defaultCT = 'utf-8'; // Default content-type
                var contentType = exports.contentTypeFromResponse(response);

                // Load html into cheerio object; if neccesary, determine
                // content type from html loaded with default content-type, and
                // then reload again if non-default content-type is obtained.
                if (contentType){
                    // Content Type detected in response
                    try {
                        str = iconv.decode(response.body, contentType);
                        chtml = cheerio.load(str);
                    } catch (e){
                        logger.log('warn/scraper', e);
                    }
                } else {
                    str = iconv.decode(response.body, defaultCT);
                    try {
                        chtml = cheerio.load(str);
                        contentType = exports.contentTypeFromBody(chtml);
                        // If contentType is scraped from body and is NOT the default
                        // CT already loaded, re-decode and reload into cheerio.
                        if (contentType && contentType!== defaultCT){
                            try {
                                str = iconv.decode(response.body, contentType);
                                chtml = cheerio.load(str);
                            } catch(e){
                                // On failure, defaults to loaded body with default CT.
                                logger.log('warn/scraper', e);
                            }
                        }
                    } catch(e){
                        logger.log('warn/scraper', e);
                    }
                }

                // If the html has been successfully loaded into cheerio, proceed.
                if (chtml){
                    // Create initial citation, which returns citation
                    return citationPromise.then(function(citation){
                        return self.parseHTML(citationObj, cr, chtml).then(
                            // Success handler for parseHTML
                            function(){
                                logger.log('debug/scraper', "Sucessfully scraped resource at " + url);

                                citationObj.responseCode = 200;
                                citationObj.source.push('citoid');

                                return cr;
                            },
                            // Rejection handler for parseHTML
                            function(){
                                logger.log('debug/scraper', "Failed to parse HTML of resource at " + url);
                                return build4xx(citationObj, cr);
                            }
                        );
                    });
                } else {
                    logger.log('debug/scraper', "Failed to scrape resource at " + url);
                    return citationPromise.then(function(citation){
                        return build4xx(citationObj, cr);
                    });
                }
            }
        },
        // Rejection handler for preq
        function(response){
            logger.log('debug/scraper', "Failed to scrape resource at " + url);
            return citationPromise.then(function(citation){
                return build4xx(citationObj, cr);
            });
        })
        // Error handling for preq
        .catch(function(error){
            logger.log('warn/scraper', error);
            return citationPromise.then(function(citation){
                return build4xx(citationObj, cr);
            });
        });
    })
    // Error handling for hostIsAllowed
    .catch(function(error){
        logger.log('warn/scraper', error);
        return citationPromise.then(function(citation){
            return build4xx(citationObj, cr);
        });
    });
};


/**
 * Get content type from response header with metatags as fall back
 * in a response object with Buffer body
 * @param  {Object} response response object with Buffer body
 * @return {String}          Content-type string or null
 */
exports.contentTypeFromResponse = function(response){

    // Try to get content-type from header
    try {
        var obj = contentType.parse(response);// Parsed content-type header
        if (obj.parameters && obj.parameters.charset){
            return obj.parameters.charset;
        }
    } catch(e){// Throws a TypeError if the Content-Type header is missing or invalid.
        return null;
    }

};

/**
 * Get content type from the metadata tags in a response
 * object with cheerio loaded body with default encoding
 * @param  {Object} chtml    Cheerio object
 * @return {String}          Content-type string or null
 */
exports.contentTypeFromBody = function(chtml){
    // TODO: Stream and read buffer with regex
    var charset = chtml('meta[charset]').first().attr('charset'); // i.e. <meta charset="iso-8859-1" />
    if (charset) {return charset;}

    // Case insensitive since content-type may appear as Content-Type or Content-type
    var contentTypeHeader = chtml('meta[http-equiv]').filter(function() {
        return (/content-type/i).test(chtml(this).attr('http-equiv'));
    });
    if (contentTypeHeader){
        contentTypeHeader = contentTypeHeader.first().attr('content'); // <meta http-equiv="Content-type" content="text/html; charset=iso-8859-1">
    } else {return null;}

    if (contentTypeHeader){
        try {
            var obj = contentType.parse(contentTypeHeader);// Parsed content-type header
            if (obj.parameters && obj.parameters.charset){
                return obj.parameters.charset;
            }
        } catch(e){// Throws a TypeError if the Content-Type header is missing or invalid.
            return null;
        }
    }

    return null;
};

/**
 * Promise for citation object with html metadata added to default
 * citation object
 *
 * @param  {String} cr          CitoidRequest object
 * @param  {Object} chtml       Cheerio object with html loaded
 * @return {Object}             Bluebird promise for citation object
 */
Scraper.prototype.parseHTML = function(citationObj, cr, chtml){
    var logger = this.logger;
    var translate = this.translator.translate;
    var content = citationObj.content;

    var addMetadata = BBPromise.method(function(metadata){
        logger.log('debug/scraper', "Running syncronous methods");

        content = addItemType(metadata, content);

        // Use bePress.js translator for highwirePress metadata
        content = translate(content, metadata.highwirePress, bp[content.itemType]);

        // Use bePress.js translator for bepress metadata
        content = translate(content, metadata.bePress, bp[content.itemType]);

        // openGraph.js translator properties
        content = translate(content, metadata.openGraph, og[content.itemType]);

        // dublinCore.js translator properties
        content = translate(content, metadata.dublinCore, dc[content.itemType]);

        // general.js translator properties
        content = translate(content, metadata.general, gen[content.itemType]);

        // Fall back on direct scraping methods
        content = fallback(content, content.url, chtml);

        // DOI is only a valid field in Zotero for journalArticle and conferencePaper types
        if (citationObj.doi && (content.itemType === 'journalArticle' || content.itemType === 'conferencePaper')){
            content.DOI = citationObj.doi;
        }
        return content;
    });

    return parseAll(chtml)
    .then(function(metadata){
        // Try to get DOI from metadata before doing crossRef request
        if (!citationObj.doi){
            var reDOI = new RegExp('\\b10\\.[0-9]{3,5}(?:[.][0-9]+)*/.*');
            // TODO: make work with Array
            if (metadata.dublinCore && metadata.dublinCore.identifier && metadata.dublinCore.identifier.match(reDOI)){
                citationObj.doi = metadata.dublinCore.identifier.match(reDOI)[0];
            }
            else if (metadata.highwirePress && metadata.highwirePress.doi && metadata.highwirePress.doi.match(reDOI)){
                citationObj.doi = metadata.highwirePress.doi.match(reDOI)[0];
            }
            else if (metadata.bePress && metadata.bePress.doi && metadata.bePress.doi.match(reDOI)){
                citationObj.doi = metadata.bePress.doi.match(reDOI)[0];
            }
        }
        return crossRef(citationObj, cr).then(function(citoidRequest){
            return addMetadata(metadata);
        },
        // Rejection handler for crossRef
        function(){
            logger.log('debug/scraper', "crossRef failure");
            return addMetadata(metadata);
        });
    },
    // Rejection handler for parseAll
    function(){
        logger.log('debug/scraper', "ParseAll failure");
        return fallback(content);
    });

};

/**
 * Adds crossref rft properties to content
* @param  {Object} citationObj     Citation instance
 * @param  {Object} cr             CitoidRequest instance
 * @return {Object}                BBPromise for citation object
 */
var crossRef = BBPromise.method(function(citationObj, cr){
    var citation = citationObj.content;
    var doi = citationObj.doi || cr.doi;
    var translate = defaultTranslator.translate;
    if (!doi){
        return BBPromise.reject('No DOI supplied');
    }
    return crossRefRequest(doi, userAgent, defaultLogger).then(function(metadata){
        // Set citation type from crossRef type
        // This will overwrite any previously set itemType i.e. from citationFromCR
        if (metadata.genre && coins.genre[metadata.genre]){ // if there is a type in the results and that type is defined in coins.js
            citation.itemType = coins.genre[metadata.genre];
        } else {
            citation.itemType = 'journalArticle'; //default itemType
        }

        // Add universal (non genre specific) coins properties
        try {
            citation = coins.other.spage(citation, metadata); // Won't add if incorrect type
        } catch (e){
            defaultLogger.log('debug/scraper', "Failed to translate spage and epage field");
        }

        try {
            citation = coins.other.addCreators(citation, metadata); // Won't add if incorrect type
        } catch (e){
            defaultLogger.log('debug/scraper', "Failed to translate creators field");
        }

        // Add type specific coins properties
        var typeTranslator = coins[citation.itemType];
        if (!typeTranslator){return citation;} // If there are no appropriate translators, return.
        typeTranslator = Object.assign({}, typeTranslator); // Clone before modifying translator
        delete typeTranslator.date; // The date field from crossRef only contains the year, which results in the month being wrong
        citation = translate(citation, metadata, typeTranslator);

        citationObj.source.push('Crossref');
        return cr;
    // Rejection handler
    }, function(){
        defaultLogger.log('debug/scraper', "Failed to get crossRef data");
        return cr;
    });
});


/**
 * Generate type for citation from metaData - currently uses OpenGraph only
 * @param  {Object} metadata objectGraph metadata obtained from html-metadata
 * @param  {Object} citation citation object
 * @return {Object}          citation object
 */
function addItemType(metadata, citation){
    citation = citation || {};
    metadata = metadata || {};
    // Set citation type from metadata
    if (!citation.itemType){ // Don't overwrite itemtype
        if (metadata.bePress){
            citation.itemType = itemTypeFromPress(metadata.bePress);
        }
        else if (metadata.highwirePress){
            citation.itemType = itemTypeFromPress(metadata.highwirePress);
        }
        else if (metadata.openGraph && metadata.openGraph['type'] && og.types[metadata.openGraph['type']]){ // if there is a type in the results and that type is defined   in openGraph.js
            citation.itemType = og.types[metadata.openGraph['type']];
        }
        else if (metadata.dublinCore && metadata.dublinCore['type'] && dc.types[metadata.dublinCore['type']]){ // if there is a type in the results and that type is defined in dublinCore.js
            citation.itemType = dc.types[metadata.dublinCore['type']];
        }
        else {
            citation.itemType = 'webpage'; //default itemType
        }
    }
    return citation;
}

/**
 * Fallback methods for if metadata from html-metadata library can't be obtained
 * @param  {Object} content  citation content
 * @param  {String} url      user requested url
 * @param  {Object} chtml    cheerio html object
 * @return {Object}          citaiton object
 */
function fallback(content, url, chtml){
    var parsedUrl;

    // Required fields: title, itemType

    // itemType
    if (!content.itemType){
        content.itemType = 'webpage';
    }

    // Title
    if (!content.title){
        content.title = getTitle(url, chtml);
    }

    // URL
    if (!content.url){
        content.url = url;
    }

    // Access date - universal - format YYYY-MM-DD
    content.accessDate = (new Date()).toISOString().split('T').shift();

    // Fall back websiteTitle - webpage only
    if (content.itemType === 'webpage' && !content.websiteTitle){
        parsedUrl = urlParse.parse(url);
        if (content.title && parsedUrl && parsedUrl.hostname) {
            content.websiteTitle = parsedUrl.hostname;
        }
    }

    return content;
}

/**
 * Gets title in other ways if not metadata is available
 * @param  {String} url   url
 * @param  {Object} chtml Cheerio object with html loaded
 * @return {String}       best title available for citation
 **/

function getTitle(url, chtml) {

    var title;

    // Try to get title from itemprop="heading" // Schema.org microdata
    title = chtml('*[itemprop~="headline"]').first().text();
    if (title) { return title; }

    // Default
    return url;
}

/**
 * Create 4xx citation- defaults to creates 200 if crossRef succeeds
 * @param  {Object} citationObj    Citation object
 * @param  {Object} cr             CitoidRequest object
 * @return {Object}          BBPromise for CitoidRequest object
 */
var build4xx = BBPromise.method(function(citationObj, cr){
    // Try to use DOI before returning 404
    return crossRef(citationObj, cr).then(function(citoidRequest){
        citoidRequest.response.responseCode = 200;
        citationObj.responseCode = 200;
        defaultLogger.log('debug/scraper', "Sucessfully got metadata from doi " + citationObj.doi); //todo remove cr.doi
        return citoidRequest;
    // Rejection
    }, function(){
        defaultLogger.log('info/scraper', "Unable to get any metadata from doi " + citationObj.doi + "; returning 404 response."); //todo remove cr.doi
        citationObj.responseCode = 404;
        citationObj.error = {Error: 'Unable to load URL ' + citationObj.url};
        return cr;
    });
});

/**
 * Create initial citation from empty citationObj
  * @param  {Object}  citationObj CitoidRequest object
 * @param  {Object}  cr           CitoidRequest object
 * @return {Object}         Pointer to citation in cr
 */
var citationFromCR = BBPromise.method(function(citationObj, cr){
    var content = citationObj.content; // Wipe any previous citation in case a partial citation elsewhere has been created

    content.url = citationObj.url; // This field is universally present in all Zotero types

    // This itemType will be overwritten if a crossRef request is successful later on
    if (cr.doi || cr.idType === 'pmid'  || cr.idType === 'pmcid' || content.doi || content.idType === 'pmid'  || content.idType === 'pmcid' ){ //todo:remove cr.
        content.itemType = 'journalArticle';
    }

    return content;

});

// Highwire and bepress metadata itemType determination-
// Partially copied from Zotero translators http://github.com/zotero/translators
function itemTypeFromPress(metadataBlock){
    var i;
    var itemType = 'journalArticle';
    var keys = Object.keys(metadataBlock);
    for (i = 0; i < keys.length; i++) {
        switch(keys[i]) {
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
            case "title":       //fall back to journalArticle, since this is quite common
            case "series_title":    //possibly journal article, though it could be book
                itemType = "journalArticle";
                return itemType;
            case 'citation_isbn':
                itemType = "book"; // Unlikely, but other item types may have ISBNs as well (e.g. Reports?)
                return itemType;
        }
    }
    return itemType;
}

module.exports.itemTypeFromPress = itemTypeFromPress;
module.exports.addItemType = addItemType;
