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

    it('should set CORS headers', function() {
        return preq.get({
            uri: server.config.uri + 'robots.txt'
        }).then(function(res) {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.headers['access-control-allow-origin'], '*');
            assert.notDeepEqual(res.headers['access-control-allow-headers'], undefined);
        });
    });

    it('should set CSP headers', function() {
        return preq.get({
            uri: server.config.uri + 'robots.txt'
        }).then(function(res) {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.headers['x-xss-protection'], '1; mode=block');
            assert.deepEqual(res.headers['x-content-type-options'], 'nosniff');
            assert.deepEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
            assert.deepEqual(res.headers['content-security-policy'], 'default-src');
            assert.deepEqual(res.headers['x-content-security-policy'], 'default-src');
            assert.deepEqual(res.headers['x-webkit-csp'], 'default-src');
        });
    });

});

