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

/*internal modules*/
var zoteroRequest = require('./zotero.js').zoteroRequest;

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

citoid.listen(citoidPort);

console.log('Server running on http://localhost:'+citoidPort);

/*Exports*/
exports = module.exports = citoid;
