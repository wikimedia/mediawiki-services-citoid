#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 */

/* Import External Modules */
var bodyParser = require('body-parser'),
	bunyan = require('bunyan'),
	express = require('express'),
	path = require('path'),
	opts = require('yargs')
	.usage('Usage: $0 [-c configfile|--config=configfile]')
	.default({
		c: __dirname + '/localsettings.js'
	})
	.alias( 'c', 'config' ),
	argv = opts.argv;

/* Import Local Modules */
var CitoidService  = require('./lib/CitoidService.js');

/* Import Local Settings */
var settingsFile = path.resolve(process.cwd(), argv.c),
	CitoidConfig = require(settingsFile).CitoidConfig,
	citoidPort = CitoidConfig.citoidPort,
	citoidInterface = CitoidConfig.citoidInterface,
	allowCORS = CitoidConfig.allowCORS;

// Init citoid webserver
var app = express();
var log = bunyan.createLogger({name: "citoid"});

// Init citoid service object
var citoidService  = new CitoidService(CitoidConfig, log);

// SECURITY WARNING: ALLOWS ALL REQUEST ORIGINS
// change allowCORS in localsettings.js
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", allowCORS);
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
 });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('api')); //cache api pages

/* Landing Page */
app.get('/', function(req, res){
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
app.post('/url', function(req, res){

	res.type('application/json');

	var format = req.body.format,
		requestedURL = req.body.url;

	log.info(req);

	//temp backwards compatibility
	if (!format){
	 	format = 'mwDeprecated';
	}

	if (!requestedURL){
		res.statusCode = 400;
		res.setHeader("Content-Type", "text/plain");
		res.send('"url" is a required parameter');
	} else {
		citoidService.request(requestedURL, format, function(error, responseCode, body){
			res.statusCode = responseCode;
			res.send(body);
		});
	}
});

/* Endpoint for retrieving citations based on search term (URL, DOI) */
app.get('/api', function(req, res){

	res.type('application/json');

	var dSearch,
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

		citoidService.request(dSearch, format, function(error, responseCode, body){
			res.statusCode = responseCode;
			res.send(body);
		});
	}
});

app.listen(citoidPort, citoidInterface);

log.info('Server started on ' + citoidInterface + ':' + citoidPort);

/* Exports */
exports = module.exports = app;
