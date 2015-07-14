'use strict';


var sUtil = require('../lib/util');
var CitoidRequest = require('../lib/CitoidRequest.js');

/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;


/**
 * POST /url
 * Endpoint for retrieving citations in JSON format from a URL.
 * Note: this endpoint is deprecated.
 */
router.post('/url', function(req, res) {

	var cr = new CitoidRequest(req, app);

	if (!req.body.format) {
		cr.format = 'mwDeprecated'; // Backwards compatibility with prior version of API which did not require format
	} else {
		cr.format = encodeURIComponent(req.body.format);
	}

	if (!req.body.url) {
		res.status(400).type('application/json');
		res.send({Error:"No 'url' value specified"});
		return;
	}

	// Set search value with uri encoded url
	cr.search = req.body.url;
	cr.encodedSearch = encodeURIComponent(req.body.url);

	// Ensure format is supported
	if (!app.formats[cr.format]) {
		res.status(400).type('application/json');
		res.send({Error:'Invalid format requested ' + cr.format});
		return;
	}

	return app.citoid.request(cr).then(function(cr){
		res.status(cr.response.responseCode).type(app.formats[cr.format]);
		res.send(cr.response.body);
	}, function(cr){
		res.status(cr.response.responseCode).type(app.formats[cr.format]);
		res.send(cr.response.body);
	});

});


/**
 * GET /api
 * Endpoint for retrieving citations based on search term (URL, DOI).
 */
router.get('/api', function(req, res) {

	var cr = new CitoidRequest(req, app);

	if (!req.query.search) {
		res.status(400).type('application/json');
		res.send({Error:"No 'search' value specified"});
		return;
	} else if(!req.query.format) {
		res.status(400).type('application/json');
		res.send({Error:"No 'format' value specified"});
		return;
	} else if (!app.formats[cr.format]) { // Use encoded format
		res.status(400).type('application/json');
		res.send({Error:'Invalid format requested ' + cr.format});
		return;
	}

	return app.citoid.request(cr).then(function(cr){
		res.status(cr.response.responseCode).type(app.formats[cr.format]);
		res.send(cr.response.body);
	}, function(cr){
		res.status(cr.response.responseCode).type(app.formats[cr.format]);
		res.send(cr.response.body);
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

