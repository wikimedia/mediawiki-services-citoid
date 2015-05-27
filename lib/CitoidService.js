'use strict';

/**
 * Handles requests to the citoid service
 */

/* Import Modules */
var BBPromise = require('bluebird');
var preq = require('preq');
var urlParse = require('url');

/* Import Local Modules */
var CitoidRequest = require('./CitoidRequest.js');
var Exporter = require('./Exporter.js');
var Scraper = require('./Scraper.js');
var unshorten = require('./unshorten.js');
var ZoteroService = require('./ZoteroService.js');

/**
 * Constructor for CitoidService object
 * @param {Object} app   Express object containing logger, stats, conf
 */
function CitoidService(app) {

	this.logger = app.logger;
	this.stats = app.metrics;

	this.zoteroService = new ZoteroService(app);
	this.exporter = new Exporter(app);
	this.scraper = new Scraper(app);

	// Create circular references
	this.zoteroService.exporter = this.exporter;
	this.scraper.exporter = this.exporter;
	this.exporter.zoteroService = this.zoteroService;

}

/**
 * Requests to the citoid service
 * @param   {Object}   cr       CitoidRequest object
 * @returns {Object}          BBPromise for CitoidRequest object
 */
CitoidService.prototype.request = function(cr) {

	var logger = this.logger;

	return this.addResponseFunction(cr).then(function(cr){
		return cr.getResponse(cr).then(cr.fillBody.bind(cr), cr.fillBody.bind(cr));
	}, cr.fillBody.bind(cr)).catch(function(e){
		logger.log('debug/citoidRequest', e);
	});
};

/**
 * Promise for adding correct response function given input type
 * @param  {Object}   cr  CitoidRequest object with new getResponse function added as a property
 * @return {Object}       BBPromise object for modified CitoidRequest object from input
 */
CitoidService.prototype.addResponseFunction = BBPromise.method(function(cr){
	var search = cr.search;

	var reHTTP = new RegExp('^((https?)://.+\\..+)'); // Assumes all strings with http/s protocol are URLs
	var reWWW = new RegExp('^((www)\\..+\\..+)'); // Assumes all strings with www substring are URLs
	var matchHTTP = search.match(reHTTP);
	var matchWWW = search.match(reWWW);
	if (matchHTTP || matchWWW){
		cr.idType = 'url';
		cr.idValue = matchHTTP ? encodeURI(matchHTTP[0]) : 'http://' + encodeURI(matchWWW[0]);
		cr.getResponse = this.requestFromURL.bind(this);
		this.stats.increment('input.' + cr.idType);
		return cr;
	}

	var reDOI = new RegExp('\\b10\\.?[0-9]{3,4}(?:[.][0-9]+)*/.*');
	var matchDOI = search.match(reDOI);
	if (matchDOI) {
		cr.idType = 'doi';
		cr.idValue = encodeURI(matchDOI[0]); //TODO; move this encoding further upstream so original DOI is retained
		cr.getResponse = this.requestFromDOI.bind(this);
		this.stats.increment('input.' + cr.idType);
		return cr;
	}

	var rePMID = new RegExp('^\\d{8}\\b');
	var matchPMID = search.match(rePMID);
	if (matchPMID) {
		cr.idType = 'pmid';
		cr.idValue = matchPMID[0];
		cr.getResponse = this.requestFromPM.bind(this);
		this.stats.increment('input.' + cr.idType);
		return cr;
	}

	var rePMCID = new RegExp('\\bPMC\\d{7}\\b');
	var matchPMCID = search.match(rePMCID);
	if (matchPMCID) {
		cr.idType = 'pmcid';
		cr.idValue = matchPMCID[0];
		cr.getResponse = this.requestFromPM.bind(this);
		this.stats.increment('input.' + cr.idType);
		return cr;
	}

	var rePMCID2 = new RegExp('^\\d{7}\\b');
	matchPMCID = search.match(rePMCID2); // Detects PMCIDs with no PMC prefix
	if (matchPMCID) {
		cr.idType = 'pmcid';
		cr.idValue = 'PMC' + matchPMCID[0];
		cr.getResponse = this.requestFromPM.bind(this);
		this.stats.increment('input.' + cr.idType);
		return cr;
	}

	// Assume url by default
	cr.idType = 'url';
	var parsedURL = urlParse.parse(search);
	if (!parsedURL.protocol){
		search = 'http://'+ encodeURI(search);
	}
	cr.idValue = search;
	cr.getResponse = this.requestFromURL.bind(this);
	this.stats.increment('input.' + cr.idType);
	return cr;

});

