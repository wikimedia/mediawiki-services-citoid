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
var request = require('request');
var urlParse = require('url');
var preq = require('preq');

/*
 * Local dependencies
 */
var og = require('./translators/openGraph.js');
var gen = require('./translators/general.js');
var addIDS = require('./Exporter.js').addIDSToCitation;

var Scraper = function(app){

	this.logger = app.logger;

	this.exporter = null;

	this.userAgent = app.conf.userAgent || 'Citoid/' + app.info.version;
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
	var url = cr.url || cr.idValue;
	var userAgent = this.userAgent;
	var citationPromise = citationFromCR(cr); // Promise for citation

	var j = request.jar(); // One time use cookie jar

	logger.log('debug/scraper', "Using native scraper on " + url);
	return preq(
		{
			url: url,
			followAllRedirects: true,
			jar: j, // Set cookie jar for request
			encoding: null, // returns page in Buffer object
			headers: {
				'Accept-Language': acceptLanguage,
				'User-Agent': userAgent
			}
		}
	)
	.then(function(response){
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
					return scraper.parseHTML(url, chtml, citation).then(
						// Success handler for parseHTML
						function(citation){
							logger.log('debug/scraper', "Sucessfully scraped resource at " + url);
							cr.response.responseCode = 200;
							return cr;
						},
						// Rejection handler for parseHTML
						function(){
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
 * @param  {Object} metaData   flat metaData object (i.e. metaData.openGraph)
 * @param  {Object} translator
 */
function translate(citation, metaData, translator){
	var translatedProperty, value;
	for (var key in metaData){ // Loop through results
		translatedProperty = translator[key]; // Look up property in translator
		if (translatedProperty && !citation[translatedProperty]){ // If it has a corresponding translation and won't overwrite properties already set
			//either set value to property or modify with function
			if (typeof translatedProperty === 'string'){
				value = metaData[key];
			} else if (typeof translatedProperty === 'function'){
				citation = translatedProperty(metaData[key], citation);
			} else {return citation;}

			if (typeof value === 'string'){
				citation[translatedProperty] = metaData[key]; // Add value of property to citation object
			} else if (Array.isArray(value)) {
				citation[translatedProperty] = metaData[key][0]; // Choose first value if array
			}
		}
	}
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
 * @param  {String} url             url being scraped
 * @param  {Object} chtml           Cheerio object with html loaded
 * @param  {Object} citation        a citation object contain default parameters
 * @return {Object}                 Bluebird promise for citation object
 */
Scraper.prototype.parseHTML = function(url, chtml, citation){

	return parseAll(chtml)
	.catch(function(e){
		// If promise fails, use fall back methods
		return fallback(citation);
	})
	.then(function(metaData){
		// translator/openGraph.js properties
		if (metaData.openGraph){
			citation = openGraph(metaData.openGraph, citation);
		}

		// translator/general.js properties
		if (metaData.general){
			citation  = translate(citation, metaData.general, gen.general);
		}

		// Fall back on direct scraping methods
		citation = fallback(citation, url, chtml);

		return citation;
	});

};


/**
 * Adds open graph properties to citation
 * @param  {Object} metaData objectGraph metaData obtained from html-metadata
 * @param  {Object} citation citation object
 * @return {Object}          citation object
 */
function openGraph(metaData, citation){
	var typeTranslator;

	// Set citation type from OpenGraph type
	if (metaData['type'] && og.types[metaData['type']]){ // if there is a type in the results and that type is defined in openGraph.js
		citation.itemType = og.types[metaData['type']];
	}
	else {
		citation.itemType = 'webpage'; //default itemType
	}

	// Add universal (non type specific) OpenGraph properties
	citation = translate(citation, metaData, og.general);

	// Add type specific Open Graph properties
	typeTranslator = og[citation.itemType];
	if (typeTranslator){
		citation = translate(citation, metaData, typeTranslator);
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
	citation.accessDate = (new Date()).toISOString().substring(0, 10);

	// Fall back websiteTitle - webpage only
	if (citation.itemType === 'webpage' && !citation.websiteTitle){
		parsedUrl = urlParse.parse(url);
		if (citation.title && parsedUrl && parsedUrl.hostname) {
			citation.websiteTitle = parsedUrl.hostname;
		}
	}

	// Fall back publicationTitle - webpage only
	// TODO: REMOVE BLOCK - temporarily kept in for backwards compatibility
	if (citation.itemType === 'webpage' && citation.websiteTitle){
		citation.publicationTitle = citation.websiteTitle;
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
 * Create 520 citation
 * @param  {Object} citation empty object
 * @param  {String} url      requested url
 * @return {Object}          filled in citation object
 */
function build520(cr){
	var citation = cr.response.citation[0];

	if (!citation.itemType){citation.itemType = 'webpage';}
	citation.title = citation.url;

	cr.response.responseCode = 520;
	return cr;

}

/**
 * Create initial citation from empty cr.response
 * @param  {Object} cr){	var citation      [description]
 * @return {[type]}           [description]
 */
var citationFromCR = BBPromise.method(function(cr){
	var citation = cr.response.citation[0] = {}; // Wipe any previous citation in case a partial citation elsewhere has been created

	citation.url = cr.url;

	// TODO: Allow this to be done later, after metadata scraping.
	return addIDS(cr).then(function(cr){
		// if the citation has a doi, pmid, or pmcid, assume it's a journalArticle
		if (citation.DOI || citation.PMID || citation.PMCID){
			citation.itemType = 'journalArticle';
		}
		return cr.response.citation[0];
	});
});