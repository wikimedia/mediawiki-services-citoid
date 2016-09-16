'use strict';

/**
 * Handles requests to the citoid service
 */

/* Import Modules */
var BBPromise = require('bluebird');
var crypto = require('crypto');
var dns = BBPromise.promisifyAll(require('dns'));
var ip = require('ip');
var net = require('net');
var preq = require('preq');
var urlParse = require('url');

/* Import Local Modules */
var CitoidRequest = require('./CitoidRequest.js');
var hostIsAllowed = require('./hostIsAllowed').hostIsAllowed;
var AddressError = require('./hostIsAllowed').AddressError;
var pubMedRequest = require('./pubMedRequest.js');
var unshorten = require('./unshorten.js');
var ZoteroService = require('./ZoteroService.js');

var Translator = require('./Translator.js');
var Scraper = require('./Scraper.js');
var Exporter = require('./Exporter.js');
var JSONReader = require('./JSONReader.js');

/**
 * Constructor for CitoidService object
 * @param {Object} app   Express object containing logger, stats, conf
 */
function CitoidService(app) {

    this.userAgent = app.conf.userAgent;
    this.logger = app.logger;
    this.stats = app.metrics;
    this.conf = app.conf;

    this.zoteroService = new ZoteroService(app);
    this.exporter = new Exporter(app); // Exports internal format (zotero) to other formats (i.e., mediawiki)

    this.translator = new Translator(app); // Provides translation functions for following Objs
    this.scraper = new Scraper(app, this.translator); // Loads html and scrapes it
    this.json = new JSONReader(app, this.translator); // Translates from JSON utilising services

    // Create circular references
    this.zoteroService.exporter = this.exporter;
    this.scraper.exporter = this.exporter;
    this.exporter.zoteroService = this.zoteroService;

}

/**
 * Requests to the citoid service
 * @param   {Object}   cr     CitoidRequest object
 * @returns {Object}          BBPromise for CitoidRequest object
 */
CitoidService.prototype.request = function(cr) {

    var logger = this.logger;

    return this.addResponseFunction(cr).then(function(cr){
        return cr.getResponse(cr).then(cr.fillBody.bind(cr), cr.fillBody.bind(cr));
    }, cr.fillBody.bind(cr)).catch(function(e){
        logger.log('debug/citoidRequest', e);
    });
};

/**
 * Promise for adding correct response function given input type
 * @param  {Object}   cr     CitoidRequest object with new getResponse function added as a property
 * @return {Object}          BBPromise object for modified CitoidRequest object from input
 */
