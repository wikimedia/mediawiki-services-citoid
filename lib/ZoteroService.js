'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to a Zotero server
 */

/* Import Modules */
const BBPromise = require('bluebird');
const util = require('util');
const preq = require('preq');

const validateZotero = require('./Exporter.js').validateZotero;


class ZoteroService {


    /**
    * Constructor for CitoidService object
    * @param {Object} app   Express app; contains logger, metrics, and configuration
    */
    constructor(app) {

        this.logger = app.logger;
        this.stats = app.metrics;

        this.exporter = null;

        const baseURL = util.format('http://%s:%s/',
            app.conf.zoteroInterface, app.conf.zoteroPort.toString());
        this.webURL = `${baseURL}web`;
        this.exportURL = `${baseURL}export`;
    }

    /**
    * Promise for requests to Zotero server endpoint /web
    * @param  {Object}   cr       CitoidRequest object
    * @param  {Object}   citation Citation object
    * @return {Object}            BBPromise for response
    */
    zoteroWebRequest(cr, citation) {

        let requestedURL;

        if (citation.url) {
            requestedURL = citation.url;
        } else {
            return BBPromise.reject('No url in Citation object');
        }

        const options = {
            uri: this.webURL,
            method: 'post',
            headers: {
                'content-type': 'text/plain',
                'accept-language': cr.acceptLanguage
            },
            body: requestedURL
        };

        return preq(options).then((response) => {
            this.logger.log('debug/zotero', `Zotero request made for: ${requestedURL}`);
            this.stats.increment(`zotero.req.${Math.floor(response.status / 100)}xx`);
            if (response && response.status === 200) {

                // Zotero ideally should return 501 if there are no citations in the page,
                // but, for example, the PubMed translator is currently broken and
                // returns 200 and empty body for http errors; this block fixes errant
                // responses appropriately by making sure citation is present in body
                if (response.body && Array.isArray(response.body) && response.body[0]) {

                    // Case where response is an Array inside of an Array;
                    if (Array.isArray(response.body[0])) {
                        if (response.body[0][0]) {
                            // Rewrites response.body to be an Array of objects
                            response.body = response.body[0];
                        } else { // Case where body is [[]]
                            return BBPromise.reject('No citation in body');
                        }
                    }

                    // Case where body is an empty object, i.e. [{}] or [[{}]]
                    if (!Object.keys(response.body[0]).length) {
                        return BBPromise.reject('No citation in body');
                    }

                    citation.content = response.body[0];
                    citation.responseCode = 200;

                    // Validate citation
                    citation.content = validateZotero(requestedURL, citation.content);
                    citation.source.push('Zotero');

                    return cr;
                } else {
                    return BBPromise.reject('No citation in body');
                }
            } else { // I.e. 300 response codes
                return BBPromise.reject('Non 200 response from Zotero');
            }
        }, (response) => {
            this.logger.log('debug/zotero', `Zotero request made for: ${requestedURL}`);
            this.stats.increment(`zotero.req.${Math.floor(response.status / 100)}xx`);
            return BBPromise.reject(response);
        });
    }

    /**
    * Request to Zotero server endpoint /export
    * @param   {Object}   citation     Zotero JSON citation to be converted
    * @param   {Object}   format       requested format
    * @return {Object}                 BBPromise for a response
    */
    zoteroExportRequest(citation, format) {
        const options = {
            uri: this.exportURL,
            method: 'POST',
            body: JSON.stringify(citation),
            qs: { format },
            headers: {
                'content-type': 'application/json'
            }
        };
        return preq(options);
    }


}


/* Exports */
module.exports = ZoteroService;

