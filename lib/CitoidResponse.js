'use strict';

/**
 * An object corresponding to each request to the citoid service
 */

const CitoidError = require( './CitoidError.js' );

class CitoidResponse {

	/**
	 * Constructor for CitoidRequest object
	 */
	constructor() {

		this.citations = []; // Array of Citation objects
		// Array of sources of the metadata, i.e. CrossRef, Zotero, citoid, etc.
		this.source = [];

		this.responseCode = null; // response code to send
		this.error = null; // CitoidError for entire response (each Citation also may have one)
		this.body = null; // Body constructed from Citation objects
	}

	fillError() {
		// Arbitrarily pick first error available if one isn't already present
		if ( !this.error && this.citations && this.citations.length > 0 ) {
			for ( const c in this.citations ) {
				if ( this.citations[ c ].error ) {
					this.error = this.citations[ c ].error;
					break;
				}
			}
		}
		// Fallback blank error if it hasn't been set elsewhere in the callstack
		if ( !this.error ) {
			this.error = new CitoidError();
		}
		this.responseCode = this.error.responseCode;
		this.body = this.error.getBody();
	}
}

module.exports = CitoidResponse;
