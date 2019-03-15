'use strict';

/**
 * An object corresponding to each request to the citoid service
 */

const BBPromise = require('bluebird');
const request = require('request');

const CitoidResponse = require('./CitoidResponse.js');


class CitoidRequest {


    /**
    * Constructor for CitoidRequest object
    * @param {Object} req          raw request object from express
    * @param {Object} app
    */
    constructor(req, app) {

        this.request = req;
        this.logger = req.logger || app.logger;

        this.response = new CitoidResponse(); // Prepare an empty response
        // Array of Promises for cr with Citation objects added in
        // response.citations from different kinds of queries (i.e. from PMC or PMID)
        this.getResults = [];

        // Possible extra ids
        this.url = null;
        this.doi = null;
        this.oclc = null;

        // Cookie jar
        this.jar = request.jar();

        this.exporter = app.citoid.exporter;

        this.build();

    }

    /**
    * Add variables from request object
    */
    build() {

        // Coerces 'false'-> false, '0'-> false, 'True' ->true, '1'->true, etc
        function getBool(val) {
            if (!val) { return false; }
            return !!JSON.parse(String(val).toLowerCase());
        }

        this.acceptLanguage = this.request.headers['accept-language'];
        this.format = encodeURIComponent(this.request.query.format);
        this.search = this.request.query.search;
        if (this.search) { this.search = this.search.trim(); }
        this.baseFields = getBool(this.request.query.basefields);

        // start de-comming basefields paramter in favour of separate type name
        if (this.format === 'mediawiki' && this.baseFields) {
            this.format = 'mediawiki-basefields';
        }

    }

    fillBody() {
        let success = false; // Bool if no citations successfully complete
        const exportPromises = []; // Promises for exported citations

        // Prevent body from accidentally being overwritten
        if (this.response.body) {
            return BBPromise.reject('Body already filled');
        }

        if (!this.exporter) {
            return BBPromise.reject('No exporter registered with citoid service.');
        }

        // Errors that occur before citations are created, i.e. issues with requests
        if (!this.response.citations || !Array.isArray(this.response.citations) ||
                this.response.citations.length < 1) {
            this.response.body = this.response.error;
            return BBPromise.resolve(this);
        }

        // Create export Promises for each Citation in citations Array
        const addCitation = (citation) => {
            // Add Citations' exported content to response body
            if (!citation.error) {
                // Assumes citation.format is set- must be set in CitoidService requestTo methods
                if (citation.format === 'bibtex') {
                    this.response.body = (this.response.body ? this.response.body : '')
                        + citation.formattedContent;
                } else {
                    // Create Array if not already an Array
                    this.response.body = this.response.body ? this.response.body : [];
                    this.response.body.push(citation.formattedContent);
                }
                this.response.responseCode = 200;
                success = true;
            }
            return this;
        };

        for (let i = 0; i < this.response.citations.length; i++) {
            if (this.response.citations[i].responseCode === 200) {
                exportPromises.push(
                    this.exporter.export(this.response.citations[i]).then(addCitation)
                );
            }
        }

        // Wait for all export Promises to complete, then either fill with error or return
        // cr containing successful citations
        return BBPromise.all(exportPromises.map(x => x.reflect())).then(() => {
            if (!success) {
                // Try general error first
                if (this.response.error && this.response.responseCode) {
                    this.response.body = this.response.error;
                } else if (this.response.citations[0] && this.response.citations[0].error) {
                    // Arbitrarily pick first error
                    this.response.error = this.response.citations[0].error;
                    this.response.responseCode = this.response.citations[0].responseCode;
                }
                // Fill body with error, if known
                if (this.response.error) {
                    this.response.body = this.response.error;
                } else {
                    this.response.body = { Error: 'Unknown error' };
                }
            }
            return BBPromise.resolve(this);
        });
    }

    getResponse() {
        throw new Error('Method getResponse should be overridden');
    }


}


module.exports = CitoidRequest;
