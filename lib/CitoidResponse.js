'use strict';

/**
 * An object corresponding to each request to the citoid service
 */

/**
 * Constructor for CitoidRequest object
 */
function CitoidResponse() {

	this.citation = []; // Initialise empty native citation list
	this.responseCode = 500; // Default internal server error
	this.error = null;
	this.body = null;

}

module.exports = CitoidResponse;