CitoidService.prototype.addResponseFunction = BBPromise.method(function(cr){
    var xisbn = this.conf.xisbn; // Bool determining whether worldcat xisbn use is enabled
    var url;
    var reISBN;
    var self = this;
    var search = cr.search;
    var lowerSearch = search.toLowerCase();
    var parsedURL = urlParse.parse(lowerSearch); // Parse search field as if it is a url

    // Set protocol to http if it is missing, and re-parse url
    if (!parsedURL.protocol){
        url = 'http://'+ lowerSearch;
        parsedURL = urlParse.parse(url);
    }

    // Remove query string from parsed url and re-generate string url
    parsedURL.query = null;
    parsedURL.search = null;
    url = urlParse.format(parsedURL);

    // Regex fields
    var reHTTP = new RegExp('^((https?)://.+\\..+)'); // Assumes all strings with http/s protocol are URLs
    var reWWW = new RegExp('^((www)\\..+\\..+)'); // Assumes all strings with www substring are URLs
    var reDOI = new RegExp('\\b10\\.[0-9]{3,5}(?:[.][0-9]+)*/.*');
    if (xisbn) {
        reISBN = new RegExp('((?:978[\\--– ])?[0-9][0-9\\--– ]{10}[\\--– ][0-9xX])|((?:978)?[0-9]{9}[0-9Xx])', 'g'); // Used for detecting matches only, not selecting.
    }
    var matchHTTP = search.match(reHTTP);
    var matchWWW = search.match(reWWW);

    // Look for DOI in URL with query string removed or original search parameter
    var matchDOI = url.match(reDOI) || lowerSearch.match(reDOI);

    if (matchDOI && matchDOI[0]) { cr.doi = matchDOI[0]; }

    function foundURI(){
        cr.idType = 'url';
        cr.getResponse = self.requestFromURL.bind(self);
        self.stats.increment('input.' + cr.idType);
        return cr;
    }

    if (matchHTTP || matchWWW){
        cr.idValue = matchHTTP ? encodeURI(matchHTTP[0]) : 'http://' + encodeURI(matchWWW[0]);
        return foundURI();
    }

    if (matchDOI) {
        cr.idType = 'doi';
        cr.idValue = matchDOI[0];
        cr.getResponse = this.requestFromDOI.bind(this);
        this.stats.increment('input.' + cr.idType);
        return cr;
    }

    var rePMID = new RegExp('^\\d{8}\\b');
    var matchPMID = search.match(rePMID);
    if (matchPMID) {
        cr.idType = 'pmid';
        cr.idValue = matchPMID[0];
        cr.getResponse = this.requestFromPM.bind(this);
        this.stats.increment('input.' + cr.idType);
        return cr;
    }

    var rePMCID = new RegExp('\\bPMC\\d{7}\\b');
    var matchPMCID = search.match(rePMCID);
    if (matchPMCID) {
        cr.idType = 'pmcid';
        cr.idValue = matchPMCID[0];
        cr.getResponse = this.requestFromPM.bind(this);
        this.stats.increment('input.' + cr.idType);
        return cr;
    }

    var rePMCID2 = new RegExp('^\\d{7}\\b');
    matchPMCID = search.match(rePMCID2); // Detects PMCIDs with no PMC prefix
    if (matchPMCID) {
        cr.idType = 'pmcid';
        cr.idValue = 'PMC' + matchPMCID[0];
        cr.getResponse = this.requestFromPM.bind(this);
        this.stats.increment('input.' + cr.idType);
        return cr;
    }

    if (xisbn) {
        if (reISBN.test(search)) { // Original isbn match is too lenient; this gets actual isbn more accurately by cleaning out non-numerical characters
            var reDash = new RegExp('[\\-–]', 'g');
            var reISBN2 = new RegExp('((978 ?)[0-9]{10}|[0-9]{9}[0-9xX])', 'g');
            var value = search.trim().replace(reDash, '');
            var match = value.match(reISBN2);
            if (match) {
                var matchISBN2 = match[0];
                matchISBN2 = matchISBN2.replace(/ /g, ''); // Remove any spaces (e.g. 978 0810935310)
                cr.idType = 'isbn';
                cr.idValue =  matchISBN2;
                cr.getResponse = this.requestFromISBN.bind(this);
                this.stats.increment('input.' + cr.idType);
                return cr;
            }
        }
    }

    // Assume url if no other matches are made
    cr.idValue = url;
    return foundURI();

});

/**
 * Promise of requested citation metadata from an ISBN. Uses worldcat xISBN service.
 * TODO: Use IP address and Key/Secret if params are set in congfig.yaml
 * @param  {Object}   cr     CitoidRequest object with new getResponse function added as a property
 * @return {Object}          BBPromise object for modified CitoidRequest object from input
 */
CitoidService.prototype.requestFromISBN = function(cr) {
    var isbnLink = 'http://xisbn.worldcat.org/webservices/xid/isbn/'+ cr.idValue;
    var citoidService = this;

    var query = { // Basic query parameters
        method: 'getMetadata',
        format: 'json',
        fl:'*'
    };

    // Add additional query parameters if xISBN secret, token and IP are present; for subscription service only
    // See: http://xisbn.worldcat.org/xisbnadmin/doc/api.htm#subscription
    if (this.conf.xisbnSecret && this.conf.xisbnToken && this.conf.xisbnIP){
        query.token = this.conf.xisbnToken;
        query.hash = crypto.createHash('md5').update(isbnLink + "|" + this.conf.xisbnIP + "|" + this.conf.xisbnSecret).digest('hex');
    }

    var requestOptions = {
        url : isbnLink,
        headers: {
            'User-Agent': this.userAgent
        },
        qs: query
    };

    // Set responses if below is rejected
    function reject(citoidResponse){
        var message = 'Unable to retrieve data from ISBN ' + citoidResponse.idValue;
        var error = {Error: message};
        citoidService.logger.log('debug/ISBN', message);
        citoidResponse.response.error = error;
        citoidResponse.response.responseCode = 404;
        return citoidResponse;
    }

    // Make request to WorldCat xisbn service
    return preq(requestOptions).then(
        function (res) {
            res.body = JSON.parse(res.body);
            if (res && res.status === 200 && res.body.stat === 'ok') {
                cr.response.source.push('WorldCat'); // Add WorldCat as a source of the metadata
                return citoidService.scrapeJSON(cr, res.body);
            } else {
                return reject(cr);
            }
        },
        // Preq rejection handler
        function(res){
            return reject(cr);
        }
    );

};

