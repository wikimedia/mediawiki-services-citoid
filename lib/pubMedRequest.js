'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Requests and sanity checks the response from PubMed's API
 */

var preq = require('preq');
var BBPromise = require('bluebird');

/**
 * Requests a PubMed object using any supported identifier
 * @param  {String}  identifier  Valid PubMed identifier (PMID, PMCID, Manuscript ID, versioned ID)
 * @param  {String}  userAgent   the User-Agent header to use
 * @param  {Object}  logger      logger object with log() method
 * @return {Object}              BBPromise for response
 */

var pubMedRequest = function (identifier, userAgent, logger){
    if (!identifier){
        return BBPromise.reject('No identifier in request');
    }
    var escapedId = encodeURIComponent(identifier);
    // TODO: Make url configurable
    var url = "http://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?tool=citoid&email=citoid@mediawiki&format=json&ids=" + escapedId;

    return preq({
        url: url,
        headers: {
            'User-Agent': userAgent
        }
    }).then(function(response){
        var message;
        var body = response.body;
        logger.log('debug/pubmed', "PubMed query made for: " + url);
        if (response.status !== 200) {
            message = "Unexpected HTTP status code: " + response.statusCode;
            logger.log('warn/pubmed', message);
            return BBPromise.reject(message);
        } else {
            if (body.status !== 'ok'){
                message =  "Unexpected status from PubMed API: " + body.status;
                logger.log('warn/pubmed', message);
                return BBPromise.reject(message);
            } else if (body.records.length === 0){
                message = "No records from PubMed API";
                logger.log('warn/pubmed', message);
                return BBPromise.reject(message);
            } else {
                return body;
            }
        }
    })
    .catch(function(error){
        logger.log('warn/pubmed', error);
        return BBPromise.reject(error);
    });
};

module.exports = pubMedRequest;



