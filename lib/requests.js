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
var request = require('request');

/**
 * Request citation metadata from a URL
 * @param  {String}   requestedURL URL metadata is being requested about
 * @param  {Object}   opts         zoteroRequest options object
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
		} else if (response) {
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
							} else {
								log.info("No Zotero response available; falling back on native scraper.");
								scrape(requestedURL, function(error, body){
									callback(error, 200, body);
								});
							}
						});
					} else {
						log.info("No redirect detected; falling back on native scraper.");
						scrape(requestedURL, function(error, body){
							callback(error, 200, body);
						});
					}
				});
			} else if (response.statusCode == 200){
				log.info("Successfully retrieved and translated body from Zotero");
				callback (null, 200, body);
			} else {
				//other response codes such as 500, 300
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
 * Request citation metadata from a DOI
 * @param  {String}   requestedDOI DOI pointing to URL metadata is being requested about
 * @param  {Object}   opts         zoteroRequest options object
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
 * @param  {Object}   opts               zoteroRequest options object
 * @param  {Function} callback           callback (error, statusCode, body)
 */

var requestFromPubMedID = function (requestedPubMedID, opts, callback){
    var pubMedLink = 'http://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?tool=citoid&email=citoid@mediawiki&format=json&ids='+requestedPubMedID;
    requestJSON(pubMedLink, function(error, obj){
		if(error){
			callback(error, null, null);
		}
		else if(obj.status !== 'ok'){
			log.error("PubMed returned unrecognized status code: " + obj.status);
			callback("PubMed returned unrecognized status", 200, null);
		} else {
			if(obj.records.length > 0){
				var doi = obj.records[0].doi;
				log.info("Got DOI " + doi);
				requestFromDOI(doi, opts, callback);
			} else {
				log.error("No records retrieved from PubMed for " + requestedPMID);
				callback("No records rerieved from PubMed", 200, null);
			}
		}
	});
};

/**
 * Fetch and parse a JSON object from URL
 * @param  {String}   url      JSON endpoint to fetch and parse
 * @param  {Function} callback callback (error, object)
 */

var requestJSON = function (url, callback){
	request(url, function(error, response, body){
		log.info("JSON query made for: " + url);
		if (error) {
			log.error(error);
			callback(error, null);
		} else if (response.statusCode !== 200) {
			log.error("Unexpected HTTP status code: " + response.statusCode);
			callback("Unexpected HTTP status code: " + response.statusCode, null);
		} else {
			try {
				var jsonObj = JSON.parse(body);
				callback(null, jsonObj);
			} catch (error) {
				log.info("Original response: " + body);
				log.error("JSON parse error: " + error);
				callback("JSON parse error: " + error, null);
			}
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

module.exports = {
	requestFromURL: requestFromURL,
	requestFromDOI: requestFromDOI,
	requestFromPubMedID: requestFromPubMedID
};
