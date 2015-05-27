'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('exports', function() {

	this.timeout(20000);

	before(function () { return server.start(); });

	it('bibtex from scraper', function() {
		return server.query('http://example.com', 'bibtex').then(function(res) {
			assert.status(res, 200);
			assert.checkBibtex(res, '\n@misc{_example_???');
		});
	});

	it('bibtex from zotero', function() {
		return server.query('http://www.ncbi.nlm.nih.gov/pubmed/14656957', 'bibtex').then(function(res) {
			assert.status(res, 200);
			assert.checkBibtex(res, '\n@article{chobanian_seventh_20');
		});
	});

	it('bibtex from pmid', function() {
		return server.query('14656957', 'bibtex').then(function(res) {
			assert.status(res, 200);
			assert.checkBibtex(res, '\n@article{chobanian_seventh_20');
		});
	});

});

