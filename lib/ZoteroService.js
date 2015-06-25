'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to a Zotero server
 */

/* Import Modules */
var BBPromise = require('bluebird');
var crypto = require('crypto');
var util = require('util');
var preq = require('preq');

var pubMedRequest = require('./pubMedRequest.js');
var validateZotero = require('./Exporter.js').validateZotero;


/**
 * Constructor for CitoidService object
 * @param {Object} app   Express app; contains logger, metrics, and configuration
 */
function ZoteroService(app){

	this.logger = app.logger;
	this.stats = app.metrics;

	this.exporter = null;

	var baseURL = util.format('http://%s:%s/',
		app.conf.zoteroInterface, app.conf.zoteroPort.toString());
	this.webURL = baseURL + 'web';
	this.exportURL = baseURL + 'export';
}

/**
 * Promise for requests to Zotero server endpoint /web
 * @param  {Object}   cr       CitoidRequest object
 * @return {Object}            BBPromise for response
 */
ZoteroService.prototype.zoteroWebRequest = BBPromise.method(function(cr){

	var self = this;
	var requestedURL = cr.url || cr.idValue;
	var format = cr.format;
	var sessionID = crypto.randomBytes(20).toString('hex');
	var options = {
		uri: self.webURL,
		method: 'post',
		headers: {'content-type': 'application/json'},
		body: {
			"url": requestedURL,
			"sessionid": sessionID
		}
	};

	return preq(options).then(function(response) {
		self.logger.log('debug/zotero', "Zotero request made for: " + requestedURL);
		self.stats.increment('zotero.req.' + Math.floor(response.status / 100) + 'xx');
		if (response && response.status === 200) {

			// Zotero ideally should return 501 if there are no citations in the page,
			// but, for example, the PubMed translator is currently broken and
			// returns 200 and empty body for http errors; this block fixes errant
			// responses appropriately by making sure citation is present in body
			if (response.body && Array.isArray(response.body) && response.body[0]){

				// Case where response is an Array inside of an Array;
				if (Array.isArray(response.body[0])){
					if (response.body[0][0]){
						// Rewrites response.body to be an Array of objects
						response.body = response.body[0];
					}
					// Case where body is [[]]
					else {
						return BBPromise.reject('No citation in body');
					}
				}

				// Case where body is an empty object, i.e. [{}] or [[{}]]
				if (!Object.keys(response.body[0]).length) {
					return BBPromise.reject('No citation in body');
				}

				// Set validated body from zotero as the response's citation
				cr.response.citation = response.body;
				cr.response.responseCode = 200;

				// Promise for CitoidResponse with response.citation validated
				return validateZotero(requestedURL, cr)
				.catch(function(e){
					self.logger.log('warn/zotero', "Error during Zotero validation: " + e);
					throw e;
				});
			} else {
				return BBPromise.reject('No citation in body');
			}
		} else { // I.e. 300 response codes
			return BBPromise.reject('Non 200 response from Zotero');
		}
	}, function(response){
		self.logger.log('debug/zotero', "Zotero request made for: " + requestedURL);
		self.stats.increment('zotero.req.' + Math.floor(response.status / 100) + 'xx');
		return BBPromise.reject('Status code from Zotero > 400');
	});
});

/**
 * Request to Zotero server endpoint /export
 * @param   {Object}   citation     Zotero JSON citation to be converted
 * @param   {Object}   format       requested format
 * @returns {Object}                BBPromise for a response
 */
ZoteroService.prototype.zoteroExportRequest = BBPromise.method(function(citation, format){
	var options = {
		url: this.exportURL,
		method: 'POST',
		body: JSON.stringify(citation),
		qs: {format: format},
		headers: {
			'content-type': 'application/json'
		}
	};

	return preq(options);
});

/* Exports */
module.exports = ZoteroService;

