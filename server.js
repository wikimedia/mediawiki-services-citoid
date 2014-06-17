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

/*testing below*/
//test_url = "http://www.tandfonline.com/doi/abs/10.1080/15424060903167229"
var testSessionID = "abc123";

var convertZoteroReponse = function(){
//do something!!!

}


//CiteFromID (CFID) service
var cfid = express();

//SECURITY WARNING: FOR TESTING PURPOSES, ALLOWS ALL REQUEST ORIGINS
cfid.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });

// parse application/json
cfid.use(bodyParser.json())

/*URL for VE requests*/
cfid.post('/ve', function(req, res){

	//Retrieve query params from request
	var requestedURL = req.body.url;

	//Request from Zotero and set response
	zoteroRequest(requestedURL, testSessionID, function(body){
		res.type('application/json');
		res.json(body);
		
	});
});

cfid.listen(port);

console.log('Server running on http://localhost:'+port);

/*Exports*/
exports = module.exports = cfid;
