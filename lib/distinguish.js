#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Distinguishes between different search contents, such as
 * URL or DOI, and sends to appropriate request handler.
 */

/* Import Modules */
var urlParse = require('url'),
	requestFromURL = require('./requests.js').requestFromURL,
	requestFromDOI = require('./requests.js').requestFromDOI,
	requestFromPubMedID = require('./requests.js').requestFromPubMedID;

/**
 * Determine type of string (doi, url) and callback on correct handler
 * @param  {String}   searchString what the end user searched for
 * @param  {Function} callback     callback(extractedValue, correctFunction)
 */
var distinguish = function (searchString, callback){
	var search, reDOI, rePMID, rePMCID, rePMCID2, parsedURL,
		matchDOI, matchPMID, matchPMCID;

	searchString.trim();

	search = searchString;

	reDOI = new RegExp('\\b10[.][0-9]{4,}[//].*\\b');
	rePMID = new RegExp('^\\d{8}\\b');
	rePMCID = new RegExp('\\bPMC\\d{7}\\b');
	rePMCID2 = new RegExp('^\\d{7}\\b');

	matchDOI = search.match(reDOI);
	matchPMID = search.match(rePMID);
	matchPMCID = search.match(rePMCID);

	if (matchDOI) {
		callback(matchDOI[0], requestFromDOI);
	} else if (matchPMID) {
		callback(matchPMID[0], requestFromPubMedID);
	} else if (matchPMCID) {
		callback(matchPMCID[0], requestFromPubMedID);
	} else {
		matchPMCID = search.match(rePMCID2);
		if (matchPMCID) {
			callback('PMC' + matchPMCID[0], requestFromPubMedID);
		} else {
			parsedURL = urlParse.parse(search);
			if (!parsedURL.protocol){
				search = 'http://'+ search;
			}
			callback(search, requestFromURL); //assume url if not doi
		}
	}
};

/*Test methods in main */
if (require.main === module) {
	distinguish("example.com", function (extracted, selectedFcn){
		var expected = requestFromURL;
		console.log("Matches expected: " + (expected === selectedFcn));
	});
}

/* Exports */
module.exports = {
	distinguish: distinguish
};
