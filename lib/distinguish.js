#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Distinguishes between different search contents, such as
 * URL or DOI, and sends to appropriate request handler.
 */

var request = require('request');
var urlParse = require('url');
var requestFromURL = require('./requests.js').requestFromURL;
var requestFromDOI = require('./requests.js').requestFromDOI;

/**
 * Determine type of string (doi, url) and callback on correct gandler
 * @param  {[type]}   searchString what the end user searched for
 * @param  {Function} callback     callback(extractedValue, correctFunction)
 */
var distinguish = function (searchString, callback){
	var search, match, reDOI, parsedURL;

	searchString.trim();

	search = searchString;

	reDOI = new RegExp('\\b10[.][0-9]{4,}[//].*\\b');

	match = search.match(reDOI);

	if (match){
		callback(match[0], requestFromDOI);
	} else {
		parsedURL = urlParse.parse(search);
		if (!parsedURL.protocol){
			search = 'http://'+ search;
			callback(search, requestFromURL);
		} else {
			callback(search, requestFromURL); //assume url if not doi
		}
	}
};

module.exports = {
	distinguish: distinguish
};

/*Test methods in main */
if (require.main === module) {

	distinguish("example.com", function (extracted, selectedFcn){
		console.log(extracted);
	});
}