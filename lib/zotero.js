#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to a Zotero server
 */

/* Import Modules */
var request = require('request'),
	async = require('async'),
	util = require('util'),
	pubMedRequest = require('./pubMedRequest.js');

/**
 * Requests to Zotero server endpoint /web
 * @param  {String}   requestedURL url being requested
 * @param  {Object}   opts         options for request
 * @param  {Function} callback     callback(error, response, body)
 */
var zoteroWebRequest = function(requestedURL, opts, callback){
	var options = {
		url: util.format(opts.zoteroURL, 'web'),
		method: 'POST',
		json: {
			"url": requestedURL,
			"sessionid": opts.sessionID
		}
	};

	request(options, function (error, response, body) {
		if (!error && response.statusCode === 200) {
			selectFormatFcn(opts.format, function(convert){
				convert(requestedURL, opts, body, function(modifiedBody){
					callback(error, response, modifiedBody);
				});
			});
		} else {
			callback(error, response, body);
		}

	});
};

/**
 * Request to Zotero server endpoint /export
 * @param  {Object}   citation     Zotero JSON citation to be converted
 * @param  {Object}   opts         options for request
 * @param  {Function} callback     callback(error, responseCode, body)
 */
var zoteroExportRequest = function(citation, opts, callback){
	var options = {
		url: util.format(opts.zoteroURL, 'export'),
		method: 'POST',
		body: JSON.stringify([citation]),
		qs: {format: opts.format},
		headers: {
			'content-type': 'application/json'
		}
	};

	request.post(options, function(error, response, body) {
		if (error){
			callback(error, null, body);
		} else {
			callback(null, response.statusCode, body);
		}
	});
};

/**
 * Selects the format function given format string
 * @param  {String}   format   string describing format
 * @param  {Function} callback callback(desiredFunctionHere)
 */
var selectFormatFcn = function (format, callback){
	var formatFcns = {
		'mwDeprecated':convertToMWDeprecatedAsync,
		'mediawiki':convertToMediawikiAsync,
		'zotero':convertToZoteroAsync,
		'bibtex':convertToBibtexAsync
		};
	callback(formatFcns[format]);
};

/* Specific Conversion Methods */

/**
 * Takes Zotero output and standardises it
 * @param  {String}   url      URL provided by user
 * @param  {Object}   opts     opts object for Zotero requests
 * @param  {Array}    body     Array of citation objects
 * @param  {Function} callback callback(arrayOfCitationObjs)
 */
var convertToZoteroAsync = function (url, opts, body, callback){
	var citation = body[0];
	if (citation instanceof Array){
		citation = citation[0];
	}

	async.waterfall([
		function(cb){ //this function exists to pass url to fixURLAsync
			cb(null, url, citation);
		},
		fixURL, //must go directly after unnamed function that hands it url
		fixAccessDate
	], function (err, citation) {
		callback([citation]);
	});

};

/**
 * Takes Zotero output, standardises, and exports to BibTex
 * @param  {String}   url      URL provided by user
 * @param  {Object}   opts     opts object for Zotero requests
 * @param  {Array}    body     Array of citation objects
 * @param  {Function} callback callback(arrayOfCitationObjs)
 */
var convertToBibtexAsync = function(url, opts, body, callback){
	var citation = body[0];
	if (citation instanceof Array) {
		citation = citation[0];
	}

	async.waterfall([
		function(cb){ //this function exists to pass url to fixURLAsync
			cb(null, url, citation);
		},
		fixURL, //must go directly after unnamed function that hands it url
		fixAccessDate,
		function(citation, cb){
			zoteroExportRequest(citation, opts, function(error, responseCode, body){
				cb(error, body);
			});
	}], function (err, citation) {
		callback(citation);
	});

};

/**
 * Takes Zotero output and converts to 'mediawiki' format
 * @param  {String}   url      URL provided by user
 * @param  {Object}   opts     opts object for Zotero requests
 * @param  {Array}    body     Array of citation objects
 * @param  {Function} callback callback(arrayOfCitationObjs)
 */
