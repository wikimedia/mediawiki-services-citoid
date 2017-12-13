'use strict';

/**
 * An object corresponding to each request to the citoid service
 */

/**
 * Constructor for CitoidRequest object
 */
function CitoidResponse() {

    this.citations = []; // Array of Citation objects
    // Array of sources of the metadata, i.e. CrossRef, WorldCat, Zotero, citoid, etc.
    this.source = [];
    this.responseCode = 500; // Default to internal server error
    this.error = null; // Final error being sent, if any
    this.body = null; // Body constructed from Citation objects

}

module.exports = CitoidResponse;
