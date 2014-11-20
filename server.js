#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 */

/*external modules*/
var bodyParser = require('body-parser');
var bunyan = require('bunyan');
var express = require('express');
var path = require('path');
var urlParse = require('url');
var util = require('util');
var opts = require('yargs')
	.usage('Usage: $0 [-c configfile|--config=configfile]')
	.default({
		c: __dirname + '/localsettings.js'
	})
	.alias( 'c', 'config' );
var argv = opts.argv;

var distinguish = require('./lib/distinguish.js').distinguish;
var requestFromURL = require('./lib/requests.js').requestFromURL;

/* import local settings*/
var settingsFile = path.resolve(process.cwd(), argv.c);
var CitoidConfig = require(settingsFile).CitoidConfig;
var citoidPort = CitoidConfig.citoidPort;
var citoidInterface = CitoidConfig.citoidInterface;
var zoteroPort = CitoidConfig.zoteroPort;
var zoteroInterface = CitoidConfig.zoteroInterface;
var debug = CitoidConfig.debug;
var allowCORS = CitoidConfig.allowCORS;

//url base which allows further formatting by adding a single endpoint, i.e. 'web'
var zoteroURL = util.format('http://%s:%s/%s', zoteroInterface, zoteroPort.toString());

//Init citoid webserver
var citoid = express();
var log = bunyan.createLogger({name: "citoid"});

//SECURITY WARNING: ALLOWS ALL REQUEST ORIGINS
//change allowCORS in localsettings.js
citoid.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", allowCORS);
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
 });

citoid.use(bodyParser.json());
citoid.use(bodyParser.urlencoded({extended: false}));
citoid.use(express.static('api')); //cache api pages

/*Landing page*/
/*jshint multistr: true */
citoid.get('/', function(req, res){
	res.setHeader("Content-Type", "text/html");
	res.send('<!DOCTYPE html>\
<html>\
	<head>\
		<meta charset="UTF-8">\
	<title>Citoid service</title>\
</head>\
<body>\
	<h1>Citoid</h1>\
	<h2><a href="https://www.mediawiki.org/wiki/Citoid" target="_blank">Documentation</a></h2>\
	<h2>Test request</h2>\
	<form action="/url" method="POST">\
		<input type="hidden" name="format" value="mediawiki" />\
		<p>URL: <input name="url" size="100" value="http://link.springer.com/chapter/10.1007/11926078_68" /> <input type="submit" /></p>\
	</form>\
</body></html>\
	');
});

/*Endpoint for retrieving citations in JSON format from a URL*/
citoid.post('/url', function(req, res){

	res.type('application/json');

	var opts, parsedURL,
		format = req.body.format,
		requestedURL = req.body.url,
		sessionID = "123abc";

	log.info(req);

	//temp backwards compatibility
	if (!format){
	 	format = 'mwDeprecated';
	}

	parsedURL = urlParse.parse(requestedURL);
	//defaults to http if no protocol specified.
	if (!parsedURL.protocol){
		requestedURL = 'http://'+ urlParse.format(parsedURL);
	}
	else {requestedURL = urlParse.format(parsedURL);}

	opts = {
		zoteroURL:zoteroURL,
		sessionID: sessionID,
		format: format
	};

	requestFromURL(requestedURL, opts, function(error, responseCode, body){
		if (!error){
			res.statusCode = responseCode;
			res.send(body);
		}
		else {
			res.statusCode = 520;
			res.send(body);
		}
	});

});

/**Endpoint for retrieving citations based on search term (URL,DOI)*/
citoid.get('/api', function(req, res){

	res.type('application/json');

	var opts, dSearch,
		format = req.query.format,
		search = req.query.search;

	log.info(req);

	if (!search){
		res.statusCode = 400;
		res.setHeader("Content-Type", "text/plain");
		res.send("No 'search' value specified\n");
	} else if(!format){
		res.statusCode = 400;
		res.setHeader("Content-Type", "text/plain");
		res.send("No 'format' value specified\nOptions are 'mediawiki','zotero'");
	} else {

		dSearch = decodeURIComponent(search); //decode urlencoded search string

		opts = {
			zoteroURL:zoteroURL,
			sessionID:"123abc",
			format:format
		};

		distinguish(dSearch, function(extractedID, runnerFunction){

			runnerFunction(extractedID, opts, function(error, responseCode, body){
				if (!error){
					res.statusCode = responseCode;
					res.send(body);
				}
				else {
					res.statusCode = 520; //Server at requested location not available
					res.send(body);
				}
			});
		});
	}
});

citoid.listen(citoidPort);

log.info('Server started on http://localhost:'+citoidPort);

/*Exports*/
exports = module.exports = citoid;
