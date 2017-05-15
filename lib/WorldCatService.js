'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to the WorldCat API
 */

/* Import Modules */
var BBPromise = require('bluebird');
var preq = require('preq');


/**
 * Constructor for CitoidService object
 * @param {Object} app   Express app; contains logger, metrics, and configuration
 */
function WorldCatService(app){

    this.logger = app.logger;
    this.stats = app.metrics;
    this.wskey = app.conf.wskey;
    this.xisbn = app.conf.xisbn;
    this.userAgent = app.conf.userAgent;

}

WorldCatService.prototype.indexRequest = BBPromise.method(function(search, type, format){
    this.logger.log('debug/other', 'Making request to WorldCat SRU indexed search service');
    if (!this.wskey){
        return BBPromise.reject('No WSKEY in config');
    }

    var sruLink = 'http://www.worldcat.org/webservices/catalog/search/sru';
    var self = this;
    var recordSchema;
    var query;

    if (format === 'dc'){
        recordSchema = 'info%3Asrw%2Fschema%2F1%2Fdc';
    } else if (format === 'marc'){
        recordSchema = 'info%3Asrw%2Fschema%2F1%2Fmarcxml';
    } else {
        return BBPromise.reject('Requested format must be either "dc" or "marc"');
    }

    if (type === 'isbn'){
        query = 'srw.bn+all+' + search;
    } else if (type === 'oclc'){
        query = 'srw.no+all+' + search;
    } else {
        return BBPromise.reject('Requested type must be either "isbn" or "oclc"');
    }

    var qs = { // Basic query parameters
        query: query, // Don't url encode
        recordSchema: recordSchema, // Already url encoded
        wskey: self.wskey
    };

    var requestOptions = {
        uri : sruLink,
        headers: {
            'User-Agent': self.userAgent
        },
        qs: qs,
        qsStringifyOptions: { // Prevent query strings from being URL encoded
            encode: false
        }
    };

    // Make request to WorldCat xisbn service
    return preq(requestOptions).then(function (res) {
        if (res && res.status === 200) {
            return res.body;
        } else {
            return BBPromise.reject('No results from WorldCat SRU indexed search service');
        }
    });

});

WorldCatService.prototype.openSearchRequest = BBPromise.method(function(search){
    this.logger.log('debug/other', 'Making request to WorldCat Open Search service');
    if (!this.wskey){
        return BBPromise.reject('No WSKEY in config');
    }

    var wskeyFormat = 'openSearch'; // Format the XML citation will come back in. Can be DC, MarcXML, or WorldCat's native openSearch format
    var openSearchLink = 'http://www.worldcat.org/webservices/catalog/search/worldcat/opensearch';
    var self = this;

    var qs = { // Basic query parameters
        q: search,
        wskey: self.wskey
    };

    var requestOptions = {
        uri : openSearchLink,
        headers: {
            'User-Agent': self.userAgent
        },
        qs: qs
    };

    // Make request
    return preq(requestOptions).then(
        function (res) {
            if (res && res.status === 200 ) {
                return res.body;
            } else {
                return BBPromise.reject('No results from WorldCat openSearch');
            }
        }
    );

});

WorldCatService.prototype.singleRecordRequest = BBPromise.method(function(id, type, format){
    this.logger.log('debug/other', 'Making request to WorldCat single record search service for id ' + id);
    if (!this.wskey){
        return BBPromise.reject('No WSKEY in config');
    }

    if (['issn','oclc','isbn'].indexOf(type) < 0){
        return BBPromise.reject('Invalid type requested');
    }

    var self = this;
    var recordSchema;
    var requestToLink = 'http://www.worldcat.org/webservices/catalog/content/';

    // Append requested type to link unless oclc requested
    if (type === 'isbn'){
        requestToLink += 'isbn/';
    }
    if (type === 'issn'){
        requestToLink += 'issn/';
    }

    requestToLink += id; // Append requested identifier to link

    if (format === 'dc'){
        recordSchema = 'info%3Asrw%2Fschema%2F1%2Fdc';
    } else if (format === 'marc'){
        recordSchema = 'info%3Asrw%2Fschema%2F1%2Fmarcxml';
    } else {
        return BBPromise.reject('Requested format must be either "dc" or "marc"');
    }

    // Query parameters
    var qs = {
        recordSchema: recordSchema, // Already url encoded
        wskey: self.wskey
    };

    var requestOptions = {
        uri : requestToLink,
        headers: {
            'User-Agent': self.userAgent
        },
        qs: qs,
        qsStringifyOptions: { // Prevent query strings from being URL encoded
            encode: false
        }
    };

    // Make request
    return preq(requestOptions).then(function (res) {
        if (res && res.status === 200) {
            return res.body;
        } else {
            return BBPromise.reject('No results from WorldCat single record request');
        }
    });

});

WorldCatService.prototype.xisbnRequest = BBPromise.method(function(isbn){
    this.logger.log('debug/ISBN', 'Making request to WorldCat xisbn service');
    var service = this;
    if (!this.xisbn){
        return BBPromise.reject('xisbn disabled in config');
    }

    var isbnLink = 'http://xisbn.worldcat.org/webservices/xid/isbn/'+ isbn;
    var self = this;

    var qs = { // Basic query parameters
        method: 'getMetadata',
        format: 'json',
        fl:'*'
    };

    var requestOptions = {
        uri : isbnLink,
        headers: {
            'User-Agent': self.userAgent
        },
        qs: qs
    };

    // Set responses if below is rejected
    function reject(){
        var message = 'Failure from xisbn service to retrieve data from ISBN ' + isbn;
        service.logger.log('debug/ISBN', message);
        throw new Error(message);
    }

    // Make request to WorldCat xisbn service and return parsed body
    return preq(requestOptions).then(function (res) {
        res.body = JSON.parse(res.body);
        // Must contain at least one entry to be considered a successful request
        if (res && res.status === 200 && res.body.stat === 'ok' && res.body.list && res.body.list[0]) {
            return res.body;
        } else {
            return BBPromise.reject('No results from WorldCat xisbn service');
        }
    });

});

/* Exports */
module.exports = WorldCatService;