/**
 * Promise of requested citation metadata from a URL
 * @param  {Object}   cr     CitoidRequest object with new getResponse function added as a property
 * @return {Object}          BBPromise object for modified CitoidRequest object from input
 */
CitoidService.prototype.requestFromURL = function(cr) {

    if (!cr.url){
        if (cr.idType === 'url'){
            cr.url = cr.idValue;
        } else {
            return BBPromise.reject('No url in citoid request object');
        }
    }

    var self = this;

    return hostIsAllowed(cr.url, self.conf, self.logger, true)
    .then(function() {
        var logger = self.logger;
        var zoteroWebRequest = self.zoteroService.zoteroWebRequest.bind(self.zoteroService);
        var requestedURL = cr.url;
        var format = cr.format;

        var prom = zoteroWebRequest(cr);

        function onResolve(cr){
            logger.log('debug/zotero', "Successfully retrieved body from Zotero");
            cr.response.source.push('Zotero'); // Add Zotero as a source of the metadata
            return cr;
        }

        function onReject(response){
            logger.log('trace/zotero', "No Zotero translator found, looking for redirects");
            // Try again following all redirects-
            // We don't do this initially because many sites
            // will redirect to a log-in screen
            return unshorten(requestedURL, self.userAgent, cr.jar, self.conf, self.logger)
                .then(function(expandedURL) {
                    logger.log('trace/zotero', "Redirect detected to "+ expandedURL);
                    cr.url = expandedURL;
                    return zoteroWebRequest(cr)
                        .then(onResolve,
                            // Rejection handler zoteroWebRequest
                            function(){
                                logger.log('debug/zotero', "No Zotero response available.");
                                cr.url = requestedURL;
                                return self.scrapeHTML(cr);
                            })
                        .catch(function(error){
                            logger.log('warn/zotero', error);
                            self.stats.increment('zotero.req.error');
                        });
                })
                // Rejection handler for unshorten
                .catch(function (error){
                    if (error instanceof AddressError ) {
                        // Catching here results in a log message indicating the error; not sure why.
                        return BBPromise.reject(error);
                    }
                    else {
                        logger.log('debug/zotero', "No redirect detected.");
                        return self.scrapeHTML(cr);
                    }
                });
        }

        return prom
        .then(onResolve, onReject)
        .catch(function(error){
            logger.log('warn/zotero', error);
            self.stats.increment('zotero.req.error');
            return BBPromise.reject(error);
        });

    })
    .catch(function(error){
        // This call is commented out because it results in a 500 Internal Server Error
        self.logger.log('warn/zotero', error.message);
        self.stats.increment('zotero.req.error');
        cr.response.error = {Error: error.message};
        if (error instanceof AddressError) {
            cr.response.responseCode = 400;
        }
        else {
            cr.response.responseCode = 520;
        }
        return cr;
    });

};

/**
 * Promise of citation metadata from a DOI
 * @param  {Object}   cr     CitoidRequest object with doi and format
 * @return {Object}          BBPromise for CitoidRequest object
 */
CitoidService.prototype.requestFromDOI = function(cr) {

    var doi = cr.doi;

    if (doi === undefined) {
        return BBPromise.reject('No doi in citoid request object');
    }

    var doiLink = 'https://dx.doi.org/'+ doi;

    var citoidService = this;
    var urlOpts =  {};
    // Options for obtaining url the DOI resolves to
    var resolveOpts = {
        url : doiLink,
        method: 'head',
        followRedirect : false,
        headers: {
            'User-Agent': this.userAgent
        }
    };

    // Set responses if below is rejected
    function reject(cr){
        var message = 'Unable to resolve DOI ' + doi;
        var error = {Error: message};
        citoidService.logger.log('debug/DOI', message);
        cr.response.error = error;
        cr.response.responseCode = 404;
        return cr;
    }

    // Resolve canonical URL from DOI URL
    return preq(resolveOpts).then(
    // Preq resolve handler
    function (res) {
        if (res && res.status > 300 && res.status < 400 &&
                res.headers.location) {
            cr.url = res.headers.location;
            // Send canonical URL to requestFromURL
            citoidService.logger.log('debug/DOI', "Resolved DOI "
                + doi + " to URL " + cr.url +
                "; Sending to requestFromURL");
            return citoidService.requestFromURL(cr);
        } else {
            return reject(cr);
        }
    },
    // Preq rejection handler
    function(res){
        return reject(cr);
    });
};

