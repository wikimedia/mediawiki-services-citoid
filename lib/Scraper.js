'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 */

/*
 * Module dependencies
*/
var BBPromise = require('bluebird');
var cheerio = require('cheerio');
var contentType = require('content-type');
var iconv = require('iconv-lite');
var parseAll = require('html-metadata').parseAll;
var urlParse = require('url');
var preq = require('preq');

/*
 * Local dependencies
 */
var coins = require('./translators/coins.js');
var dc = require('./translators/dublinCore.js');
var gen = require('./translators/general.js');
var og = require('./translators/openGraph.js');

var crossRefRequest = require('./crossRefRequest.js');

//TODO: Remove
var defaultLogger;
var userAgent;

var Scraper = function(app){

	this.logger = app.logger;

	this.exporter = null;

	this.userAgent = app.conf.userAgent;

	userAgent = app.conf.userAgent;
	defaultLogger = this.logger;
};

exports = module.exports = Scraper;

/**
 * Promise that always returns a citoidRequest object,
 * with a citation and a response code added to the cr.response
 * citoidResponse object
 * @param  {Object}          CitoidRequest object
 * @return {Object}          CitoidRequest object
 */
Scraper.prototype.scrape = function(cr){
	var chtml;
	var logger = this.logger;
	var scraper = this;
	var acceptLanguage = cr.acceptLanguage;
	var url = cr.url;
	var userAgent = this.userAgent;
	var citationPromise = citationFromCR(cr); // Promise for citation

	logger.log('debug/scraper', "Using native scraper on " + url);
	return preq({
		url: url,
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
				return build520(cr);
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
					return scraper.parseHTML(cr, chtml).then(
						// Success handler for parseHTML
						function(citation){
							logger.log('debug/scraper', "Sucessfully scraped resource at " + url);
							cr.response.responseCode = 200;
							return cr;
						},
						// Rejection handler for parseHTML
						function(){
							logger.log('debug/scraper', "Failed to parse HTML of resource at " + url);
							return build520(cr);
						}
					);
				});
			} else {
				logger.log('debug/scraper', "Failed to scrape resource at " + url);
				return citationPromise.then(function(citation){
					return build520(cr);
				});
			}
		}
	},
	// Rejection handler for preq
	function(response){
		logger.log('debug/scraper', "Failed to scrape resource at " + url);
		return citationPromise.then(function(citation){
			return build520(cr);
		});
	})
	.catch(function(error){
		logger.log('warn/scraper', error);
	});
};

/**
 * Adds metadata to citation object given a metadata of a
 * specific type, and a translator specific to that metadata type
 * @param  {Object} metadata   flat metadata object (i.e. metadata.openGraph)
 * @param  {Object} translator
 */
