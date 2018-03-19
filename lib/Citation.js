'use strict';

/**
 * An object representing a single citation
 */

/**
 * Constructor for Citation object
 */

function Citation(idType, idValue) {

    this.idType = idType || null; // ID requested associated with citation
    this.idValue = idValue || null; // Type of ID

    // Possible extra ids
    this.doi = (this.idType === 'doi') ? this.idValue : null;
    this.isbn = (this.idType === 'isbn') ? this.idValue : null;
    this.oclc = (this.idType === 'oclc') ? this.idValue : null;
    this.pmcid = (this.idType === 'pmcid') ? this.idValue : null;
    this.pmid = (this.idType === 'pmid') ? this.idValue : null;
    this.qid = (this.idType === 'qid') ? this.idValue : null;
    this.url = (this.idType === 'url') ? this.idValue : null;

    // Whether or not PubMed data has been requested yet.
    // Either false or a Promise
    this.hasRequestedPubMed = false;

    this.content = {}; // Initialise empty object for fields
    this.format = null; // Target format
    this.formattedContent = {}; // Content translated into targeted format
    this.source = []; // Array of sources for the content
    this.responseCode = 500; // Default to internal server error; code to use with error
    this.error = null; // Error message in form {Error: 'message'}

}

module.exports = Citation;
