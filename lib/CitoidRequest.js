'use strict';

/**
 * An object corresponding to each request to the citoid service
 */

var BBPromise = require('bluebird');
var request = require('request');

var CitoidResponse = require('./CitoidResponse.js');

/**
 * Constructor for CitoidRequest object
 * @param {Object} req          raw request object from express
 */
function CitoidRequest(req, app) {

    this.request = req;
    this.logger = req.logger || app.logger;

    this.response = new CitoidResponse(); // Prepare an empty response
    this.getResults = []; // Array of Promises for cr with Citation objects added in response.citations from different kinds of queries (i.e. from PMC or PMID);

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
CitoidRequest.prototype.build = function(){

    // Coerces 'false'-> false, '0'-> false, 'True' ->true, '1'->true, etc
    function getBool(val) {
        if (!val){return false;}
        return !!JSON.parse(String(val).toLowerCase());
    }

    this.acceptLanguage = this.request.headers['accept-language'];
    this.format = encodeURIComponent(this.request.query.format);
    this.search = this.request.query.search;
    if (this.search){this.search=this.search.trim();}
    this.baseFields = getBool(this.request.query.basefields);

    if (this.format === 'mediawiki' && this.baseFields){ // start de-comming basefields paramter in favour of separate type name
        this.format = 'basefields';
    }

};

CitoidRequest.prototype.fillBody = BBPromise.method(function(){
    var cr = this;
    var success = false; // Bool if no citations successfully complete
    var exportPromises = []; // Promises for exported citations

    // Prevent body from accidentally being overwritten
    if (cr.response.body){
        return BBPromise.reject('Body already filled');
    }

    if (!cr.exporter){
        return BBPromise.reject('No exporter registered with citoid service.');
    }

    // Errors that occur before citations are created, i.e. issues with requests
    if (! cr.response.citations || !Array.isArray(cr.response.citations) || cr.response.citations.length < 1){
        cr.response.body = cr.response.error;
        return cr;
    }

    // Create export Promises for each Citation in citations Array
    for(var i = 0; i < cr.response.citations.length; i++){
        if (cr.response.citations[i].responseCode === 200){
            exportPromises.push(
                cr.exporter.export(cr.response.citations[i]).then(function(citation){
                    // Add Citations' exported content to response body
                    if (!citation.error){
                        if (citation.format === 'bibtex'){
                            cr.response.body = (cr.response.body ? cr.response.body : '') + citation.formattedContent;
                        } else {
                            cr.response.body = cr.response.body ? cr.response.body : []; // Create Array if not already an Array
                            cr.response.body.push(citation.formattedContent);
                        }
                        cr.response.responseCode = 200;
                        success = true;
                    }
                    return cr;
                })
            );
        }
    }

    // Wait for all export Promises to complete, then either fill with error or return cr containing successful citations
    return BBPromise.all(exportPromises.map(x => x.reflect())).then(function(){
        // Case: all citation requests failed
        if (!success){
            // Try general error first
            if (cr.response.error && cr.response.responseCode){
                cr.response.body = cr.response.error;
            }
            // Arbitrarily pick first error
            else if (cr.response.citations[0] && cr.response.citations[0].error){
                cr.response.error = cr.response.citations[0].error;
                cr.response.responseCode = cr.response.citations[0].responseCode;
            }
            // Fill body with error, if known
            if (cr.response.error){
                cr.response.body = cr.response.error;
            } else {
                cr.response.body = {Error: 'Unknown error'};
            }
        }
        return cr;
    });
});

CitoidRequest.prototype.getResponse = function(){
    throw new Error('Method getResponse should be overridden');
};


module.exports = CitoidRequest;
