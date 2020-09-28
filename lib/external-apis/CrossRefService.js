'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to the CrossRef REST API
 * https://github.com/CrossRef/rest-api-doc
 */

/* Import Modules */
const BBPromise = require('bluebird');
const url = 'https://api.crossref.org/works/';

class CrossRefService {

    /**
     * Constructor for CrossRefService object
     *
     * @param {Object} app   Express app; contains configuration
     */
    constructor(app) {

        this.mailto = app.conf.mailto;

    }

    /**
     * Request crossRef metadata from API via
     *
     * @param  {string}    doi     doi
     * @param  {Object}    request original request object
     * @return {BBPromise}         Promise for metadata from CrossRef
     */
    doi(doi, request) {
        request.logger.log('debug/other', 'Making request to CrossRef REST API works with doi');

        if (!doi || typeof doi !== 'string') {
            BBPromise.reject('No DOI in argument');
        }

        const encodedDOI = encodeURIComponent(doi);
        const doiUrl = url + encodedDOI;
        let qs = null;

        // Suppling mailto as a query parameter gets us the "polite" level of service,
        // which has better reliability. See:
        // https://github.com/CrossRef/rest-api-doc#meta
        if (this.mailto) {
            qs = { mailto: this.mailto };
        }

        const requestOptions = {
            uri: doiUrl,
            headers: {
                'User-Agent': this.userAgent
            },
            qs,
            qsStringifyOptions: { // Prevent email from being URL encoded
                encode: false
            }
        };

        // Make request to crossref
        return request.issueRequest(requestOptions).then((res) => {
            if (res && res.status === 200 && res.body.status && res.body.status === 'ok') {
                return res.body.message;
            } else {
                return BBPromise.reject(`No results for doi ${doi}`);
            }
        });

    }

    /**
     * Request crossRef metadata from API via any input
     *
     * @param  {string}    any     any part of a citation, i.e. title or full citation
     * @param  {Object}    request original request object
     * @return {BBPromise}         Promise for metadata from CrossRef
     */
    search(any, request) {
        request.logger.log('debug/other', 'Making request to CrossRef REST API with search query');

        any = encodeURIComponent(any);

        const qs = {
            query: any,
            rows: 1 // Temporarily only request a single result
        };

        // Suppling mailto as a query parameter gets us the "polite" level of service,
        // which has better reliability. See:
        // https://github.com/CrossRef/rest-api-doc#meta
        if (this.mailto) {
            qs.mailto = this.mailto;
        }

        const requestOptions = {
            uri: url,
            qs,
            qsStringifyOptions: { // Prevent email from being URL encoded
                encode: false
            }
        };

        // Make request to crossref
        return request.issueRequest(requestOptions).then((res) => {
            if (res && res.status === 200 && res.body.status && res.body.status === 'ok'
                && res.body['message-type'] === 'work-list' && res.body.message
                && res.body.message.items && Array.isArray(res.body.message.items)
                && res.body.message.items.length > 0) {
                return res.body.message.items[0]; // For now, only return one result
            } else {
                return BBPromise.reject(`No results for search string ${any}`);
            }
        });

    }

}

module.exports = CrossRefService;