var convertToMediawikiAsync = function (url, opts, body, callback){
	var citation = body[0];
	if (citation instanceof Array){
		citation = citation[0];
	}

	async.waterfall([
		function(cb){ //this function exists to pass url to fixURLAsync
			cb(null, url, citation);
		},
		fixURL, //must go directly after unnamed function that hands it url
		fixAccessDate,
		replaceCreators,
		addPubMedIdentifiers,
		fixISBN,
		fixISSN
	], function (err, citation) {
		callback([citation]);
	});

};

/**
 * Takes Zotero output and converts to 'mwDeprecated' format
 * @param  {String}   url      URL provided by user
 * @param  {Object}   opts     opts object for Zotero requests
 * @param  {Array}    body     Array of citation objects
 * @param  {Function} callback callback(arrayOfCitationObjs)
 */
var convertToMWDeprecatedAsync = function (url, opts, body, callback){
	var zotCreators, creatorFieldName,
		creatorTypeCount = {},
		citation = body[0];
	if (citation instanceof Array){
		citation = citation[0];
	}

	async.waterfall([
		function(cb){ //this function exists to pass url to fixURLAsync
			cb(null, url, citation);
		},
		fixURL, //must go directly after unnamed function that hands it url
		function(citation, cb){ //function to fix creators to mwdeprecated format
			if (citation.creators) {
				zotCreators = citation.creators;

				for (var z in zotCreators){
					creatorFieldName = zotCreators[z].creatorType;
					if (creatorTypeCount[creatorFieldName]){
						creatorTypeCount[creatorFieldName] += 1;
					} else {
						creatorTypeCount[creatorFieldName] = 1;
					}
					//Appends number to name, i.e. author -> author1
					creatorFieldName += (parseInt(creatorTypeCount[creatorFieldName]));

					citation[creatorFieldName + "-first"] = zotCreators[z].firstName;
					citation[creatorFieldName + "-last"] = zotCreators[z].lastName;
				}
				delete citation.creators; //remove creators field
			}
			cb(null, citation);
		},
		fixAccessDate,
		replaceCreators,
		addPubMedIdentifiers,
		fixISBN,
		fixISSN
	], function (err, citation) {
		callback([citation]);
	});

};

/* Methods for Particular Fields in Citation Object*/

/**
 * Remove creators and add 2D array of fname, lname keyed by creatorType
 * Used to convert to 'mediawiki' format
 * @param  {Object}   citation     citation object
 * @param  {Function} callback     callback on citation object
 */
var replaceCreators = function(citation, callback){
	if (citation.creators) {
		var creatorArray, creatorFieldName,
			zotCreators = citation.creators;

		for (var z in zotCreators){
			creatorFieldName = zotCreators[z].creatorType;

			if (!citation[creatorFieldName]){
				creatorArray = [];
				citation[creatorFieldName]= creatorArray;
			}

			citation[creatorFieldName].push([zotCreators[z].firstName, zotCreators[z].lastName]);
		}

		delete citation.creators; //remove creators field
	}
	callback(null, citation);
};

/**
 * Add PMID and PMCID fields from the extra field or through DOI lookup
 * @param  {Object}   citation citation object to add PMID
 * @param  {Function} callback callback (error, citation)
 */
