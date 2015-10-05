'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('encoding', function() {

    this.timeout(20000);

    before(function () { return server.start(); });

    it('javascript in format', function() {
        return server.query('http://www.example.com', 'f<script>alert(1);</script>', 'en')
        .then(function(res) {
            assert.status(res, 400);
        }, function(err) {
            assert.status(err, 400);
            assert.deepEqual(err.body.Error,
                'Invalid format requested f%3Cscript%3Ealert(1)%3B%3C%2Fscript%3E');
        });
    });

    it('javascript in search', function() {
        return server.query('f<script>alert(1);</script>', 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 400);
        }, function(err) {
            assert.status(err, 400);
            assert.deepEqual(err.body.Error, 'Invalid host supplied');
        });
    });

    it('javascript in doi', function() {
        var format = 'badformat';
        return server.query('10.1000/f<script>alert(1);</script>', 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 404);
        }, function(err) {
            assert.status(err, 404);
            assert.deepEqual(err.body.Error,
                'Unable to resolve DOI 10.1000/f%3Cscript%3Ealert(1);%3C/script%3E',
                'Unexpected error message ' + err.body.Error);
        });
    });

    it('json in search', function() {
        return server.query('{"json":"object"}', 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 400);
        }, function(err) {
            assert.status(err, 400);
            assert.deepEqual(err.body.Error, 'Invalid host supplied');
        });
    });

    it('json in format', function() {
        return server.query('http://www.example.com/', '{"json":"object"}', 'en')
        .then(function(res) {
            assert.status(res, 400);
        }, function(err) {
            assert.status(err, 400);
            assert.deepEqual(err.body.Error,
                'Invalid format requested %7B%22json%22%3A%22object%22%7D');
        });
    });

    it('spaces in fully qualified url', function() {
        return server.query('http://www.example.com/spaces in url', 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 520);
        }, function(err) {
            assert.status(err, 520);
            assert.deepEqual(err.body[0].title,
                "http://www.example.com/spaces%20in%20url");
            assert.deepEqual(err.body[0].url,
                "http://www.example.com/spaces%20in%20url");
        });
    });

    it('spaces in url missing http://', function() {
        return server.query('www.example.com/spaces in url', 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 520);
        }, function(err) {
            assert.status(err, 520);
            assert.deepEqual(err.body[0].title,
                "http://www.example.com/spaces%20in%20url");
            assert.deepEqual(err.body[0].url,
                "http://www.example.com/spaces%20in%20url");
        });
    });

    it('spaces in url missing http:// and www', function() {
        return server.query('example.com/spaces in url', 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 520);
        }, function(err) {
            assert.status(err, 520);
            assert.deepEqual(err.body[0].title,
                "http://example.com/spaces%20in%20url");
            assert.deepEqual(err.body[0].url,
                "http://example.com/spaces%20in%20url");
        });
    });

});

