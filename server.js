#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 */
/*external modules*/
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var urlParse = require('url');
var util = require('util');
var path = require('path');
var unshorten = require('./unshorten.js');
var opts = require('yargs')
	.usage('Usage: $0 [-c configfile|--config=configfile]')
	.default({
		c: __dirname + '/localsettings.js'
	})
	.alias( 'c', 'config' );
var argv = opts.argv;

/*internal modules*/	
var zoteroRequest = require('./zotero.js').zoteroRequest;
var scrape = require('./scrape.js').scrape;

/* import local settings*/
var settingsFile = path.resolve(process.cwd(), argv.c);
var CitoidConfig = require(settingsFile).CitoidConfig;
var citoidPort = CitoidConfig.citoidPort;
var citoidInterface = CitoidConfig.citoidInterface;
var zoteroPort = CitoidConfig.zoteroPort;
var zoteroInterface = CitoidConfig.zoteroInterface;
var wskey = CitoidConfig.wskey;
var debug = CitoidConfig.debug;
var allowCORS = CitoidConfig.allowCORS;

//url base which allows further formatting by adding a single endpoint, i.e. 'web'
var zoteroURL = util.format('http://%s:%s/%s', zoteroInterface, zoteroPort.toString()); 

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

citoid.use(bodyParser.json());
citoid.use(bodyParser.urlencoded({extended: false}));

/*Landing page*/
citoid.get('/', function(req, res){
	res.setHeader("Content-Type", "text/html");
	res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Citoid service</title></head><body><h1><a href="https://www.mediawiki.org/wiki/Citoid" target="_blank">Citoid Documentation</a></h1></body></html>');
});

/*Endpoint for retrieving citations in JSON format from a URL*/
citoid.post('/url', function(req, res){

	var format = req.body.format,
		requestedURL = req.body.url,
		zoteroURLWeb = util.format(zoteroURL, 'web');

	//temp backwards compatibility
	if (!format){
		format = 'mwDeprecated';
	}

	res.type('application/json');

	//TODO: fix for async error catching
	try {
		var parsedURL = urlParse.parse(requestedURL);
		//defaults to http if no protocol specified.
		if (!parsedURL.protocol){
			requestedURL = 'http://'+ urlParse.format(parsedURL);
		}
		else {requestedURL = urlParse.format(parsedURL);}
	}
	catch (e){
		console.log(e); 
	}

	//make things work with new format for now..
	//format = 'mediawiki';

	//Request from Zotero and set response
	zoteroRequest(zoteroURLWeb, requestedURL, testSessionID, format, function(error, response, body){
		console.log("Request made for: " + requestedURL);
		if (response) {
			if (!error) {
				//501 indicates no translator availabe
				//this is common- can indicate shortened url
				//or a website not specified in the translators
				if (~[500, 501].indexOf(response.statusCode)){
					//try again with unshortened url
					//we don't do this initially because many sites
					//will redirect this fcn to a log-in screen
					unshorten(requestedURL, function(expandedURL) {
						zoteroRequest(zoteroURLWeb, expandedURL, testSessionID, format,
							function(error, response, body){
							if (response){
								//if still no translator, or translation fails,
								//send to naive scraper
								if (~[500, 501].indexOf(response.statusCode)){
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
				res.json("Internal server error");
				console.log(error);
			}
		}
		else {
			//no response
			var message = "Server at "+zoteroURL+" does not appear to be running.";
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
