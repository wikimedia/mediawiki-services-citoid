#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to a Zotero server
 */

var request = require('request');
var async = require('async');
var pubMedRequest = require('./pubMedRequest.js');

/**
 * Requests to Zotero server
 * @param  {String}   requestedURL url being requested
 * @param  {Object}   opts         options for request
 * @param  {Function} callback     callback(error, response, body)
 */
var zoteroRequest = function(requestedURL, opts, callback){
	var options = {
		url: opts.zoteroURL,
		method: 'POST',
		json: {
			"url": requestedURL,
			"sessionid": opts.sessionID
		}
	};

	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			selectFormatFcn(opts.format, function(convert){
				convert(requestedURL, body, function(modifiedBody){
					callback(error, response, modifiedBody);
				});
			});
		} else {
			callback(error, response, body);
		}

	});
};

/*Picks fcn given format*/
var selectFormatFcn = function (format, callback){
	var formatFcns = {
		'mwDeprecated':convertToMWDeprecatedAsync,
		'mediawiki':convertToMediawikiAsync,
		'zotero':convertToZoteroAsync
		};
	callback(formatFcns[format]);
};

/*Specific conversion methods*/
var convertToZoteroAsync = function (url, body, callback){
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

var convertToMediawikiAsync = function (url, body, callback){
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

var convertToMWDeprecatedAsync = function (url, body, callback){
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

/*Methods for particular fields-
* Targets Mediawiki format if not otherwise specified
*/

var replaceCreators = function(citation, callback){
	if (citation.creators) {
		zotCreators = citation.creators;

		creatorMap = {};

		for (var z in zotCreators){
			var creatorArray,
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
				citation[keyValue[0]] = keyValue[1].trim();
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
					citation['PMCID'] = object.records[0].pmcid;
				}
			}
			callback(null, citation);
		});
	} else {
		//if we add another async function, use async.series
		callback(null, citation);
	}
};

var fixURL = function(url, citation, callback){
	if (!citation.url){
		citation.url = url;
	}
	callback(null, citation);
};

var fixAccessDate = function(citation, callback){
	if (!citation.accessDate || (citation.accessDate == "CURRENT_TIMESTAMP")){
		citation.accessDate = (new Date()).toISOString().substring(0, 10);
	}
	callback(null, citation);
};

var fixISSN = function(citation, callback){
	var match, i,
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

var fixISBN = function(citation, callback){
	var match, i,
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

/*Test response alterations without having to use server*/
var testJSON = function(){
	var sampleBody = require("../test_files/4_input.json");
	console.log("before:");
	console.log(JSON.stringify(sampleBody));
	console.log("after:");
	selectFormatFcn("mwDeprecated", function(convert){
		convert("http://example.com", sampleBody, function(modifiedBody){
			console.log(JSON.stringify(modifiedBody));
		});
	});

	//test PMID lookup
	addPubMedIdentifiers({"DOI": "10.1371/journal.pcbi.1002947"}, function (error, modifiedCitation){
		console.log("Test lookup of PMID by DOI: PMID=" + modifiedCitation.PMID + ", PMCID=" + modifiedCitation.PMCID);
		console.log("Expected: PMID=23555203, PMCID=PMC3605911");
	});
};

/*Test methods in main */
if (require.main === module) {
	testJSON();
}

/*Exports*/
module.exports = {
	zoteroRequest: zoteroRequest
};