/**
 * Promise of requested citation metadata from a URL
 * @param  {Object}   cr  CitoidRequest object with new getResponse function added as a property
 * @return {Object}      BBPromise object for modified CitoidRequest object from input
 */
CitoidService.prototype.requestFromURL = function(cr) {

	if (!cr.url){
		if (cr.idType === 'url'){
			cr.url = cr.idValue;
		} else {
			return BBPromise.reject('No url in citoid request object');
		}
	}

	var self = this;
	var logger = self.logger;
	var zoteroWebRequest = self.zoteroService.zoteroWebRequest.bind(self.zoteroService);
	var requestedURL = cr.url;
	var format = cr.format;

	var prom = zoteroWebRequest(cr);

	function onResolve(response){
		if (response) {
			self.stats.increment('zotero.req.' + Math.floor(response.status / 100) + 'xx');
			if (response.status === 200){
				logger.log('debug/zotero', "Successfully retrieved and translated body from Zotero");
				cr.setCitation(null, 200, response.body);
				return cr;
			} else {
				//other response codes such as 300
				return self.scrape(cr);
			}
		} else {
			return self.scrape(cr);
		}
	}

	function onReject(response){
		//TODO: Fix once zoteroWebRequest is fixed
		if(response && response.status){
			self.stats.increment('zotero.req.' + Math.floor(response.status / 100) + 'xx');
		}
		logger.log('trace/zotero', "No Zotero translator found, looking for redirects");
		// Try again following all redirects-
		// We don't do this initially because many sites
		// will redirect to a log-in screen
		return unshorten(requestedURL).then(function(expandedURL) {
			logger.log('trace/zotero', "Redirect detected to "+ expandedURL);
			cr.url = expandedURL;
			return zoteroWebRequest(cr)
			.then(function(response){
				if (response && response.status === 200){
					logger.log('debug/zotero', "Successfully retrieved and body from Zotero");
					cr.setCitation(null, 200, response.body);
					return cr;
				} else {
					logger.log('debug/zotero', "No Zotero response available.");
					// Try scraping original URL before expansion
					cr.url = requestedURL;
					return self.scrape(cr).then(function(cr){
						if (cr.response.responseCode !== 200){
							// Try scraping expanded URL
							cr.url = expandedURL;
							return self.scrape(cr);
						} else {
							return cr;
						}
					});
				}
			// Rejection handler zoteroWebRequest
			}, function(response){
				// Block doesn't currently work because response is undefined
				if (response){
					self.stats.increment('zotero.req.' + Math.floor(response.status / 100) + 'xx');
				}
				logger.log('debug/zotero', "No Zotero response available.");
				// Try scraping original URL before expansion
				cr.url = requestedURL;
				return self.scrape(cr).then(function(cr){
					if (cr.response.responseCode !== 200){
						// Try scraping expanded URL
						cr.url = expandedURL;
						return self.scrape(cr);
					} else {
						return cr;
					}
				});
			})
			.catch(function(error){
				logger.log('warn/zotero', error);
				self.stats.increment('zotero.req.error');
				return self.scrape(cr);
			});
		// Rejection handler for unshorten
		}, function(){
			logger.log('debug/zotero', "No redirect detected.");
			return self.scrape(cr);
		});
	}


	return prom
	.then(onResolve, onReject)
	.catch(function(error){
		logger.log('warn/zotero', error);
		self.stats.increment('zotero.req.error');
	});

};

/**
 * Promise of citation metadata from a DOI
 * @param  {Object}   cr     CitoidRequest object with doi and format
 * @return {Object}          BBPromise for CitoidRequest object
 */
