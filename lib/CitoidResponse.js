'use strict';

/**
 * An object corresponding to each request to the citoid service
 */

/**
 * Constructor for CitoidRequest object
 */
class CitoidResponse {

    constructor() {

        this.citations = []; // Array of Citation objects
        // Array of sources of the metadata, i.e. CrossRef, WorldCat, Zotero, citoid, etc.
        this.source = [];

        this.responseCode = null; // response code to send
        this.error = null; // CitoidError for entire response (each Citation also may have one)
        this.body = null; // Body constructed from Citation objects
    }

    fillError() {
        // Arbitrarily pick first error from first bad citation is one isn't already present
        if (!this.error) {
            this.error = this.citations[0].error;
        }
        if (this.error) {
            this.responseCode = this.error.responseCode;
            this.body = this.error.getBody();
        }
    }

}

module.exports = CitoidResponse;
