#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
* 
* Supplies methods to send requests to a Zotero server
 */

var request = require('request');
//var Promise = require('bluebird');
var async = require('async');

var zoteroRequest  = function(zoteroURL, requestedURL, sessionID, callback){
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
			//modify body if response is okay
			callback(error, response, modifyBody(body));
		}
		else {
			callback(error, response, body);
		}
		
	});
};

/*Currently replaces creators obj list with flat set of fields*/
var modifyBody = function(body){
	var citation, zotCreators,
		creatorTypeCount = {};

	//hack
	//in most cases body will be a list, but in some will be a list of lists
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

		for (z in zotCreators){
			console.log(z);
			console.log(zotCreators[z]);
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

		//delete citation.creators; //remove creators field
	}

	return citation;
};

/*Test server fcns*/
var testServer = function(){
	var zoteroURL = 'http://localhost:1969/web'; //assumes zotero already started

    var testURL = "http://www.tandfonline.com/doi/abs/10.1080/15424060903167229"; //URL that works with Zotero
	//testURL = "http://books.google.co.uk/books?hl=en&lr=&id=7lueAgAAQBAJ&oi=fnd&pg=PR5&dq=mediawiki&ots=-Z0o2LCgao&sig=IGHnyWEiNiNvPyXeyCuOcdvi15s#v=onepage&q=mediawiki&f=false" //url that doesn't work with zotero
	var testSessionID = "abc123";

	zoteroRequest(zoteroURL, testURL, testSessionID, function(error, response, body){
		if (response) {
			if (!error && response.statusCode == 200) {
				console.log(body);
			}
			else if(response.statusCode == 501){
				console.log(body);
			}
		}
		else {console.log("Server at "+zoteroURL+" does not appear to be running.")};
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

