'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to the WorldCat API
 */

/* Import Modules */
const BBPromise = require('bluebird');
const preq = require('preq');


class WorldCatService {

    /**
    * Constructor for WorldCatService object
    * @param {Object} app   Express app; contains logger, metrics, and configuration
    */
    constructor(app) {

        this.logger = app.logger;
        this.stats = app.metrics;
        this.wskey = app.conf.wskey;
        this.userAgent = app.conf.userAgent;

    }

    indexRequest(search, type, format) {
        this.logger.log('debug/other', 'Making request to WorldCat SRU indexed search service');
        if (!this.wskey) {
            return BBPromise.reject('No WSKEY in config');
        }

        const sruLink = 'http://www.worldcat.org/webservices/catalog/search/sru';
        let recordSchema;
        let query;

        if (format === 'dc') {
            recordSchema = 'info%3Asrw%2Fschema%2F1%2Fdc';
        } else if (format === 'marc') {
            recordSchema = 'info%3Asrw%2Fschema%2F1%2Fmarcxml';
        } else {
            return BBPromise.reject('Requested format must be either "dc" or "marc"');
        }

        if (type === 'isbn') {
            query = `srw.bn+all+${search}`;
        } else if (type === 'oclc') {
            query = `srw.no+all+${search}`;
        } else {
            return BBPromise.reject('Requested type must be either "isbn" or "oclc"');
        }

        const qs = { // Basic query parameters
            query, // Don't url encode
            recordSchema, // Already url encoded
            wskey: this.wskey
        };

        const requestOptions = {
            uri: sruLink,
            headers: {
                'User-Agent': this.userAgent
            },
            qs,
            qsStringifyOptions: { // Prevent query strings from being URL encoded
                encode: false
            }
        };

        // Make request to WorldCat service
        return preq(requestOptions).then((res) => {
            if (res && res.status === 200) {
                return res.body;
            } else {
                return BBPromise.reject('No results from WorldCat SRU indexed search service');
            }
        });

    }

    openSearch(search) {
        this.logger.log('debug/other', 'Making request to WorldCat Open Search service');
        if (!this.wskey) {
            return BBPromise.reject('No WSKEY in config');
        }

        const openSearchLink = 'http://www.worldcat.org/webservices/catalog/search/worldcat/opensearch';

        const qs = { // Basic query parameters
            q: search,
            wskey: this.wskey
        };

        const requestOptions = {
            uri: openSearchLink,
            headers: {
                'User-Agent': this.userAgent
            },
            qs
        };

        // Make request
        return preq(requestOptions).then(
            (res) => {
                if (res && res.status === 200) {
                    return res.body.toString();
                } else {
                    return BBPromise.reject('No results from WorldCat openSearch');
                }
            }
        );

    }

    singleRecordRequest(id, type, format) {
        this.logger.log('debug/other',
            `Making request to WorldCat single record search service for id ${id}`);
        if (!this.wskey) {
            return BBPromise.reject('No WSKEY in config');
        }

        if (['issn','oclc','isbn'].indexOf(type) < 0) {
            return BBPromise.reject('Invalid type requested');
        }

        let recordSchema;
        let requestToLink = 'http://www.worldcat.org/webservices/catalog/content/';

        // Append requested type to link unless oclc requested
        if (type === 'isbn') {
            requestToLink += 'isbn/';
        }
        if (type === 'issn') {
            requestToLink += 'issn/';
        }

        requestToLink += id; // Append requested identifier to link

        if (format === 'dc') {
            recordSchema = 'info%3Asrw%2Fschema%2F1%2Fdc';
        } else if (format === 'marc') {
            recordSchema = 'info%3Asrw%2Fschema%2F1%2Fmarcxml';
        } else {
            return BBPromise.reject('Requested format must be either "dc" or "marc"');
        }

        // Query parameters
        const qs = {
            recordSchema, // Already url encoded
            wskey: this.wskey
        };

        const requestOptions = {
            uri: requestToLink,
            headers: {
                'User-Agent': this.userAgent
            },
            qs,
            qsStringifyOptions: { // Prevent query strings from being URL encoded
                encode: false
            }
        };

        // Make request
        return preq(requestOptions).then((res) => {
            if (res && res.status === 200) {
                return res.body;
            } else {
                return BBPromise.reject('No results from WorldCat single record request');
            }
        });

    }

}


/* Exports */
module.exports = WorldCatService;
