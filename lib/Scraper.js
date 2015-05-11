'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 */

/*
  Module dependencies
*/

var request = require('request');
var urlParse = require('url');
var cheerio = require('cheerio');
var parseMetaData = require('html-metadata').parseAll;
var og = require('./translators/openGraph.js');
var gen = require('./translators/general.js');
var iconv = require('iconv-lite');
var contentType = require('content-type');

var Scraper = function(citoidConfig, logger){
	this.logger = logger;
	this.userAgent = citoidConfig.userAgent || 'Citoid/0.0.0';
};

exports = module.exports = Scraper;

/**
 * Scrapes, parses, and translates webpages to obtain Zotero format metadata
 * callback runs on list of json objs (var body)
 * @param  {String}   url      url to scrape
 * @param  {Function} callback callback(error, statusCode, body)
 */

Scraper.prototype.scrape = function(opts, callback){

	var chtml;
	var logger = this.logger;
	var scraper = this;
	var acceptLanguage = opts.acceptLanguage;
	var url = opts.search;
	var userAgent = this.userAgent;
	var citation = {url: url, title: url};

	var j = request.jar(); // One time use cookie jar

	logger.log('debug/scraper', "Using native scraper on " + url);
	request(
		{
			url: url,
			followAllRedirects: true,
			jar: j, // Set cookie jar for request
			encoding: null, // returns page in Buffer object
			headers: {
				'Accept-Language': acceptLanguage,
				'User-Agent': userAgent
			}
		}, function(error, response, html){
			if (error || !response || response.statusCode !== 200) {
				if (error) {
					logger.log('warn/scraper', error);
				} else if (!response){
					logger.log('warn/scraper', "No response from resource server at " + url);
				} else {
					logger.log('warn/scraper', "Status from resource server at " + url +
						": " + response.statusCode);
				}
				citation.itemType = 'webpage';
				callback(error, 520, [citation]);
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
						str = iconv.decode(html, contentType);
						chtml = cheerio.load(str);
					} catch (e){
						logger.log('warn/scraper', e);
					}
				} else {
					str = iconv.decode(html, defaultCT);
					try {
						chtml = cheerio.load(str);
						contentType = exports.contentTypeFromBody(chtml);
						// If contentType is scraped from body and is NOT the default
						// CT already loaded, re-decode and reload into cheerio.
						if (contentType && contentType!== defaultCT){
							try {
								str = iconv.decode(html, contentType);
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
					citation.title = null;
					scraper.parseHTML(url, chtml, citation, function(citation){
						logger.log('debug/scraper', "Sucessfully scraped resource at " + url);
						callback(null, 200, [citation]);
					});
				} else {
					callback(error, 520, [citation]);
				}
			}
	});
};

/**
 * Adds metadata to citation object given a metadata of a
 * specific type, and a translator specific to that metadata type
 * @param  {Object} metaData   [description]
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
 * Adds html metadata to a given citation object given
 * the html loaded into cheerio
 * @param  {String}   url      url being scraped
 * @param  {Objct}   chtml     Cheerio object with html loaded
 * @param  {Object}   citation a citation object contain default parameters
 * @param  {Function} callback callback(citation)
 */
Scraper.prototype.parseHTML = function(url, chtml, citation, callback){
	var metaData, typeTranslator, parsedUrl;

	parseMetaData(chtml, function(err, results){
		metaData = results; //only use open graph here
	});

	// translator/openGraph.js properties

	// Set zotero type from OpenGraph type
	if (metaData.openGraph['type'] && og.types[metaData.openGraph['type']]){ // if there is a type in the results and that type is defined in openGraph.js
		citation.itemType = og.types[metaData.openGraph['type']];
	}
	else {
		citation.itemType = 'webpage'; //default itemType
	}

	// Add universal (non type specific) OpenGraph properties
	citation = translate(citation, metaData.openGraph, og.general);

	// Add type specific Open Graph properties
	typeTranslator = og[citation.itemType];
	if (typeTranslator){
		citation = translate(citation, metaData.openGraph, typeTranslator);
	}

	// Fall back on general metadata
	citation  = translate(citation, metaData.general, gen.general);

	// Fall back methods

	// Title
	if (!citation.title){
		citation.title = getTitle(url, chtml);
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

	callback(citation);
};

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

/**Exports*/
module.exports = Scraper;
