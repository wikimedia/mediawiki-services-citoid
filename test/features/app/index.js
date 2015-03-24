'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('express app', function() {

	this.timeout(20000);

	before(function () { return server.start(); });

	it('get robots.txt', function() {
		return preq.get({
			uri: server.config.uri + 'robots.txt'
		}).then(function(res) {
			assert.status(res, 200);
			assert.deepEqual(res.headers['disallow'], '/');
		});
	});

	it('get landing page', function() {
		return preq.get({
			uri: server.config.uri
		}).then(function(res) {
			// check that the response is present
			assert.status(res, 200);
			assert.contentType(res, 'text/html');
			assert.notDeepEqual(res.body.length, 0, 'Empty response');
		});
	});

});

