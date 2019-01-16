'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


if (!server.stopHookAdded) {
    server.stopHookAdded = true;
    after(() => server.stop());
}

describe('address restrictions', function() {

    this.timeout(20000);

    before(function () { return server.start(); });

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
        return server.query('https://httpbin.org/redirect-to?url=https://en.wikipedia.org/wiki/Zotero', 'mediawiki', 'en')
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

    it('private ip', function() {
        return server.query('http://192.168.1.2', 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 400);
        }, function(err) {
            assert.status(err, 400);
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
        var url = 'https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://en.wikipedia.org/wiki/Zotero';
        return server.query(url, 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 200 );
        }, function(err) {
            assert.status(err, 200);
        });
    });

    it('five-redirect-max-by-default-equal', function() {
        var url = 'https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://en.wikipedia.org/wiki/Zotero';
        return server.query(url, 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 200);
        }, function(err) {
            assert.status(err, 200);
            assert.deepEqual(err.body.Error, 'Unable to load URL ' + url);
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

