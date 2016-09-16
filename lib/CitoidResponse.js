'use strict';

/**
 * An object corresponding to each request to the citoid service
 */

/**
 * Constructor for CitoidRequest object
 */
function CitoidResponse() {

    this.citation = [{}]; // Initialise empty native citation list with initial empty citation
    this.source = []; // Array of sources of the metadata, i.e. CrossRef, WorldCat, Zotero, citoid, etc.
    this.responseCode = 500; // Default internal server error
    this.error = null;
    this.body = null;

}

module.exports = CitoidResponse;
