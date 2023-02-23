'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Requests and sanity checks the response from PubMed's API
 */

const BBPromise = require('bluebird');

class PubMedService {

    /**
     * Constructor for PubMed Service object
     *
     * @param {Object} app   Express app; contains logger, metrics, and configuration
     */
    constructor(app) {
        this.mailto = app.conf.mailto;
    }

    /**
     * Requests a PubMed object using any supported identifier
     *
     * @param  {string}  identifier  Valid PubMed identifier (DOI, PMID, PMCID with PMC prefix,
     *                               Manuscript ID, versioned ID)
     * @param  {string}  request     original request option
     * @return {Object}              BBPromise for converted ID
     */
    convert(identifier, request) {
        if (!identifier) {
            return BBPromise.reject('No identifier in request');
        }
        const escapedId = encodeURIComponent(identifier);
        // TODO: Make url configurable
        const url = 'https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/';
        const mailto = this.mailto || 'example@example.com'; // set default in case the config lacks it

        const qs = {
            tool: 'citoid',
            email: mailto,
            format: 'json',
            ids: escapedId
        };

        let message;

        return request.issueRequest({
            uri: url,
            qs,
            qsStringifyOptions: { // Prevent email from being URL encoded
                encode: false
            }
        }).then((response) => {

            const body = response.body;
            request.logger.log('debug/pubmed', `PubMed query made for ids: ${identifier}`);
            if (response.status !== 200) {
                message = `Unexpected HTTP status code: ${response.statusCode}`;
                request.logger.log('warn/pubmed', message);
                return BBPromise.reject(message);
            } else if (body.status !== 'ok') {
                message = `Unexpected status from PubMed API: ${body.status}`;
                request.logger.log('warn/pubmed', message);
                return BBPromise.reject(message);
            } else if (body.records.length === 0) {
                message = 'No records from PubMed API';
                request.logger.log('warn/pubmed', message);
                return BBPromise.reject(message);
            } else {
                request.logger.log('trace/pubmed', `Successful PubMed query made for ids: ${identifier}`);
                return body;
            }
        }).catch((error) => {
            message = 'Unknown pubmed error';
            request.logger.log('warn/pubmed', message);
            return BBPromise.reject(message);
        });
    }
}

module.exports = PubMedService;
