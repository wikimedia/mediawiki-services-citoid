'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Requests and sanity checks the response from PubMed's API
 */

var preq = require('preq');
var BBPromise = require('bluebird');
var parseCOinS = require('html-metadata').parseCOinSTitle;

/**
 * Requests a parsed rtf (citation) object from crossref given a doi
 * @param  {String}   doi      Valid PubMed identifier (PMID, PMCID, Manuscript ID, versioned ID)
 * @param  {Object}   logger   logger object with log() method
 * @return {Object}            BBPromise for parsed rft object
 */
var crossRefRequest = function (doi, logger){
	if (!doi || !logger){
		return BBPromise.reject('Invalid arguments');
	}
	var message;
	var urlEncodedDOI = encodeURIComponent(doi);
	var url = "http://search.crossref.org/dois?q=" + urlEncodedDOI;

	return preq(url).then(function(response){
		var body = response.body;
		if (response.status !== 200) {
			message = "Unexpected HTTP status code: " + response.status;
			return BBPromise.reject(message);
		} else {
			if (!body || !Array.isArray(body) || !body.length || !body[0].coins){
				message = "No citation metadata from crossRef";
				return BBPromise.reject(message);
			} else {
				// API returns fuzzy results, so ensure the first citation corresponds to correct doi
				if (body[0].doi !== 'http://dx.doi.org/' + doi){
					return BBPromise.reject('DOI in return crossRef citation does not match requested doi:' + doi);
				}
				return parseCOinS(body[0].coins).then(function(metadata){
					if (metadata.rft){
						return metadata.rft;
					} else {
						return BBPromise.reject('No citation object in coins metadata');
					}
				});
			}
		}
	})
	.catch(function(error){
		logger.log('warn/crossref', error);
		return BBPromise.reject(error);
	});
};

module.exports = crossRefRequest;