var addPubMedIdentifiers = function(citation, callback){
	if (citation.extra) {
		//get pmid from extra fields
		var extraFields = citation.extra.split('\n');
		for (var f in extraFields) {
			//could add them all, but let's not do this in case of conflicting fields
			var keyValue = extraFields[f].split(': ');
			if (keyValue[0] === 'PMID' || keyValue[0] === 'PMCID') {
				citation[keyValue[0]] = keyValue[1].trim().replace('PMC','');
			}
		}
	}

	if (!citation.PMID && citation.DOI) {
		//if pmid is not found, lookup the pmid using the DOI
		pubMedRequest(citation.DOI, function (error, object){
			if (!error) { //don't pass along error as it's non-critical, and will halt the waterfall
				if (object.records[0].pmid){
					citation['PMID'] = object.records[0].pmid;
				}
				if (object.records[0].pmcid) {
					citation['PMCID'] = object.records[0].pmcid.replace('PMC','');
				}
			}
			callback(null, citation);
		});
	} else {
		//if we add another async function, use async.series
		callback(null, citation);
	}
};

/**
 * Add URL provided by user if none in Zotero response
 * @param  {String}   url      url provided by user
 * @param  {Object}   citation citation object to add PMID
 * @param  {Function} callback callback (error, citation)
 */
var fixURL = function(url, citation, callback){
	if (!citation.url){
		citation.url = url;
	}
	callback(null, citation);
};

/**
 * Replace Zotero output of CURRENT_TIMESTAMP with ISO time
 * @param  {Object}   citation     citation object
 * @param  {Function} callback     callback on citation object
 */
var fixAccessDate = function(citation, callback){
	if (!citation.accessDate || (citation.accessDate === "CURRENT_TIMESTAMP")){
		citation.accessDate = (new Date()).toISOString().substring(0, 10);
	}
	callback(null, citation);
};

/**
 * Convert String of ISSNs into an Array of ISSNs
 * @param  {Object}   citation     citation object
 * @param  {Function} callback     callback on citation object
 */
var fixISSN = function(citation, callback){
	var match, i, reISSN,
		issn = citation.ISSN;

	reISSN = new RegExp('\\d{4}\\-\\d{3}[\\dX]', 'g');

	if (issn){
		issn.trim();
		match = issn.match(reISSN);
		if (match) {
			citation.ISSN = [];
			for (i in match){
				citation.ISSN.push(match[i]);
			}
		} else {
			citation.ISSN = [issn]; //wraps issn field in array in case of false negatives
		}
	}
	callback(null, citation);
};

/**
 * Convert String of ISBNs into an Array of ISBNs
 * @param  {Object}   citation     citation object
 * @param  {Function} callback     callback on citation object
 */
var fixISBN = function(citation, callback){
	var match, i, reISBN,
		isbn = citation.ISBN;

	reISBN = new RegExp('((978[\\--– ])?[0-9][0-9\\--– ]{10}[\\--– ][0-9xX])|((978)?[0-9]{9}[0-9Xx])', 'g');

	if (isbn) {
		isbn.trim();
		match = isbn.match(reISBN);
		if (match) {
			citation.ISBN = [];
			for (i in match){
				citation.ISBN.push(match[i]);
			}
		} else {
			citation.ISBN = [isbn]; //wraps isbn field in array in case of false negatives
		}
	}
	callback(null, citation);
};

/* Test response alterations without having to use server */
var testJSON = function(){
	var sampleBody = require("../test_files/4_input.json");
	console.log("before:");
	console.log(JSON.stringify(sampleBody));
	console.log("after:");
	selectFormatFcn("mwDeprecated", function(convert){
		convert("http://example.com", null, sampleBody, function(modifiedBody){
			console.log(JSON.stringify(modifiedBody));
		});
	});

	//test PMID lookup
	addPubMedIdentifiers({"DOI": "10.1371/journal.pcbi.1002947"}, function (error, modifiedCitation){
		console.log("Test lookup of PMID by DOI: PMID=" + modifiedCitation.PMID + ", PMCID=" + modifiedCitation.PMCID);
		console.log("Expected: PMID=23555203, PMCID=PMC3605911");
	});
};

/* Test methods in main */
if (require.main === module) {
	testJSON();
}

/* Exports */
module.exports = {
	zoteroWebRequest: zoteroWebRequest,
    zoteroExportRequest: zoteroExportRequest
};

