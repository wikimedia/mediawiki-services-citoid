'use strict';

/**
 * Handles requests to the citoid service
 */

/* Import Modules */
var request = require('request');
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

	var self = this;
	var logger = self.logger;
	var zoteroWebRequest = self.zoteroService.zoteroWebRequest.bind(self.zoteroService);
	var requestedURL = opts.search;
	var format = opts.format;

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
	// Shallow clone doiOpts for requestFromURL method
	var urlOpts =  Object.assign({}, doiOpts);
	// Options for obtaining url the DOI resolves to
	var resolveOpts = {
		url : doiLink,
		followRedirect : false,
	};

	// Resolve canonical URL from DOI URL
	request.head(resolveOpts, function (err, res) {
		if (!err && res && res.statusCode > 300 && res.statusCode < 400 &&
				res.headers.location) {
			urlOpts.search = res.headers.location;
			// Send canonical URL to requestFromURL
			citoidService.logger.log('debug/DOI', "Resolved DOI "
				+ doiOpts.search + " to URL " + urlOpts.search +
				"; Sending to requestFromURL");
			citoidService.requestFromURL(urlOpts, callback);
		} else {
			var message = 'Unable to resolve DOI ' + doiOpts.search;
			var error = new Error(message);
			citoidService.logger.log('debug/DOI', message);
			callback(error, 404, {Error: message});
		}
	});
};

/**
 * Requests citation metadata from a PMID or PMCID identifier.
 * @param  {String}   type       'PMID' or 'PMCID'
 * @param  {Object}   opts       options object containing a PM(C)ID
 * @param  {Function} callback   callback (error, statusCode, body)
 */
CitoidService.prototype.requestFromPM = function(type, opts, callback){

	var self = this;
	var urlOpts =  Object.assign({}, opts); // shallow clone of opts
	var baseURL = 'http://www.ncbi.nlm.nih.gov/';

	switch(type) {
		case 'PMID':
			baseURL = baseURL + 'pubmed/';
			break;
		case 'PMCID':
			baseURL = baseURL + 'pmc/articles/';
			break;
		default:
			var e = new Error('Unknown PubMed type: ' + type);
			self.logger.log('warn/pubmed', e);
			callback(e, 400, {Error: e.message});
			return;
	}

	urlOpts.search = baseURL + opts.search;

	self.logger.log('debug/pubmed', {from: opts.search, to: urlOpts.search,
		type: type});

	self.requestFromPubMedURL(urlOpts, function(err, responseCode, body){
		if (responseCode === 200){
			callback(err, 200, body);
		} else {
			// Handle case where 404 is due to failed export
			if (responseCode === 404 && body) {
				callback(err, 404, body);
			// For all other errors, override message
			} else {
				var e = new Error('Unable to locate resource with ' + type + ' ' +
					opts.search);
				self.logger.log('info/pubmed', e.message);
				callback(e, 404, {Error: e.message});
			}
		}
	});

};

/**
 * Request citation metadata from a pubmed url. Should be called by
 * requestFromPM
 * @param  {Object}   opts       options object containing pubmed url
 * @param  {Function} callback   callback (error, statusCode, body)
 */
