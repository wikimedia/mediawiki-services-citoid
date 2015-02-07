#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Request functions for difference search types,
 * such as URL or DOI
 */

/* Import External Modules */
var util = require('util'),
	bunyan = require('bunyan');

/* Import Local Modules */
var unshorten = require('./unshorten.js'),
	scrape = require('./scrape.js').scrape,
	zoteroWebRequest = require('./zotero.js').zoteroWebRequest,
	zoteroExportRequest = require('./zotero.js').zoteroExportRequest,
	pubMedRequest = require('./pubMedRequest.js');

var log = bunyan.createLogger({name: "citoid"});

/**
 * Request citation metadata from a URL
 * @param  {String}   requestedURL URL metadata is being requested about
 * @param  {Object}   opts         zoteroWebRequest options object
 * @param  {Function} callback     callback (error, statusCode, body)
 */
var requestFromURL = function (requestedURL, opts, callback){
	zoteroWebRequest(requestedURL, opts, function(error, response, body){
		log.info("Zotero request made for: " + requestedURL);
		if (error) {
			log.error(error);
			scrapeHelper(requestedURL, opts, function(error, responseCode, body){
				log.info("Falling back on native scraper.");
				if (error) {log.error(error)};
				callback(error, responseCode, body);
			});
		} else if (response) {
			//501 indicates no translator available
			//this is common- can indicate shortened url
			//or a website not specified in the translators
			if (response.statusCode === 501){
				log.info("Status Code from Zotero: " + response.statusCode);
				log.info("Looking for redirects...");
				//try again following all redirects
				//we don't do this initially because many sites
				//will redirect this fcn to a log-in screen
				unshorten(requestedURL, function(detected, expandedURL) {
					if (detected) {
						log.info("Redirect detected to "+ expandedURL);
						zoteroWebRequest(expandedURL, opts, function(error, response, body){
							if (response && !error && response.statusCode == 200){
								log.info("Successfully retrieved and translated body from Zotero");
								callback(null, 200, body);
							} else {
								log.info("No Zotero response available; falling back on native scraper.");
								scrapeHelper(requestedURL, opts, function(error, responseCode, body){
									callback (error, responseCode, body);
								});
							}
						});
					} else {
						log.info("No redirect detected; falling back on native scraper.");
						scrapeHelper(requestedURL, opts, function(error, responseCode, body){
							callback (error, responseCode, body);
						});
					}
				});
			} else if (response.statusCode === 200){
				log.info("Successfully retrieved and translated body from Zotero");
				callback (null, 200, body);
			} else {
				//other response codes such as 500, 300
				log.info("Falling back on native scraper.");
				scrapeHelper(requestedURL, opts, function(error, responseCode, body){
					callback (error, responseCode, body);
				});
			}
		} else {
			log.info("Falling back on native scraper.");
			scrapeHelper(requestedURL, opts, function(error, responseCode, body){
				callback (error, responseCode, body);
			});
		}
	});
};

/**
 * Export scrape response to Zotero translator if nessecary
 * Default format of scrape response is 'mediawiki', so only
 * sends response to Zotero if it's a format Zotero can convert to.
 * Currently only exports bibtex.
 * @param  {String}   url      requested URL
 * @param  {Object}   opts     request options object
 * @param  {Function} callback callback(error, responseCode, citation)
 */
var scrapeHelper = function(url, opts, callback) {
	if (opts.format === 'bibtex') {
		scrape(url, function(error, responseCode, citation) {
			zoteroExportRequest(citation[0], opts, function(err, resCode, body) {
				if (resCode !== 200){
					body = "Unable to serve this format at this time";
					resCode = 404; // 404 error if cannot translate into alternate format
				} else if (responseCode !== 200){
					resCode = 520; // 520 error if the scraper couldn't scrape from url
				}
				console.log(resCode);
				callback(err, resCode, body);
			});
		});
	} else {
		scrape(url, function(error, responseCode, citation) {
			callback(error, responseCode, citation);
		});
	}
};

/**
 * Request citation metadata from a DOI
 * @param  {String}   requestedDOI DOI pointing to URL metadata is being requested about
 * @param  {Object}   opts         zoteroWebRequest options object
 * @param  {Function} callback     callback (error, statusCode, body)
 */
var requestFromDOI = function (requestedDOI, opts, callback){
	var doiLink = 'http://dx.doi.org/'+requestedDOI;
	//TODO: optimise this (can skip some steps in requestFromURL)
	requestFromURL(doiLink, opts, function(error, responseCode, body){
		callback(error, responseCode, body);
	});
};

/**
 * Request citation metadata from a PubMed identifier. Supports PMID, PMCID, Manuscript ID and versioned identifiers
 * @param  {String}   requestedPubMedID  PubMed identifier for which metadata is being requested. PMCID identifiers must begin with 'PMC'
 * @param  {Object}   opts               zoteroWebRequest options object
 * @param  {Function} callback           callback (error, statusCode, body)
 */
var requestFromPubMedID = function (requestedPubMedID, opts, callback){
    pubMedRequest(requestedPubMedID, function(error, obj){
		if(error){
			callback(error, null, null);
		} else {
			var doi = obj.records[0].doi;
			log.info("Got DOI " + doi);
			requestFromDOI(doi, opts, callback);
		}
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

	requestFromPubMedID("23193287", opts, function(error, statusCode, body){
		console.log(body);
	});
}

/* Exports */
module.exports = {
	requestFromURL: requestFromURL,
	requestFromDOI: requestFromDOI,
	requestFromPubMedID: requestFromPubMedID
};
