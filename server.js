#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/cite-from-id
 */
/*external modules*/
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var urlParse = require('url');
var util = require('util');
var unshorten = require('./unshorten.js');

/*internal modules*/	
var zoteroRequest = require('./zotero.js').zoteroRequest;
var scrape = require('./scrape.js').scrape;

/* import local settings*/
var CitoidConfig = require('./localsettings.js').CitoidConfig;
var citoidPort = CitoidConfig.citoidPort;
var citoidInterface = CitoidConfig.citoidInterface;
var zoteroPort = CitoidConfig.zoteroPort;
var zoteroInterface = CitoidConfig.zoteroInterface;
var wskey = CitoidConfig.wskey;
var debug = CitoidConfig.debug;
var allowCORS = CitoidConfig.allowCORS;


//url base which allows further formatting by adding a single endpoint, i.e. 'web'
var zoteroURL = util.format('http://%s:%s/%s', zoteroInterface, zoteroPort.toString()); 

//Value of WorldCat API key. 
//If false, doesn't use any WorldCat functions
var wskey = false; 

/*testing variables*/
var testSessionID = "abc123";

//Init citoid webserver
var citoid = express();

//SECURITY WARNING: ALLOWS ALL REQUEST ORIGINS
//change allowCORS in localsettings.js
citoid.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", allowCORS);
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
 });

// parse application/json
citoid.use(bodyParser.json());

/*Endpoint for retrieving citations in JSON format from a URL*/
citoid.post('/url', function(req, res){

	//Retrieve query params from request
	var requestedURL = req.body.url,
		zoteroURLWeb = util.format(zoteroURL, 'web');

	res.type('application/json');

	//parse URL. should come out the same as it goes in if formatted properly
	try {
		var parsedURL = urlParse.parse(requestedURL);
		//defaults to http if no protocol specified.
		if (!parsedURL.protocol){
			parsedURL.protocol = 'http:';
			parsedURL.slashes = true;
		}
		requestedURL = urlParse.format(parsedURL);
	}
	catch (e){
		console.log(e); 
	}

	//Request from Zotero and set response
	zoteroRequest(zoteroURLWeb, requestedURL, testSessionID, function(error, response, body){

		if (response) {
			if (!error) {
				//501 indicates no translator availabe
				//this is common- can indicate shortened url
				//or a website not specified in the translators
				if ((response.statusCode == 501)||(response.statusCode == 500)){
					//try again with unshortened url
					unshorten(requestedURL, function(expandedURL) {
						zoteroRequest(zoteroURLWeb, expandedURL, testSessionID, 
							function(error, response, body){
							if (response){
								//if still no translator, send to naive scraper
								if (response.statusCode == 501){
									scrape(requestedURL, function(body){
										res.statusCode = 200;
										res.json(body);
									});
								}
								else {
									res.statusCode = 200;
									res.json(body);
								}
							}							
						});
					});
				}
				else {
					res.statusCode = response.statusCode;
					res.json(body);
				}
			}
			else {
				res.statusCode = 500;
				res.json("internal server error");
			}
		}
		else {
			//no response
			var message = "No response from Zotero server.";
			res.statusCode = 500;
			res.json("Internal server error");
			console.log(message);
		}
	});
});

citoid.listen(citoidPort);

console.log('Server running on http://localhost:'+citoidPort);

/*Exports*/
exports = module.exports = citoid;