function translate(citation, metadata, translator){
	if (!translator){return citation;}
	var property;
	Object.keys(metadata).forEach(function(key){ // Loop through results
		property = translator[key]; // Look up property in translator
		if (property && !citation[property.name]){ // If it has a corresponding translation and won't overwrite properties already set
			try {
				citation = property.translate(citation, metadata[key]);
			} catch (e){
				defaultLogger.log('debug/scraper', "Failed to translate property " + property.name);
			}
		}
	});
	return citation;
}

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
exports.contentTypeFromBody= function(chtml){
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
Scraper.prototype.parseHTML = function(cr, chtml){
	var citation = cr.response.citation[0];

	function doSyncMethods(metadata, cit){

		cit = addItemType(metadata, cit);

		// translator/openGraph.js properties
		if (metadata.openGraph){
			cit = translate(cit, metadata.openGraph, og[cit.itemType]);
		}

		// translator/dublinCore.js properties
		if (metadata.dublinCore){
			cit = translate(cit, metadata.dublinCore, dc[cit.itemType]);
		}

		// translator/general.js properties
		if (metadata.general){
			cit = translate(cit, metadata.general, gen[cit.itemType]);
		}

		// Fall back on direct scraping methods
		cit = fallback(cit, cr.url, chtml);

		// DOI is only a valid field in Zotero for journalArticle and conferencePaper types
		if (cr.doi && (citation.itemType === 'journalArticle' || citation.itemType === 'conferencePaper')){
			citation.DOI = cr.doi;
		}

		return cit;
	}

	return parseAll(chtml)
	.then(function(metadata){
		// Try to get DOI from dublinCore metadata before doing crossRef request
		if (!cr.doi){
			var reDOI = new RegExp('\\b10\\.[0-9]{3,5}(?:[.][0-9]+)*/.*');
			// TODO: make work with Array
			if (metadata.dublinCore && metadata.dublinCore.identifier && metadata.dublinCore.identifier.match(reDOI)){
				cr.doi = metadata.dublinCore.identifier.match(reDOI)[0];
			}
		}
		return crossRef(cr, metadata).then(function(cit){
			return doSyncMethods(metadata, cit);
		},
		// Rejection handler for crossRef
		function(){
			return doSyncMethods(metadata, citation);
		});
	},
	// Rejection handler for parseAll
	function(){
		return fallback(citation);
	});

};

/**
 * Adds crossref rft properties to citation
 * @param  {Object} cr     CitoidRequest instance
 * @return {Object}        BBPromise for citation object
 */
var crossRef = BBPromise.method(function(cr, metadata){
	var citation = cr.response.citation[0] = cr.response.citation[0] || {};
	var doi = cr.doi;
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


		return citation;
	// Rejection handler
	}, function(){
		defaultLogger.log('debug/scraper', "Failed to get crossRef data");
		return citation;
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

	// Set citation type from OpenGraph type
	if (!citation.itemType){ // Don't overwrite itemtype
		if (metadata['type'] && og.types[metadata['type']]){ // if there is a type in the results and that type is defined in openGraph.js
			citation.itemType = og.types[metadata['type']];
		}
		else {
			citation.itemType = 'webpage'; //default itemType
		}
	}

	return citation;
}

/**
 * Fallback methods for if metadata from html-metadata library can't be obtained
 * @param  {Object} citation citation object
 * @param  {String} url      user requested url
 * @param  {Object} chtml    cheerio html object
 * @return {Object}          citaiton object
 */
function fallback(citation, url, chtml){
	var parsedUrl;

	// Required fields: title, itemType

	// itemType
	if (!citation.itemType){
		citation.itemType = 'webpage';
	}

	// Title
	if (!citation.title){
		citation.title = getTitle(url, chtml);
	}

	// URL
	if (!citation.url){
		citation.url = url;
	}

	// Access date - universal - format YYYY-MM-DD
	citation.accessDate = (new Date()).toISOString().split('T').shift();

	// Fall back websiteTitle - webpage only
	if (citation.itemType === 'webpage' && !citation.websiteTitle){
		parsedUrl = urlParse.parse(url);
		if (citation.title && parsedUrl && parsedUrl.hostname) {
			citation.websiteTitle = parsedUrl.hostname;
		}
	}

	return citation;
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
 * Create 520 citation- creates 200 if crossRef succeeds
 * @param  {Object} cr       CitoidRequest object
 * @return {Object}          BBPromise for CitoidRequest object
 */
var build520 = BBPromise.method(function(cr){
	var citation = cr.response.citation[0];

	function fallback520(cit, respCode) {
		if (!cit.itemType) {cit.itemType = 'webpage';}
		if (!cit.title) {cit.title = cit.url;}
		cr.response.responseCode = respCode;
		return citation;
	}

	return crossRef(cr, citation).then(function(cit){
		citation = fallback520(cit, 200);
		defaultLogger.log('debug/scraper', "Sucessfully got metadata from doi " + cr.doi);
		return cr;
	// Rejection
	}, function(){
		citation = fallback520(citation, 520);
		return cr;
	});
});

/**
 * Create initial citation from empty cr.response
 * @param  {Object}         CitoidRequest object
 * @return {Object}         Pointer to citation in cr
 */
var citationFromCR = BBPromise.method(function(cr){
	var citation = cr.response.citation[0] = {}; // Wipe any previous citation in case a partial citation elsewhere has been created

	citation.url = cr.url; // This field is universally present in all Zotero types

	// This itemType will be overwritten if a crossRef request is successful later on
	if (cr.doi || cr.idType === 'pmid'  || cr.idType === 'pmcid'){
		citation.itemType = 'journalArticle';
	}

	return cr.response.citation[0];

});

module.exports.translate = translate;