/**
 * Requests citation metadata from a PMID or PMCID identifier.
 * @param  {Object}   cr     CitoidRequest object with pm(c)id, type and format
 * @returns {Object}         BBPromise for CitoidRequest object
 */
CitoidService.prototype.requestFromPM = function(cr){
    var e;
    var message;
    var self = this;
    var type = cr.idType;
    var baseURL = 'https://www.ncbi.nlm.nih.gov/';
    var logger = self.logger;
    var zoteroWebRequest = self.zoteroService.zoteroWebRequest.bind(self.zoteroService);
    var format = cr.format;

    switch(type) {
        case 'pmid':
            // Set url in CitoidResponse object for subseqent zoteroWebRequest
            cr.url = baseURL + 'pubmed/' + cr.idValue;
            break;
        case 'pmcid':
            // Set url in CitoidResponse object for subseqent zoteroWebRequest
            cr.url = baseURL + 'pmc/articles/' + cr.idValue + '/';
            break;
        default:
            message = 'Unknown PubMed type: ' + type;
            e = {Error: message};
            logger.log('warn/pubmed', message);
            cr.response.error = e;
            cr.response.responseCode = 404;
            return cr;
    }

    self.logger.log('debug/pubmed', {from: cr.idValue, to: cr.url,
        type: type});

    // Create error and return citoidResponse with error
    function failure(cr){
        message = 'Unable to locate resource with ' + type + ' ' + cr.idValue;
        e = {Error: message};
        cr.response.error = e;
        cr.response.responseCode = 404;
        logger.log('info/pubmed', message);
        return cr;
    }

    // Fallback to pubmed doi translator if Zotero is down or translator not found
    function fallback(cr){
        return pubMedRequest(cr.idValue, self.userAgent, logger).then(function(obj){
            var doi = obj.records[0].doi;
            logger.log('debug/pubmed', "Got DOI " + doi);
            cr.doi = doi;
            if (doi){
                cr.doi = doi;
                cr.response.source.push('PubMed'); // Add PubMed to sources of metadata as we used them to get DOI
                return self.requestFromDOI(cr).catch(function(){
                    return failure(cr);
                });
            } else {
                return failure(cr);
            }
        }, function(){
            return failure(cr);
        });
    }

    function onResolve(cr){
        cr.response.source.push('Zotero'); // Add Zotero as source of metadata
        logger.log('debug/zotero', "Successfully retrieved body from Zotero");
        return cr;
    }

    function onReject(response){
        // Case: Zotero service is unreachable
        if (response && response.status === 504){
            return fallback(cr);
        }
        // Case: Translator for pubmed is not present or is broken
        // TODO: Test
        if (response && response.status === 501){
            return fallback(cr);
        } else {
            return failure(cr);
        }
    }

    return zoteroWebRequest(cr)
    .then(onResolve, onReject)
    .catch(function(error){
        logger.log('warn/zotero', error);
        self.stats.increment('zotero.req.error');
    });


};

/**
 * Scrape and export to Zotero translator if nessecary
 * @param  {Object}   cr     CitoidRequest object
 * @return {Object}          BBPromise for CitoidRequest object
 */
CitoidService.prototype.scrapeHTML = function(cr){
    return this.scraper.scrape(cr);
};

/**
 * Convert JSON into citation - currently takes xisbn JSON only
 * @param  {Object}   cr     CitoidRequest object
 * @param  {Object}   json   Object containing JSON to convert into citation
 * @return {Object}          BBPromise for CitoidRequest object
 */
CitoidService.prototype.scrapeJSON = function(cr, json){
    return this.json.translate(cr, json);
};

module.exports = CitoidService;
