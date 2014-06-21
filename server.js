#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/cite-from-id
 */

var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var zoteroRequest = require('./zotero.js').zoteroRequest;
var urlParse = require('url');

var port = '1970';

var zoteroURL = 'http://localhost:1969/web'; 

//Value of WorldCat API key. 
//If false, doesn't use any WorldCat functions
var wskey = false; 

/*testing variables*/
var testSessionID = "abc123";

//CiteFromID (CFID) service
var citoid = express();

//SECURITY WARNING: FOR TESTING PURPOSES, ALLOWS ALL REQUEST ORIGINS
citoid.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });

// parse application/json
citoid.use(bodyParser.json())

/*URL for VE requests*/
citoid.post('/ve', function(req, res){

	//Retrieve query params from request
	var requestedURL = req.body.url;

	res.type('application/json');

	//Request from Zotero and set response
	zoteroRequest(requestedURL, testSessionID, function(error, response, body){

		if (response) {
			if (!error && response.statusCode == 200) {
				res.json(body);
			}
			//501 response indicates Zotero doesn't have a translator available
			//in this case, send url to a generic scraper
			else if(response.statusCode == 501){
				console.log(body);
				res.json(body);
				//res.json(naiveScrape(testURL)); //not implemented yet
			}
		}
		else {
			//no response, probably means zotero service is not running
			var message = "Server at "+zoteroURL+" does not appear to be running.";
			res.json(message);
			console.log(message);
		}
	});
});

citoid.listen(port);

console.log('Server running on http://localhost:'+port);

/*Exports*/
exports = module.exports = citoid;