CitoidService.prototype.requestFromDOI = function(cr) {

	var doi;

	if (!cr.doi && cr.idType === 'doi'){
		doi = cr.idValue;
	} else {
		return BBPromise.reject('No doi in citoid request object');
	}

	var doiLink = 'http://dx.doi.org/'+ doi;

	var citoidService = this;
	var urlOpts =  {};
	// Options for obtaining url the DOI resolves to
	var resolveOpts = {
		url : doiLink,
		method: 'head',
		followRedirect : false,
	};

	// Set responses if below is rejected
	function reject(cr){
		var message = 'Unable to resolve DOI ' + doi;
		var error = {Error: message};
		citoidService.logger.log('debug/DOI', message);
		cr.response.error = error;
		cr.response.responseCode = 404;
		return cr;
	}

	// Resolve canonical URL from DOI URL
	return preq(resolveOpts).then(
	// Preq resolve handler
	function (res) {
		if (res && res.status > 300 && res.status < 400 &&
				res.headers.location) {
			cr.url = res.headers.location;
			// Send canonical URL to requestFromURL
			citoidService.logger.log('debug/DOI', "Resolved DOI "
				+ doi + " to URL " + cr.url +
				"; Sending to requestFromURL");
			return citoidService.requestFromURL(cr).then(function(cr){
				var cit = cr.response.citation;
				// Ensure itemType in citation is journalArticle
				// TODO: Ensure DOI in citation before response returns, not after
				if (cit && cit[0]){
					if (!cit[0].itemType || (cit[0].itemType && cit[0].itemType !== 'journalArticle')){
						cit[0].itemType = 'journalArticle';
					}
					if (!cit[0].doi){
						cit[0].doi = doi;
					}
				}
				return cr;
			});
		} else {
			return reject(cr);
		}
	},
	// Preq rejection handler
	function(res){
		return reject(cr);
	});
};

/**
 * Requests citation metadata from a PMID or PMCID identifier.
 * @param  {Object}   cr         CitoidRequest object with pm(c)id, type and format
 * @returns {Object}          BBPromise for CitoidRequest object
 */
CitoidService.prototype.requestFromPM = function(cr){

	var self = this;
	var type = cr.idType;
	var baseURL = 'http://www.ncbi.nlm.nih.gov/';
	var e;

	switch(type) {
		case 'pmid':
			baseURL = baseURL + 'pubmed/';
			break;
		case 'pmcid':
			baseURL = baseURL + 'pmc/articles/';
			break;
		default:
			e = new Error('Unknown PubMed type: ' + type);
			self.logger.log('warn/pubmed', e);
			cr.setCitation(e, 400, e);
			return cr;
	}

	cr.url = baseURL + cr.idValue;

	self.logger.log('debug/pubmed', {from: cr.idValue, to: cr.url,
		type: type});

	// TODO: Add test for this block- requires zotero inactivation
	var scrapeAndCheck = BBPromise.method(function(cr){
		return self.scrape(cr).then(function(cr) {
			if (cr.response.responseCode !== 200){
				e = {Error: 'Unable to locate resource with ' + type + ' ' +
					cr.idValue};
				cr.setCitation(e, 404, e);
				self.logger.log('info/pubmed', e);
				return cr;
			}
			return cr;
		});

	});

	return this.requestFromURL(cr)
	.then(function(cr) {
		if (cr.response.responseCode === 200){
			var cit = cr.response.citation[0];
			// Ensure itemType in citation is journalArticle
			if (cit && (!cit.itemType || (cit.itemType && cit.itemType !== 'journalArticle'))){
				cit.itemType = 'journalArticle';
			}
			return cr;
		} else {
			return scrapeAndCheck(cr);
		}
	}, function(response){
		return scrapeAndCheck(cr);
	})
	.catch(function(e){
		return scrapeAndCheck(cr);
	});

};

/**
 * Scrape and export to Zotero translator if nessecary
 * @param  {Object}   opts      options object containing export format
 * @returns {Object}          BBPromise for CitoidRequest object
 */
CitoidService.prototype.scrape = function(cr){

	return this.scraper.scrape(cr);

};

module.exports = CitoidService;
