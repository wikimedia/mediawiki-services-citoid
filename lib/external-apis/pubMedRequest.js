'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Requests and sanity checks the response from PubMed's API
 */

const preq = require('preq');
const BBPromise = require('bluebird');

/**
 * Requests a PubMed object using any supported identifier
 *
 * @param  {string}  identifier  Valid PubMed identifier (DOI, PMID, PMCID with PMC prefix,
 *                               Manuscript ID, versioned ID)
 * @param  {string}  userAgent   the User-Agent header to use
 * @param  {Object}  logger      logger object with log() method
 * @return {Object}              BBPromise for response
 */
function pubMedRequest(identifier, userAgent, logger) {
    if (!identifier) {
        return BBPromise.reject('No identifier in request');
    }
    const escapedId = encodeURIComponent(identifier);
    // TODO: Make url configurable
    const url = `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?tool=citoid&email=citoid@mediawiki&format=json&ids=${escapedId}`;

    return preq({
        uri: url,
        headers: {
            'User-Agent': userAgent
        }
    }).then((response) => {
        let message;
        const body = response.body;
        logger.log('debug/pubmed', `PubMed query made for: ${url}`);
        if (response.status !== 200) {
            message = `Unexpected HTTP status code: ${response.statusCode}`;
            logger.log('warn/pubmed', message);
            return BBPromise.reject(message);
        } else if (body.status !== 'ok') {
            message =  `Unexpected status from PubMed API: ${body.status}`;
            logger.log('warn/pubmed', message);
            return BBPromise.reject(message);
        } else if (body.records.length === 0) {
            message = "No records from PubMed API";
            logger.log('warn/pubmed', message);
            return BBPromise.reject(message);
        } else {
            return body;
        }
    })
    .catch((error) => {
        logger.log('warn/pubmed', error);
        return BBPromise.reject(error);
    });
}

module.exports = pubMedRequest;


