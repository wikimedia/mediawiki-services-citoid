'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('address restrictions', function() {

	this.timeout(20000);

	before(function () { return server.start(); });

	it('localhost:1970', function() {
		return server.query('localhost:1970', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 400);
		}, function(err, res) {
			assert.status(err, 400);
		});
	});

	it('http://localhost:1970', function() {
		return server.query('http://localhost:1970', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 400);
		}, function(err, res) {
			assert.status(err, 400);
		});
	});

	it('http://127.0.0.1:1970', function() {
		return server.query('http://127.0.0.1:1970', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
		});
	});

	it('non-existing', function() {
		return server.query('http://foobarbaz.example.com/', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
		});
	});

	it('10.0.0.5', function() {
		return server.query('http://10.0.0.5/', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
		});
	});

	it('redir-to-zot-supported', function() {
		return server.query('https://httpbin.org/redirect-to?url=http://en.wikipedia.org/wiki/Zotero', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 200);
		});
	});

	it('redir-to-zot-unsupported', function() {
		return server.query('https://httpbin.org/redirect-to?url=http://example.com', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 200);
		});
	});

	it('redir-to-private', function() {
		return server.query('https://httpbin.org/redirect-to?url=http://192.168.1.2', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
		});
	});

	it('redir-to-redir-private', function() {
		return server.query('https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=http://192.168.1.2', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
		});
	});

	it('redir-to-redir-to-redir-to-private', function() {
		return server.query('https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=http://192.168.1.2', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
		});
	});

	it('five-redirect-max-by-default-under', function() {
		var url = 'https://httpbin.org/redirect/5';
		return server.query(url, 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 520);
		}, function(err) {
			assert.status(err, 520);
			assert.deepEqual(err.body[0].url, url);
		});
	});

	it('five-redirect-max-by-default-over', function() {
		return server.query('https://httpbin.org/redirect/6', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 400);
		}, function(err) {
			assert.status(err, 400);
		});
	});

	it('acceptable domain, with scheme', function() {
		return server.query('https://en.wikipedia.org/w/index.php?title=Internet_Assigned_Numbers_Authority&oldid=664999436', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 200);
		});
	});

	it('acceptable domain, without scheme', function() {
		return server.query('en.wikipedia.org/w/index.php?title=Internet_Assigned_Numbers_Authority&oldid=664999436', 'mediawiki', 'en')
		.then(function(res) {
			assert.status(res, 200);
		});
	});

});
