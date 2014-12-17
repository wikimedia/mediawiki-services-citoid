#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Requests and sanity checks the response from PubMed's API
 */

(function() {

    var request = require('request'),
    	bunyan = require('bunyan'),
    	log = bunyan.createLogger({name: "citoid"});

	/**
	 * Requests a PubMed object using any supported identifier
	 * @param  {String}   identifier Valid PubMed identifier (PMID, PMCID, Manuscript ID, versioned ID)
	 * @param  {Function} callback   callback (error, object)
	 */
	var pubMedRequest = function (identifier, callback){
        var escapedId = encodeURIComponent(identifier),
        	url = "http://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?tool=citoid&email=citoid@mediawiki&format=json&ids=" + escapedId;

		request(url, function(error, response, body){
			log.info("PubMed query made for: " + url);
			if (error) {
				log.error(error);
				callback(error, null);
			} else if (response.statusCode !== 200) {
				log.error("Unexpected HTTP status code: " + response.statusCode);
				callback("Unexpected HTTP status code: " + response.statusCode, null);
			} else {
				var jsonObj;
				try {
					jsonObj = JSON.parse(body);
				} catch (error) {
					log.info("Original response: " + body);
					log.error("JSON parse error: " + error);
					callback("JSON parse error: " + error, null);
				}

				if (jsonObj){
					if (jsonObj.status !== 'ok'){
						log.error("Unexpected status from PubMed API: " + jsonObj.status);
						callback("Unexpected status from PubMed API: " + jsonObj.status, null);
					} else if (jsonObj.records.length === 0){
						log.error("No records from PubMed API");
						callback("No records from PubMed API", null);
					} else {
						callback(null, jsonObj);
					}
				}
			}
		});
	};

    module.exports = pubMedRequest;

}());

