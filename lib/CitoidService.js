'use strict';

/**
 * Handles requests to the citoid service
 */

/* Import Modules */
var http = require('http');
var urlParse = require('url');

/* Import Local Modules */
var unshorten = require('./unshorten.js');
var Scraper = require('./Scraper.js');
var ZoteroService = require('./ZoteroService.js');
var pubMedRequest = require('./pubMedRequest.js');

/**
 * Constructor for CitoidService object
 * @param {Object} citoidConfig configuration object
 * @param {Object} logger      logger object, must have a log() method
 * @param {Object} statsd      metrics object
 */
function CitoidService(citoidConfig, logger, statsd) {
	this.logger = logger;
	this.zoteroService = new ZoteroService(citoidConfig, logger);
	this.scraper = new Scraper(citoidConfig, logger);
	this.stats = statsd;
}

/**
 * Requests to the citoid service
 * @param  {Object}   opts	 options object containing request information
 * @param  {Function} callback callback (error, statusCode, body)
 */
CitoidService.prototype.request = function(opts, callback){

	var runnerOpts;
	var citoidService = this;

	citoidService.distinguish(opts.search, function(extractedID, runnerFunction){
		runnerOpts = {
			format : opts.format,
			search : extractedID,
			acceptLanguage : opts.acceptLanguage
		};
		runnerFunction(runnerOpts, callback);
	});
};

/**
 * Request citation metadata from a URL
 * @param  {Object}   opts       options object containing requested url
 * @param  {Function} callback   callback (error, statusCode, body)
 */
CitoidService.prototype.requestFromURL = function (opts, callback) {
	var self = this,
		logger = self.logger,
		zoteroWebRequest = self.zoteroService.zoteroWebRequest.bind(self.zoteroService),
		requestedURL = opts.search,
		format = opts.format;

	zoteroWebRequest(requestedURL, format, function(error, response, body) {
		logger.log('debug/zotero', "Zotero request made for: " + requestedURL);
		if (error) {
			logger.log('warn/zotero', error);
			self.stats.increment('zotero.req.error');
			self.scrape(opts, callback);
		} else if (response) {
			self.stats.increment('zotero.req.' + Math.floor(response.statusCode / 100) + 'xx');
			// 501 indicates no translator available
			// This is common- can indicate shortened url,
			// or a website not specified in the translators
			if (response.statusCode === 501){
				logger.log('trace/zotero', "No Zotero translator found, looking for redirects");
				// Try again following all redirects-
				// We don't do this initially because many sites
				// will redirect to a log-in screen
				unshorten(requestedURL, function(detected, expandedURL) {
					if (detected) {
						logger.log('trace/zotero', "Redirect detected to "+ expandedURL);
						zoteroWebRequest(expandedURL, format, function(error, response, body){
							if (response && !error && response.statusCode === 200){
								logger.log('debug/zotero', "Successfully retrieved and translated body from Zotero");
								callback(null, 200, body);
							} else {
								logger.log('debug/zotero', "No Zotero response available.");
								// Try scraping original URL before expansion
								self.scrape(opts, function(error, responseCode, body){
									if (error || responseCode !== 200){
										// Try scraping expanded URL
										self.scrape(opts, callback);
									} else {
										callback(error, responseCode, body);
									}
								});
							}
						});
					} else {
						logger.log('debug/zotero', "No redirect detected.");
						self.scrape(opts, callback);
					}
				});
			// Need to check that response is a non-empty Array, as occasionally this occurs
			} else if (response.statusCode === 200 && Array.isArray(response.body) && response.body[0]){
				logger.log('debug/zotero', "Successfully retrieved and translated body from Zotero");
				callback (null, 200, body);
			} else {
				//other response codes such as 500, 300
				self.scrape(opts, callback);
			}
		} else {
			self.scrape(opts, callback);
		}
	});
};

/**
 * Request citation metadata from a DOI
 * @param  {Object}   doiOpts    options object containing DOI and format
 * @param  {Function} callback   callback (error, statusCode, body)
 */
CitoidService.prototype.requestFromDOI = function (doiOpts, callback){
	var doiLink = 'http://dx.doi.org/'+ doiOpts.search;
	var citoidService = this;
	var urlOpts =  Object.assign({}, doiOpts); // Shallow clone doiOpts

	// Follow one redirect here from the DOI to the canonical url
	http.get(doiLink, function (res) {
		// Detect a redirect
		if (res && res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
			urlOpts.search = res.headers.location;
			citoidService.requestFromURL(urlOpts, callback);
		} else {
			citoidService.logger.log('debug/DOI', "Unable to resolve DOI " + doiOpts.search);
			var message = 'Unable to resolve DOI';
			var error = new Error(message);
			callback(error, 404, {Error: message});
		}
	});
};

