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

});

