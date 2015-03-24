'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('errors', function() {

	this.timeout(20000);

	before(function () { return server.start(); });

	it('missing format', function() {
		return preq.get({
			uri: server.config.q_uri,
			query: {
				search: '123456'
			}
		}).then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
		});
	});

	it('missing search', function() {
		return preq.get({
			uri: server.config.q_uri,
			query: {
				format: 'mediawiki'
			}
		}).then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
		});
	});

	it('erroneous domain', function() {
		return server.query('example./com', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 520);
		}, function(err) {
			assert.status(err, 520);
			assert.checkCitation(err, 'http://example./com');
		});
	});

	it('non-existent URL path', function() {
		var url = 'http://example.com/thisurldoesntexist';
		return server.query(url, 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 520);
		}, function(err) {
			assert.status(err, 520);
			assert.checkCitation(err, url);
		});
	});

});

