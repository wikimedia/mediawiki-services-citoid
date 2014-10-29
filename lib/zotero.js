#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to a Zotero server
 */

var request = require('request');

/**
 * Requests to Zotero server
 * @param  {String}   requestedURL url being requested
 * @param  {Object}   opts         options for request
 * @param  {Function} callback     callback(error, response, body)
 */
var zoteroRequest  = function(requestedURL, opts, callback){
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
			callback(error, response, modifyBody(requestedURL, opts.format, body));
		}
		else {
			callback(error, response, body);
		}

	});
};

/**
 * Modify body of a zotero or other response body
 * @param  {String} url    original uri requested
 * @param  {String} format 'mediawiki', 'mwDeprecated', 'zotero', etc.
 * @param  {Object} body   JSON request body
 * @return {Object}        JSON request body
 */
var modifyBody = function(url, format, body){
	var formatFcns = {
		'mwDeprecated':convertToMWDeprecated,
		'mediawiki':convertToMediawiki,
		'zotero':convertToZotero
		},
		convert = formatFcns[format];

	//if format is not available, use zotero as default- may want to switch to returning error instead
	if (convert){
		return convert(url, body);
	}
	else {
		return convertToZotero(url, body);
	}
};

/*Specific conversion methods*/
var convertToZotero = function(url, body){
	citation = body[0][0];

	fixAccessDate(citation);
	fixURL(url, citation);

	return [[citation]];
};

var convertToMediawiki = function(url, body){

	citation = body[0][0];

	replaceCreators(citation);
	addPMID(citation);
	fixURL(url, citation);
	fixAccessDate(citation);
	fixISBN(citation);
	fixISSN(citation);

	return [citation];
};

var convertToMWDeprecated = function(url, body){
	var zotCreators, issn,
		creatorTypeCount = {},
		citation = body[0][0];

	//flattens creator field
	if (citation.creators) {
		zotCreators = citation.creators;

		for (var z in zotCreators){
			creatorFieldName = zotCreators[z].creatorType;
			if (creatorTypeCount[creatorFieldName]){
				creatorTypeCount[creatorFieldName] += 1;
			}
			else {
				creatorTypeCount[creatorFieldName] = 1;
			}
			//Appends number to name, i.e. author -> author1
			creatorFieldName += (parseInt(creatorTypeCount[creatorFieldName]));

			citation[creatorFieldName + "-first"] = zotCreators[z].firstName;
			citation[creatorFieldName + "-last"] = zotCreators[z].lastName;
		}
		delete citation.creators; //remove creators field
	}

	fixURL(url, citation);
	addPMID(citation);

	//In some cases where two ISSNs, return first found
	//If no match, leave field as is for user to correct
	if (citation.ISSN){
		issn = citation.ISSN;
		reISSN = new RegExp('\\d{4}\\-\\d{3}[\\dX]');
		match = issn.match(reISSN);
		if (match) {
			citation.ISSN = match[0];
		}
	}

	return [citation];
};

/*Methods for particular fields-
* Mediawiki format if not otherwise specified
*/

var replaceCreators = function(citation){
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
};

var addPMID = function(citation){
	//get pmid out of extra fields
	if (citation.extra){
		var extraFields = citation.extra.split('\n');
		for (var f in extraFields){
			//could add them all, but let's not do this in case of conflicting fields
			var keyValue = extraFields[f].split(': ');
			if (keyValue[0] === 'PMID'){
				citation[keyValue[0]] = keyValue[1].trim();
			}
		}
	}
	//TODO: if no pmid available from zotero output, get one from doi using api: http://www.ncbi.nlm.nih.gov/pmc/tools/id-converter-api/
};

var fixURL = function(url, citation){
	if (!citation.url){
		citation.url = url;
	}
};

var fixAccessDate = function(citation){
	if (!citation.accessDate || (citation.accessDate == "CURRENT_TIMESTAMP")){
		citation.accessDate = (new Date()).toISOString().substring(0, 10);
	}
};

var fixISSN = function(citation){
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
		} else{
			citation.ISSN = [issn]; //wraps issn field in array in case of false negatives
		}
	}
};

var fixISBN = function(citation){
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
};

/*Test response alterations without having to use server*/
var testJSON = function(){
	var sampleJSON = require("../test_files/3_input.json");
	console.log("before:");
	console.log(JSON.stringify(sampleJSON));
	console.log("after:");
	console.log(JSON.stringify(modifyBody("http://example.com","mediawiki",sampleJSON)));
};

/*Test methods in main */
if (require.main === module) {
	testJSON();
}

/*Exports*/
module.exports = {
	zoteroRequest: zoteroRequest
};

