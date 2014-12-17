#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 */

/* Import External Modules */
var bodyParser = require('body-parser'),
	bunyan = require('bunyan'),
	crypto = require('crypto'),
	express = require('express'),
	path = require('path'),
	urlParse = require('url'),
	util = require('util'),
	opts = require('yargs')
	.usage('Usage: $0 [-c configfile|--config=configfile]')
	.default({
		c: __dirname + '/localsettings.js'
	})
	.alias( 'c', 'config' ),
	argv = opts.argv;

/* Import Local Modules */
var distinguish = require('./lib/distinguish.js').distinguish,
	requestFromURL = require('./lib/requests.js').requestFromURL;

/* Import Local Settings */
var settingsFile = path.resolve(process.cwd(), argv.c),
	CitoidConfig = require(settingsFile).CitoidConfig,
	citoidPort = CitoidConfig.citoidPort,
	citoidInterface = CitoidConfig.citoidInterface,
	zoteroPort = CitoidConfig.zoteroPort,
	zoteroInterface = CitoidConfig.zoteroInterface,
	debug = CitoidConfig.debug,
	allowCORS = CitoidConfig.allowCORS;

// URL base which allows further formatting by adding a single endpoint, i.e. 'web'
var zoteroURL = util.format('http://%s:%s/%s', zoteroInterface, zoteroPort.toString());

// Init citoid webserver
var citoid = express();
var log = bunyan.createLogger({name: "citoid"});

// SECURITY WARNING: ALLOWS ALL REQUEST ORIGINS
// change allowCORS in localsettings.js
citoid.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", allowCORS);
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
 });

citoid.use(bodyParser.json());
citoid.use(bodyParser.urlencoded({extended: false}));
citoid.use(express.static('api')); //cache api pages

/* Landing Page */
/* jshint multistr: true */
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

/* Endpoint for retrieving citations in JSON format from a URL */
citoid.post('/url', function(req, res){

	res.type('application/json');

	var opts, parsedURL,
		format = req.body.format,
		requestedURL = req.body.url,
		sessionID = crypto.randomBytes(20).toString('hex');

	log.info(req);

	//temp backwards compatibility
	if (!format){
	 	format = 'mwDeprecated';
	}

	opts = {
		zoteroURL:zoteroURL,
		sessionID: sessionID,
		format: format
	};

	if (!requestedURL){
		res.statusCode = 400;
		res.setHeader("Content-Type", "text/plain");
		res.send('"url" is a required parameter');
	} else {

		parsedURL = urlParse.parse(requestedURL);
		//defaults to http if no protocol specified.
		if (!parsedURL.protocol){
			requestedURL = 'http://'+ urlParse.format(parsedURL);
		}
		else {requestedURL = urlParse.format(parsedURL);}

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
	}
});

/* Endpoint for retrieving citations based on search term (URL, DOI) */
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

		sessionID = crypto.randomBytes(20).toString('hex'); //required zotero- not terribly important for this to be secure

		opts = {
			zoteroURL:zoteroURL,
			sessionID:sessionID,
			format:format
		};

		distinguish(dSearch, function(extractedID, runnerFunction){

			runnerFunction(extractedID, opts, function(error, responseCode, body){
				if (!error){
					res.statusCode = responseCode;
					res.send(body);
				}
				else {
					res.statusCode = 520; //TODO: Server at requested location not available, not valid for non-urls
					res.send(body);
				}
			});
		});
	}
});

citoid.listen(citoidPort);

log.info('Server started on http://localhost:'+citoidPort);

/* Exports */
exports = module.exports = citoid;
