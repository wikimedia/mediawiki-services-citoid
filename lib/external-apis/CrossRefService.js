'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to the CrossRef REST API
 * https://github.com/CrossRef/rest-api-doc
 */

/* Import Modules */
const BBPromise = require('bluebird');
const preq = require('preq');

class CrossRefService {

    /**
    * Constructor for WorldCatService object
    * @param {Object} app   Express app; contains logger, metrics, and configuration
    */
    constructor(app) {

        this.logger = app.logger;
        this.stats = app.metrics;
        this.userAgent = app.conf.userAgent;
        this.mailto = app.conf.mailto;

    }

    doiRequest(doi) {
        this.logger.log('debug/other', 'Making request to CrossRef REST API works with doi');

        if (!doi || typeof doi !== 'string') {
            BBPromise.reject('No DOI in argument');
        }

        const encodedDOI = encodeURIComponent(doi);
        const url = `https://api.crossref.org/v1/works/${encodedDOI}`;
        let qs = null;

        // Suppling mailto as a query parameter gets us the "polite" level of service,
        // which has better reliability. See:
        // https://github.com/CrossRef/rest-api-doc#meta
        if (this.mailto) {
            qs = { mailto: this.mailto };
        }

        const requestOptions = {
            uri: url,
            headers: {
                'User-Agent': this.userAgent
            },
            qs,
            qsStringifyOptions: { // Prevent query strings from being URL encoded
                encode: false
            }
        };

        // Make request to WorldCat xisbn service
        return preq(requestOptions).then((res) => {
            if (res && res.status === 200 && res.body.status && res.body.status === 'ok') {
                return res.body.message;
            } else {
                return BBPromise.reject(`No results for doi ${doi}`);
            }
        });

    }

}

module.exports = CrossRefService;
