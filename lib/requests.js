#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Request functions for difference search types,
 * such as URL or DOI
 */

var bunyan = require('bunyan');
var log = bunyan.createLogger({name: "citoid"});
var unshorten = require('./unshorten.js');
var scrape = require('./scrape.js').scrape;
var zoteroRequest = require('./zotero.js').zoteroRequest;
var util = require('util');

/**
 * runner function to use for a url
 * @param  {[type]}   requestedURL want metadata from this url
 * @param  {[type]}   opts         zoteroRequest options object
 * @param  {Function} callback     callback (error, statusCode, body)
 */

var requestFromURL = function (requestedURL, opts, callback){
	opts.zoteroURL = util.format(opts.zoteroURL, 'web'); //use web endpoint
	zoteroRequest(requestedURL, opts, function(error, response, body){
		log.info("Zotero request made for: " + requestedURL);
		if (error) {
			log.error(error);
			log.info("Falling back on native scraper.");
			scrape(requestedURL, function(error, body){
				callback (error, 200, body);
			});
		} else if ( response ) {
			//501 indicates no translator available
			//this is common- can indicate shortened url
			//or a website not specified in the translators
			if (response.statusCode == 501){
				log.info("Status Code from Zotero: " + response.statusCode);
				log.info("Looking for redirects...");
				//try again following all redirects
				//we don't do this initially because many sites
				//will redirect this fcn to a log-in screen
				unshorten(requestedURL, function(detected, expandedURL) {
					if (detected) {
						log.info("Redirect detected to "+ expandedURL);
						zoteroRequest(expandedURL, opts, function(error, response, body){
							if (response && !error && response.statusCode == 200){
								log.info("Successfully retrieved and translated body from Zotero");
								callback(null, 200, body);
							}
							else {
								log.info("No Zotero response available; falling back on native scraper.");
								scrape(requestedURL, function(error, body){
									callback(error, 200, body);
								});
							}
						});
					}
					else {
						log.info("No redirect detected; falling back on native scraper.");
						scrape(requestedURL, function(error, body){
							callback(error, 200, body);
						});
					}
				});
			}

			else if (response.statusCode == 200){
				log.info("Successfully retrieved and translated body from Zotero");
				callback (null, 200, body);
			}
			else { //other response codes such as 500, 300
				log.info("Falling back on native scraper.");
				scrape(requestedURL, function(error, body){
					callback (error, 200, body);
				});
			}
		} else {
			log.info("Falling back on native scraper.");
			scrape(requestedURL, function(error, body){
				callback (error, 200, body);
			});
		}
	});
};

/**
 * runner function to use for a DOI
 * @param  {[type]}   requestedDOI want metadata from this DOI
 * @param  {[type]}   opts         zoteroRequest options object
 * @param  {Function} callback     callback (error, statusCode, body)
 */

var requestFromDOI = function (requestedDOI, opts, callback){
	var doiLink = 'http://dx.doi.org/'+requestedDOI;
	//TODO: optimise this (can skip some steps in requestFromURL)
	requestFromURL(doiLink, opts, function(error, responseCode, body){
		callback(error, responseCode, body);
	});
};

/*Test methods in main */
if (require.main === module) {
	var opts = {
		zoteroURL:"http://localhost:1969/%s",
		sessionID: "123abc",
		format: "zotero"
	};

	requestFromURL("http://example.com", opts, function (error, statusCode, body){
		console.log(body);
	});
}

module.exports = {
	requestFromURL: requestFromURL,
	requestFromDOI: requestFromDOI
};