'use strict';

/**
 * An object representing a citoid error response
 */

/* Import Local Modules */
const AddressError = require('./hostIsAllowed').AddressError;

class CitoidError {

    /**
     * Construct with optional parameters
     *
     * @param  {Error} error       Optional Error if available
     * @param  {string} message    Message to go into response
     * @param  {number} responseCode  Response code for citoid to reply
     * @return {Object}
     */
    constructor(error, message, responseCode) {
        this.error = error;
        this.message = message;
        this.responseCode = responseCode;
        this.build();
    }

    build() {
        if (this.error && this.error.name === 'HTTPError' && this.error.body && this.error.body.internalURI) {
            this.message = `Unable to load URL ${this.error.body.internalURI}`;
            this.responseCode = 404;
        } else if (this.error && this.error instanceof AddressError) {
            this.message = this.error.message;
            this.responseCode = 400;
        }
        if (!this.responseCode) { this.responseCode = 500; }
        if (!this.message) { this.message = 'Unknown error'; }
    }

    // Get what will go into the body of the response
    getBody() {
        return { Error: this.message };
    }
}

module.exports = CitoidError;
