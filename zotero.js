#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
* 
* Supplies methods to send requests to a Zotero server
 */

var request = require('request');

var zoteroRequest  = function(zoteroURL, requestedURL, sessionID, format, callback){
	var options = {
		url: zoteroURL,
		method: 'POST',
		json: {
			"url": requestedURL,
			"sessionid": sessionID
		}
	};

	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			//modify body only if response is okay
			callback(error, response, modifyBody(requestedURL, format, body));
		}
		else {
			callback(error, response, body);
		}
		
	});
};

/*Converts Zotero body into appropriate format*/
var modifyBody = function(url, format, body){
	var convert,
		formatFcns = {
		'mwDeprecated':convertToMWDeprecated,
		'mediawiki':convertToMediawiki,
		'zotero':convertToZotero
		};

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
	return body;
};

var convertToMediawiki = function(url, body){
	var citation, zotCreators, creatorMap,
		creatorTypeCount = {};

	//hack in most cases body will be an array, but in some will be an array of arrays
	if (!(body[0] instanceof Array)){
		citation = body[0];
	}
	else if (!(body[0][0] instanceof Array)){
		citation = body[0][0];
	}
	else {
		return body;
	}

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

	//some zotero requests come back without the url field filled in
	if (!citation.url){
		citation.url = url;
	}

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

	return [citation];

};

var convertToMWDeprecated = function(url, body){
	var citation, zotCreators,
		creatorTypeCount = {};

	//hack- in most cases body will be an array, but in some will be an array of arrays
	if (!(body[0] instanceof Array)){
		citation = body[0];
	}
	else if (!(body[0][0] instanceof Array)){
		citation = body[0][0];
	}
	else {
		return body;
	}

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
	//some zotero requests come back without the url field filled in
	if (!citation.url){
		citation.url = url;
	}
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
	return [citation];
};

/*Test server fcns*/
var testServer = function(){
	var zoteroURL = 'http://localhost:1969/web', //edit this to your own endpoint
    	testURL = "http://www.tandfonline.com/doi/abs/10.1080/15424060903167229", //URL that works with Zotero
		//testURL = "http://books.google.co.uk/books?hl=en&lr=&id=7lueAgAAQBAJ&oi=fnd&pg=PR5&dq=mediawiki&ots=-Z0o2LCgao&sig=IGHnyWEiNiNvPyXeyCuOcdvi15s#v=onepage&q=mediawiki&f=false", //url that doesn't work with zotero
		testSessionID = 'abc123';
		//format = 'mwDeprecated';
		format = 'mediawiki';

	zoteroRequest(zoteroURL, testURL, testSessionID, format, function(error, response, body){
		if (response) {
			if (!error && response.statusCode == 200) {
				console.log(body);
			}
			else if(response.statusCode == 501){
				console.log(body);
			}
		}
		else {console.log("Server at "+zoteroURL+" does not appear to be running.");}
	});
};

/*Test response alterations without having to use server*/
var testJSON = function(){
	var sampleJSON = require("./sampleZoteroResponseBody.json");
	console.log("before:");
	console.log(JSON.stringify(sampleJSON));
	console.log("after:");
	console.log(JSON.stringify(modifyBody(sampleJSON)));
};

/*Test methods in main */
if (require.main === module) {
	//testJSON();
	testServer();
}

/*Exports*/
module.exports = {
	zoteroRequest: zoteroRequest
};

