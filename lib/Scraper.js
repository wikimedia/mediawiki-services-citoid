#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 */

/*
  Module dependencies
*/

var request = require('request'),
	urlParse = require('url'),
	cheerio = require('cheerio'),
	parseMetaData = require('html-metadata').parseAll,
	og = require('./translators/openGraph.js'),
	gen = require('./translators/general.js');

function Scraper(citoidConfig, logger){
	this.log = logger;
	this.userAgent = citoidConfig.userAgent || 'Citoid/0.0.0';
}

/**
 * Scrapes, parses, and translates webpages to obtain Zotero format metadata
 * callback runs on list of json objs (var body)
 * @param  {String}   url      url to scrape
 * @param  {Function} callback callback(error, statusCode, body)
 */

Scraper.prototype.scrape = function(url, callback){

	var chtml,
		log = this.log,
		scraper = this,
		userAgent = this.userAgent,
		citation = {url: url, title: url};

	log.info("Using native scraper on " + url);

	request(
		{
			url: url,
			followAllRedirects: true,
			headers: {
				'User-Agent': userAgent
			}
		}, function(error, response, html){

			if (error || !response || response.statusCode !== 200) {
				if (error) {
					log.error(error);
				} else if (!response){
					log.error("No response from resource server at " + url);
				} else {
					log.error("Status from resource server at " + url +
						": " + response.statusCode);
				}
				log.info("Unable to scrape resource at " + url);
				callback(error, 520, [citation]);
			} else {
				try {
					chtml = cheerio.load(html);
					citation.title = null;
					scraper.parseHTML(url, chtml, citation, function(citation){
						citation = citation;
						log.info("Sucessfully scraped resource at " + url);
						callback(null, 200, [citation]);
					});
				} catch (e){
					log.error(e);
					log.info("Unable to scrape resource at " + url);
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
 * Adds html metadata to a given citation object given
 * the html loaded into cheerio
 * @param  {String}   url      url being scraped
 * @param  {Objct}   chtml     Cheerio object with html loaded
 * @param  {Object}   citation a citation object contain default parameters
 * @param  {Function} callback callback(citation)
 */
Scraper.prototype.parseHTML = function(url, chtml, citation, callback){
	var metaData, typeTranslator;

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

	// Fall back publication title - webpage only
	if (!citation.publicationTitle && citation.itemType === 'webpage'){
		var parsedUrl = urlParse.parse(url);
		if (citation.title && parsedUrl && parsedUrl.hostname) {
			citation.publicationTitle = parsedUrl.hostname;
		}
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
