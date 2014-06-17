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

var zoteroURL = 'http://localhost:1969/web'; //assumes zotero already started

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

	//Request from Zotero and set response
	zoteroRequest(requestedURL, testSessionID, function(body){
		res.type('application/json');
		res.json(body);
		
	});
});

citoid.listen(port);

console.log('Server running on http://localhost:'+port);

/*Exports*/
exports = module.exports = citoid;
