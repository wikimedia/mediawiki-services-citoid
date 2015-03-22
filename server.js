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
	citoidConfig = require(settingsFile),
	citoidPort = citoidConfig.citoidPort,
	citoidInterface = citoidConfig.citoidInterface,
	allowCORS = citoidConfig.allowCORS;

// Set outgoing proxy
if (citoidConfig.proxy) {
	process.env.HTTP_PROXY = citoidConfig.proxy;
	if (!citoidConfig.zoteroUseProxy) {
		// Don't use proxy for accessing Zotero unless specified in settings
		process.env.NO_PROXY = citoidConfig.zoteroInterface;
	}
}

// Init citoid webserver
var app = express();
var log = bunyan.createLogger({name: "citoid"});

// Init citoid service object
var citoidService  = new CitoidService(citoidConfig, log);

// SECURITY WARNING: ALLOWS ALL REQUEST ORIGINS
// change allowCORS in localsettings.js
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", allowCORS);
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
 });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('api')); // Cache api pages
app.use(express.static(__dirname + '/static')); // Static HTML files

/* Endpoint for retrieving citations in JSON format from a URL */
app.post('/url', function(req, res){

	res.type('application/json');

	var opts,
		acceptLanguage = req.headers['accept-language'],
		format = req.body.format,
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
		opts = {
			search : requestedURL,
			format: format,
			acceptLanguage : acceptLanguage
		};
		citoidService.request(opts, function(error, responseCode, body){
			res.statusCode = responseCode;
			res.send(body);
		});
	}
});

/* Endpoint for retrieving citations based on search term (URL, DOI) */
app.get('/api', function(req, res){

	res.type('application/json');

	var dSearch, opts,
		acceptLanguage = req.headers['accept-language'],
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
			search : dSearch,
			format: format,
			acceptLanguage : acceptLanguage
		};
		citoidService.request(opts, function(error, responseCode, body){
			res.statusCode = responseCode;
			res.send(body);
		});
	}
});

app.listen(citoidPort, citoidInterface);

log.info('Server started on ' + citoidInterface + ':' + citoidPort);

/* Exports */
exports = module.exports = app;
