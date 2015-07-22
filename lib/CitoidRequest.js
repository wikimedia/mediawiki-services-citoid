'use strict';

/**
 * An object corresponding to each request to the citoid service
 */

var BBPromise = require('bluebird');
var CitoidResponse = require('./CitoidResponse.js');
var request = require('request');

/**
 * Constructor for CitoidRequest object
 * @param {Object} req          raw request object from express
 */
function CitoidRequest(req, app) {

	this.request = req;
	this.logger = req.logger || app.logger;

	this.response = new CitoidResponse(); // Prepare an empty response

	this.idType = null;
	this.idValue = null;

	this.url = null;
	this.doi = null;

	this.jar = request.jar();

	this.exporter = app.citoid.exporter;

	this.build();

}

/**
 * Add variables from request object
 */
CitoidRequest.prototype.build = function(){
	this.acceptLanguage = this.request.headers['accept-language'];
	this.format = encodeURIComponent(this.request.query.format);
	this.search = this.request.query.search;
	if (this.search){this.search=this.search.trim();}
	this.encodedSearch = encodeURIComponent(this.request.query.search);
};

CitoidRequest.prototype.setCitation = function(error, responseCode, citation){
	this.response.error = error;
	this.response.responseCode = responseCode;
	this.response.citation = citation;
};

/**
 * Export citation to body
 * @return {Object}              BBPromise for self
 */
CitoidRequest.prototype.fillBody = BBPromise.method(function(){
	var self = this;

	// Prevent body from accidentally being overwritten
	if (this.response.body){
		return BBPromise.reject('Body already filled');
	}
	// Fill body with error, if present, and return
	if (this.response.error){
		this.response.body = this.response.error;
		return this;
	// If no error and empty citation, reject promise
	} else if (!this.response.citation || !Array.isArray(this.response.citation) ||
		!this.response.citation[0]){
		return BBPromise.reject('Unable to fill body; no citation available.');
	}
	// If no error and citation is present, attempt to export; the exporter will fill the body
	if (!this.exporter){
		return BBPromise.reject('No exporter registered with citoid service.');
	}
	return this.exporter.export(this);
});

CitoidRequest.prototype.getResponse = function(){
	throw new Error('Method getResponse should be overridden');
};


module.exports = CitoidRequest;
