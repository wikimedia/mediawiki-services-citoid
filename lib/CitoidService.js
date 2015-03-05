/**
 * Handles requests to the citoid service
 */

/* Import Modules */
var urlParse = require('url');

/* Import Local Modules */
var unshorten = require('./unshorten.js'),
	Scraper = require('./Scraper.js'),
	ZoteroService = require('./ZoteroService.js'),
	pubMedRequest = require('./pubMedRequest.js');

/**
 * Constructor for CitoidService object
 * @param {Object} citoidConfig configuration object
 * @param {Object} logger       bunyan logger object
 */
function CitoidService(citoidConfig, logger){
	this.log = logger;
	this.zoteroService = new ZoteroService(citoidConfig, logger);
	this.scraper = new Scraper(citoidConfig, logger);
}

/**
 * Requests to the citoid service
 * @param  {Object}   opts     options object containing request information
 * @param  {Function} callback callback (error, statusCode, body)
 */
CitoidService.prototype.request = function(opts, callback){

	var runnerOpts,
		citoidService = this;

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
 * @param  {Object}   opts         options object containing requested url
 * @param  {Function} callback     callback (error, statusCode, body)
 */
CitoidService.prototype.requestFromURL = function (opts, callback){
	var self = this,
		log = self.log,
		zoteroWebRequest = self.zoteroService.zoteroWebRequest.bind(self.zoteroService),
		requestedURL = opts.search,
		format = opts.format;

	zoteroWebRequest(requestedURL, format, function(error, response, body){
		log.info("Zotero request made for: " + requestedURL);
		if (error) {
			log.error(error);
			self.scrape(opts, callback);
		} else if (response) {
			// 501 indicates no translator available
			// This is common- can indicate shortened url,
			// or a website not specified in the translators
			if (response.statusCode === 501){
				log.info("No Zotero translator found.");
				log.info("Looking for redirects...");
				// Try again following all redirects-
				// We don't do this initially because many sites
				// will redirect to a log-in screen
				unshorten(requestedURL, function(detected, expandedURL) {
					if (detected) {
						log.info("Redirect detected to "+ expandedURL);
						zoteroWebRequest(expandedURL, format, function(error, response, body){
							if (response && !error && response.statusCode === 200){
								log.info("Successfully retrieved and translated body from Zotero");
								callback(null, 200, body);
							} else {
								log.info("No Zotero response available.");
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
						log.info("No redirect detected.");
						self.scrape(opts, callback);
					}
				});
			} else if (response.statusCode === 200){
				log.info("Successfully retrieved and translated body from Zotero");
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
 * @param  {Object}   opts         options object containing DOI and format
 * @param  {Function} callback     callback (error, statusCode, body)
 */
CitoidService.prototype.requestFromDOI = function (opts, callback){
	var doiLink = 'http://dx.doi.org/'+ opts.search;
	// TODO: optimise this (can skip some steps in requestFromURL)
	this.requestFromURL(doiLink, opts.format, callback);
};

/**
 * Request citation metadata from a PubMed identifier. Supports PMID, PMCID, Manuscript ID and versioned identifiers
 * @param  {Object}   opts       options object containing PubMed identifier. PMCID identifiers must begin with 'PMC'
 * @param  {Function} callback   callback (error, statusCode, body)
 */
CitoidService.prototype.requestFromPubMedID = function(opts, callback){
    pubMedRequest(opts.search, function(error, obj){
		if(error){
			callback(error, null, null);
		} else {
			var doi = obj.records[0].doi;
			this.log.info("Got DOI " + doi);
			opts.search = doi;
			this.requestFromDOI(opts, callback);
		}
	});
};

/**
 * Determine type of string (doi, url) and callback on correct handler
 * @param  {String}   rawSearchInput	what the end user searched for
 * @param  {Function} callback     		callback(extractedValue, correctFunction)
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
 * Scrape and export to Zotero translator if nessecary
 * @param  {Object}   opts   	options object containing export format
 * @param  {Function} callback 	callback(error, responseCode, citation)
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
