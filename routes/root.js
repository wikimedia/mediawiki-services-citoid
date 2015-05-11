'use strict';


var sUtil = require('../lib/util');


/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;

/**
 * GET /robots.txt
 * Instructs robots no indexing should occur on this domain.
 */
router.get('/robots.txt', function(req, res) {

	res.set({
		'User-agent': '*',
		'Disallow': '/'
	}).end();

});


/**
 * POST /url
 * Endpoint for retrieving citations in JSON format from a URL.
 * Note: this endpoint is deprecated.
 */
router.post('/url', function(req, res) {

	var opts;
	var acceptLanguage = req.headers['accept-language'];
	var format = req.body.format;
	var requestedURL = req.body.url;
	var eFormat = encodeURIComponent(format);

	// Temp backwards compatibility
	if (!format) {
	 	format = 'mwDeprecated';
	}

	if (!requestedURL) {
		res.status(400).type('application/json');
		res.send({Error:"No 'url' value specified"});
		return;
	}

	if (!app.formats[format]) {
		res.status(400).type('application/json');
		res.send({Error:'Invalid format requested ' + eFormat});
		return;
	}

	opts = {
		search: requestedURL,
		format: eFormat,
		acceptLanguage: acceptLanguage
	};

	app.citoid.request(opts, function(error, responseCode, body){
		res.status(responseCode).type(app.formats[format]);
		res.send(body);
	});

});


/**
 * GET /api
 * Endpoint for retrieving citations based on search term (URL, DOI).
 */
router.get('/api', function(req, res) {

	var dSearch;
	var opts;
	var acceptLanguage = req.headers['accept-language'];
	var format = req.query.format;
	var search = req.query.search;
	var eFormat = encodeURIComponent(format); // Encoded format

	if (!search) {
		res.status(400).type('application/json');
		res.send({Error:"No 'search' value specified"});
		return;
	} else if(!format) {
		res.status(400).type('application/json');
		res.send({Error:"No 'format' value specified"});
		return;
	} else if (!app.formats[format]) {
		res.status(400).type('application/json');
		res.send({Error:'Invalid format requested ' + eFormat});
		return;
	}

	dSearch = decodeURIComponent(encodeURI(search)); // Decode urlencoded search string

	opts = {
		search: dSearch,
		format: eFormat,
		acceptLanguage: acceptLanguage
	};

	app.citoid.request(opts, function(error, responseCode, body) {
		res.status(responseCode).type(app.formats[format]);
		res.send(body);
	});

});


module.exports = function(appObj) {

	app = appObj;

	return {
		path: '/',
		skip_domain: true,
		router: router
	};

};