/**
 * Request citation metadata from a PubMed identifier. Supports PMID, PMCID, Manuscript ID and versioned identifiers
 * @param  {Object}   opts       options object containing PubMed identifier. PMCID identifiers must begin with 'PMC'
 * @param  {Function} callback   callback (error, statusCode, body)
 */
CitoidService.prototype.requestFromPubMedID = function(opts, callback){
	var citoidService = this;
	pubMedRequest(opts.search, this.logger, function(error, obj){
		if(error) {
			callback(error, null, null);
		} else {
			var doi = obj.records[0].doi;
			citoidService.logger.log('debug/pubmed', "Got DOI " + doi);
			opts.search = doi;
			citoidService.requestFromDOI(opts, callback);
		}
	});
};

/**
 * Determine type of string (doi, url) and callback on correct handler
 * @param  {String}   rawSearchInput    what the end user searched for
 * @param  {Function} callback          callback(extractedValue, correctFunction)
 */
CitoidService.prototype.distinguish = function(rawSearchInput, callback){
	var reDOI, rePMID, rePMCID, rePMCID2, reHTTP, reWWW,
		parsedURL,
		matchDOI, matchPMID, matchPMCID, matchHTTP, matchWWW,
		search = rawSearchInput.trim();

	reHTTP = new RegExp('^((https?)://.+\\..+)'); // Assumes all strings with http/s protocol are URLs
	reWWW = new RegExp('^((www)\\..+\\..+)'); // Assumes all strings with www substring are URLs
	reDOI = new RegExp('\\b10\\.?[0-9]{3,4}(?:[.][0-9]+)*/.*');
	rePMID = new RegExp('^\\d{8}\\b');
	rePMCID = new RegExp('\\bPMC\\d{7}\\b');
	rePMCID2 = new RegExp('^\\d{7}\\b');

	matchHTTP = search.match(reHTTP);
	matchDOI = search.match(reDOI);
	matchPMID = search.match(rePMID);
	matchPMCID = search.match(rePMCID);
	matchWWW = search.match(reWWW);


	if (matchHTTP || matchWWW){
		this.stats.increment('input.url');
		callback(matchHTTP ? matchHTTP[0] : 'http://' + matchWWW[0], this.requestFromURL.bind(this));
	} else if (matchDOI) {
		this.stats.increment('input.doi');
		callback(matchDOI[0], this.requestFromDOI.bind(this));
	} else if (matchPMID) {
		this.stats.increment('input.pmid');
		callback(matchPMID[0], this.requestFromPubMedID.bind(this));
	} else if (matchPMCID) {
		this.stats.increment('input.pmcid');
		callback(matchPMCID[0], this.requestFromPubMedID.bind(this));
	} else {
		matchPMCID = search.match(rePMCID2);
		if (matchPMCID) {
			this.stats.increment('input.pmcid');
			callback('PMC' + matchPMCID[0], this.requestFromPubMedID.bind(this));
		} else {
			this.stats.increment('input.url');
			parsedURL = urlParse.parse(search);
			if (!parsedURL.protocol){
				search = 'http://'+ search;
			}
			callback(search, this.requestFromURL.bind(this)); //assume url if not doi
		}
	}
};

/**
 * Scrape and export to Zotero translator if nessecary
 * @param  {Object}   opts      options object containing export format
 * @param  {Function} callback  callback(error, responseCode, citation)
 */
CitoidService.prototype.scrape = function(opts, callback){
	var cbResCode, // Response Code to send to the callback
		format = opts.format,
		scrape = this.scraper.scrape.bind(this.scraper),
		zoteroExportRequest = this.zoteroService.zoteroExportRequest.bind(this.zoteroService);
	if (format === 'bibtex') {
		scrape(opts, function(error, scrapeResCode, citation) {
			zoteroExportRequest(citation[0], format, function(err, zotResCode, body) {
				if (zotResCode !== 200){
					body = "Unable to serve "+ format +" format at this time";
					cbResCode = 404; // 404 error if cannot translate into alternate format
				} else if (scrapeResCode !== 200){
					cbResCode = 520; // 520 error if the scraper couldn't scrape from url
				} else {
					cbResCode = 200;
				}
				callback(err, cbResCode, body);
			});
		});
	} else {
		scrape(opts, callback);
	}
};

module.exports = CitoidService;
