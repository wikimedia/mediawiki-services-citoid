/**
 * Handles requests to the citoid service
 */

/* Import Modules */
var crypto = require('crypto'),
	urlParse = require('url'),
	util = require('util');

/* Import Local Modules */
var unshorten = require('./unshorten.js'),
	scrape = require('./scrape.js'),
	zoteroWebRequest = require('./zotero.js').zoteroWebRequest,
	zoteroExportRequest = require('./zotero.js').zoteroExportRequest,
	pubMedRequest = require('./pubMedRequest.js');

/**
 * Constructor for CitoidService object
 * @param {Object} CitoidConfig configuration object
 * @param {Object} logger       bunyan logger object
 */
function CitoidService(CitoidConfig, logger){
	this.CitoidConfig = CitoidConfig;
	this.log = logger;
	this.zoteroURL = util.format('http://%s:%s/%s',
		CitoidConfig.zoteroInterface, CitoidConfig.zoteroPort.toString());
}

/**
 * Requests to the citoid service
 * @param  {String}   searchTerm   searchTerm metadata is being requested about
 * @param  {Object}   opts         zoteroWebRequest options object
 * @param  {Function} callback     callback (error, statusCode, body)
 */
CitoidService.prototype.request = function(searchTerm, format, callback){

	var citoidService = this,
		sessionID = crypto.randomBytes(20).toString('hex'), //required zotero- not terribly important for this to be secure
		opts = {
			zoteroURL:citoidService.zoteroURL,
			sessionID:sessionID,
			format:format
		};

	citoidService.distinguish(searchTerm, function(extractedID, runnerFunction){
		runnerFunction(extractedID, opts, function(error, responseCode, body){
			callback(error, responseCode, body);
		});
	});
};

/**
 * Request citation metadata from a URL
 * @param  {String}   requestedURL URL metadata is being requested about
 * @param  {Object}   opts         zoteroWebRequest options object
 * @param  {Function} callback     callback (error, statusCode, body)
 */
CitoidService.prototype.requestFromURL = function (requestedURL, opts, callback){
	var log = this.log;
	zoteroWebRequest(requestedURL, opts, function(error, response, body){
		log.info("Zotero request made for: " + requestedURL);
		if (error) {
			log.error(error);
			log.info("Falling back on native scraper.");
			scrapeHelper(requestedURL, opts, callback);
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
							if (response && !error && response.statusCode === 200){
								log.info("Successfully retrieved and translated body from Zotero");
								callback(null, 200, body);
							} else {
								log.info("No Zotero response available; falling back on native scraper.");
								scrapeHelper(requestedURL, opts, callback);
							}
						});
					} else {
						log.info("No redirect detected; falling back on native scraper.");
						scrapeHelper(requestedURL, opts, callback);
					}
				});
			} else if (response.statusCode === 200){
				log.info("Successfully retrieved and translated body from Zotero");
				callback (null, 200, body);
			} else {
				//other response codes such as 500, 300
				log.info("Falling back on native scraper.");
				scrapeHelper(requestedURL, opts, callback);
			}
		} else {
			log.info("Falling back on native scraper.");
			scrapeHelper(requestedURL, opts, callback);
		}
	});
};

/**
 * Request citation metadata from a DOI
 * @param  {String}   requestedDOI DOI pointing to URL metadata is being requested about
 * @param  {Object}   opts         zoteroWebRequest options object
 * @param  {Function} callback     callback (error, statusCode, body)
 */
CitoidService.prototype.requestFromDOI = function (requestedDOI, opts, callback){
	var doiLink = 'http://dx.doi.org/'+ requestedDOI;
	//TODO: optimise this (can skip some steps in requestFromURL)
	this.requestFromURL(doiLink, opts, callback);
};

/**
 * Request citation metadata from a PubMed identifier. Supports PMID, PMCID, Manuscript ID and versioned identifiers
 * @param  {String}   requestedPubMedID  PubMed identifier for which metadata is being requested. PMCID identifiers must begin with 'PMC'
 * @param  {Object}   opts               zoteroWebRequest options object
 * @param  {Function} callback           callback (error, statusCode, body)
 */
CitoidService.prototype.requestFromPubMedID = function(requestedPubMedID, opts, callback){
    pubMedRequest(requestedPubMedID, function(error, obj){
		if(error){
			callback(error, null, null);
		} else {
			var doi = obj.records[0].doi;
			this.log.info("Got DOI " + doi);
			this.requestFromDOI(doi, opts, callback);
		}
	});
};

/**
 * Determine type of string (doi, url) and callback on correct handler
 * @param  {String}   searchString what the end user searched for
 * @param  {Function} callback     callback(extractedValue, correctFunction)
 */
CitoidService.prototype.distinguish = function(rawSearchInput, callback){
	var reDOI, rePMID, rePMCID, rePMCID2, parsedURL,
		matchDOI, matchPMID, matchPMCID,
		search = rawSearchInput.trim();

	reDOI = new RegExp('\\b10\\.?[0-9]{3,4}(?:[.][0-9]+)*/.*');
	rePMID = new RegExp('^\\d{8}\\b');
	rePMCID = new RegExp('\\bPMC\\d{7}\\b');
	rePMCID2 = new RegExp('^\\d{7}\\b');

	matchDOI = search.match(reDOI);
	matchPMID = search.match(rePMID);
	matchPMCID = search.match(rePMCID);

	if (matchDOI) {
		callback(matchDOI[0], this.requestFromDOI.bind(this));
	} else if (matchPMID) {
		callback(matchPMID[0], this.requestFromPubMedID.bind(this));
	} else if (matchPMCID) {
		callback(matchPMCID[0], this.requestFromPubMedID.bind(this));
	} else {
		matchPMCID = search.match(rePMCID2);
		if (matchPMCID) {
			callback('PMC' + matchPMCID[0], this.requestFromPubMedID.bind(this));
		} else {
			parsedURL = urlParse.parse(search);
			if (!parsedURL.protocol){
				search = 'http://'+ search;
			}
			callback(search, this.requestFromURL.bind(this)); //assume url if not doi
		}
	}
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
function scrapeHelper(url, opts, callback) {
	if (opts.format === 'bibtex') {
		scrape(url, function(error, responseCode, citation) {
			zoteroExportRequest(citation[0], opts, function(err, resCode, body) {
				if (resCode !== 200){
					body = "Unable to serve this format at this time";
					resCode = 404; // 404 error if cannot translate into alternate format
				} else if (responseCode !== 200){
					resCode = 520; // 520 error if the scraper couldn't scrape from url
				}
				callback(err, resCode, body);
			});
		});
	} else {
		scrape(url, callback);
	}
}

module.exports = {
	CitoidService: CitoidService,
};