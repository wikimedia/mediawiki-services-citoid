'use strict';

const assert = require('../../utils/assert.js');
const Server = require('../../utils/server.js');

describe('address restrictions', function() {

    this.timeout(20000);
    const server = new Server();
    before(() => server.start());
    after(() => server.stop());

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

    it('private ip', function() {
        return server.query('http://192.168.1.2', 'mediawiki', 'en')
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
