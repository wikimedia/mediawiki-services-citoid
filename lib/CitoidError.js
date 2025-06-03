'use strict';

/**
 * An object representing a citoid error response
 */

/* Import Local Modules */
const AddressError = require( './hostIsAllowed' ).AddressError;

class CitoidError {

	/**
	 * Construct with optional parameters
	 *
	 * @param  {Error} error       Optional Error if available
	 * @param  {string} message    Message to go into response
	 * @param  {number} responseCode  Response code for citoid to reply
	 * @param  {string} contentType   Optional content type if error is 415
	 * @return {Object}
	 */
	constructor( error, message, responseCode, contentType ) {
		this.error = error;
		this.message = message;
		this.responseCode = responseCode;
		this.contentType = contentType;
		this.build();
	}

	build() {
		if ( this.error && this.error.name === 'HTTPError' && this.error.body && this.error.body.internalURI ) {
			this.message = `Unable to load URL ${ this.error.body.internalURI }`;
			this.responseCode = 404;
		} else if ( this.error && this.error instanceof AddressError ) {
			this.message = this.error.message;
			this.responseCode = 400;
		}
		if ( this.responseCode === 415 && !this.message ) {
			this.message = 'The remote document is not in a supported format';
		}
		if ( !this.responseCode ) {
			this.responseCode = 500;
		}
		if ( !this.message ) {
			this.message = 'Unknown error';
		}
	}

	// Get what will go into the body of the response
	getBody() {
		if ( this.contentType ) {
			return {
				error: this.message,
				contentType: this.contentType
			};
		} else {
			return { error: this.message };
		}
	}
}

module.exports = CitoidError;