CitoidService.prototype.requestFromPubMedURL = function(opts, callback){

	var self = this;
	var logger = self.logger;
	var zoteroWebRequest = self.zoteroService.zoteroWebRequest.bind(self.zoteroService);
	var requestedURL = opts.search;
	var format = opts.format;

	function scrapeAndCheck() {
		self.scrape(opts, function(error, responseCode, body){
			// Return 404s instead of 520s for invalid pubmed links
			if (responseCode === 200){
				callback(error, 200, body);
			} else if (responseCode === 404) {
				// 404s here are due to a failed export and
				// the error and body should be passed through.
				callback(error, 404, body);
			} else {
				// Overwrite body of any 520 response from scraper
				callback(error, 404, null);
			}
		});
	}

	zoteroWebRequest(requestedURL, format, function(error, response, body) {
		logger.log('debug/zotero', "Zotero request made for: " + requestedURL);
		if (error) {
			logger.log('warn/zotero', error);
			self.stats.increment('zotero.req.error');
			scrapeAndCheck();
		} else if (!response) {
			callback(true, 404, null);
		} else {
			self.stats.increment('zotero.req.' + Math.floor(response.statusCode / 100)
			+ 'xx');

			var citationInBody = Array.isArray(response.body) && response.body[0];
			var okBody = response.statusCode === 200 && citationInBody;
			var notImplemented = response.statusCode === 501;

			if (okBody) {
				logger.log('debug/zotero', "Successfully retrieved and translated\
				 body from Zotero");
				callback (null, 200, body);
			} else {

				// 501 not implemented can indicate that the link is invalid, or
				// that the translator is broken. Translators can break at any
				// time if the website's url structure is changed.
				if (notImplemented){
					logger.log('trace/zotero', "Zotero not implemented error; \
					PubMed ID may be invalid");
				}

				// Zotero ideally should return 501 for http errors at the
				// location, but the PubMed translator is currently broken and
				// returns 200 and empty body for http errors for PMCs only
				if (!citationInBody){
					logger.log('trace/zotero', "Zotero returned 200 but with \
					empty body; PubMed ID may be invalid");
				}

				if (!citationInBody || notImplemented) {
					scrapeAndCheck();
				} else {
					callback(true, 404, null);
				}
			}
		}
	});
};


/**
 * Determine type of string (doi, url) and callback on correct handler
 * @param  {String}   rawSearchInput    what the end user searched for
 * @param  {Function} callback          callback(extractedValue, correctFunction)
 */
CitoidService.prototype.distinguish = function(rawSearchInput, callback){

	var search = rawSearchInput.trim();

	var reHTTP = new RegExp('^((https?)://.+\\..+)'); // Assumes all strings with http/s protocol are URLs
	var reWWW = new RegExp('^((www)\\..+\\..+)'); // Assumes all strings with www substring are URLs
	var reDOI = new RegExp('\\b10\\.?[0-9]{3,4}(?:[.][0-9]+)*/.*');
	var rePMID = new RegExp('^\\d{8}\\b');
	var rePMCID = new RegExp('\\bPMC\\d{7}\\b');
	var rePMCID2 = new RegExp('^\\d{7}\\b');

	var matchHTTP = search.match(reHTTP);
	var matchDOI = search.match(reDOI);
	var matchPMID = search.match(rePMID);
	var matchPMCID = search.match(rePMCID);
	var matchWWW = search.match(reWWW);

	if (matchHTTP || matchWWW){
		this.stats.increment('input.url');
		callback(matchHTTP ? matchHTTP[0] : 'http://' + matchWWW[0], this.requestFromURL.bind(this));
	} else if (matchDOI) {
		this.stats.increment('input.doi');
		callback(matchDOI[0], this.requestFromDOI.bind(this));
	} else if (matchPMID) {
		this.stats.increment('input.pmid');
		callback(matchPMID[0], this.requestFromPM.bind(this, 'PMID'));
	} else if (matchPMCID) {
		this.stats.increment('input.pmcid');
		callback(matchPMCID[0], this.requestFromPM.bind(this, 'PMCID'));
	} else {
		matchPMCID = search.match(rePMCID2); // Detects PMCIDs with no PMC prefix
		if (matchPMCID) {
			this.stats.increment('input.pmcid');
			callback('PMC' + matchPMCID[0], this.requestFromPM.bind(this, 'PMCID'));
		} else {
			this.stats.increment('input.url');
			var parsedURL = urlParse.parse(search);
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
	var cbResCode; // Response Code to send to the callback
	var self = this;
	var format = opts.format;
	var scrape = this.scraper.scrape.bind(this.scraper);
	var zoteroExportRequest = this.zoteroService.zoteroExportRequest.bind(this.zoteroService);

	if (format === 'bibtex') {
		scrape(opts, function(error, scrapeResCode, citation) {
			zoteroExportRequest(citation[0], format, function(err, zotResCode, body) {
				if (err || zotResCode !== 200){
					self.logger.log('trace/zotero', "Unable to translate to export format bibtex");
					var message  = "Unable to serve " + format + " format at this time";
					body = {Error: message};
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
