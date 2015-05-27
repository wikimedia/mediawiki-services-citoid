'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('errors', function() {

	this.timeout(20000);

	before(function () { return server.start(); });

	it('missing search in query', function() {
		return preq.get({
			uri: server.config.q_uri,
			query: {
				format: 'mediawiki'
			}
		}).then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
			assert.deepEqual(err.body.Error, "No 'search' value specified");
		});
	});

	it('missing format in query', function() {
		return preq.get({
			uri: server.config.q_uri,
			query: {
				search: '123456'
			}
		}).then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
			assert.deepEqual(err.body.Error, "No 'format' value specified");
		});
	});

	it('bad format in query', function() {
		var format = 'badformat';
		return preq.get({
			uri: server.config.q_uri,
			query: {
				search: '123456',
				format: format
			}
		}).then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
			assert.deepEqual(err.body.Error, 'Invalid format requested ' + format);
		});
	});

	it('bad domain', function() {
		return server.query('example./com', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 520);
		}, function(err) {
			assert.status(err, 520);
			assert.checkCitation(err, 'http://example./com');
		});
	});

	it('resource has http errors', function() {
		var url = 'http://example.com/thisurldoesntexist';
		return server.query(url, 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 520);
		}, function(err) {
			assert.status(err, 520);
			assert.checkCitation(err, url);
		});
	});

	it('faulty zotero results', function() {
		var url = 'http://www.ncbi.nlm.nih.gov/pmc/articles/PMC999999/';
		return server.query(url, 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 520);
		}, function(err) {
			assert.status(err, 520);
			assert.checkCitation(err, url);
		});
	});

	it('bad doi', function() {
		var doi = '10.1000/thisdoidoesntexist';
		return server.query(doi, 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 404);
		}, function(err) {
			assert.status(err, 404);
			assert.deepEqual(err.body.Error, 'Unable to resolve DOI ' + doi,
				'Unexpected error message ' + err.body.Error);
		});
	});

	it('bad pmid', function() {
		var pmid = '99999999';
		return server.query(pmid, 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 404);
		}, function(err) {
			assert.status(err, 404);
			assert.deepEqual(err.body.Error,
				'Unable to locate resource with pmid ' + pmid,
				'Unexpected error message ' + err.body.Error);
		});
	});

	it('bad pmcid', function() {
		var pmcid = 'PMC9999999';
		return server.query(pmcid, 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 404);
		}, function(err) {
			assert.status(err, 404);
			assert.deepEqual(err.body.Error, 'Unable to locate resource with pmcid ' + pmcid,
				'Unexpected error message ' + err.body.Error);
		});
	});

});

