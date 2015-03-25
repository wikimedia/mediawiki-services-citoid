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

	var opts,
		acceptLanguage = req.headers['accept-language'],
		format = req.body.format,
		requestedURL = req.body.url;

	// temp backwards compatibility
	if (!format) {
	 	format = 'mwDeprecated';
	}

	if (!requestedURL) {
		res.status(400).type('text/plain');
		res.send('"url" is a required parameter');
		return;
	}

	opts = {
		search: requestedURL,
		format: format,
		acceptLanguage: acceptLanguage
	};

	app.citoid.request(opts, function(error, responseCode, body){
		res.status(responseCode).type('application/json');
		res.send(body);
	});

});


/**
 * GET /api
 * Endpoint for retrieving citations based on search term (URL, DOI).
 */
router.get('/api', function(req, res) {

	var dSearch, opts,
		acceptLanguage = req.headers['accept-language'],
		format = req.query.format,
		search = req.query.search;

	if (!search) {
		res.status(400).type('text/plain');
		res.send("No 'search' value specified\n");
		return;
	} else if(!format) {
		res.status(400).type('text/plain');
		res.send("No 'format' value specified\nOptions are 'mediawiki','zotero'");
		return;
	}

	dSearch = decodeURIComponent(search); //decode urlencoded search string
	opts = {
		search: dSearch,
		format: format,
		acceptLanguage: acceptLanguage
	};

	app.citoid.request(opts, function(error, responseCode, body) {
		res.status(responseCode);
		if(format === 'bibtex') {
			res.type('application/x-bibtex');
		} else {
			res.type('application/json');
		}
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

