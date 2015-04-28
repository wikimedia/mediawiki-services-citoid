'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('languages', function() {

	this.timeout(20000);

	before(function () { return server.start(); });

	it('german twitter', function() {
		return server.query('http://twitter.com', 'mediawiki', 'de').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res, 'Willkommen bei Twitter - Anmelden oder Registrieren');
		});
	});

	it('invalid language code', function() {
		return server.query('http://www.ncbi.nlm.nih.gov/pubmed/23555203').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res);
			assert.deepEqual(res.body[0].language, undefined, 'Should not have a language code, got: ' + res.body[0].language);
		});
	});

	// Support for language encoding other than those native to Node
	it('non-native to node encoding in response', function() {
		return server.query('http://corriere.it/esteri/15_marzo_27/aereo-germanwings-indizi-interessanti-casa-copilota-ff5e34f8-d446-11e4-831f-650093316b0e.shtml').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res, 'Aereo Germanwings, «indizi interessanti» nella casa del copilota');
		});
	});

	// Support for language encoding other than those native to Node
	it('content-type header present in body but not in response headers', function() {
		return server.query('www.insee.fr/fr/ppp/bases-de-donnees/recensement/populations-legales/departement.asp').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res, 'Insee - Populations légales 2012 - 01-Ain');
		});
	});


});

