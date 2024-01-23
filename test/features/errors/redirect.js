'use strict';

const assert = require('../../utils/assert.js');
const Server = require('../../utils/server.js');
const nock = require('nock');

describe('redirects', function () {

    this.timeout(20000);
    const server = new Server();

    before(() => server.start({ maxRedirects: 5 }));

    after(() => server.stop());

    // httpbin no longer live, so just mock its behaviour since all it does here is redirect anyway.
    const redirector = () => {
        const base = 'https://httpbin.org';
        nock(base)
            .get('/redirect-to')
            .query(true)
            .reply((uri) => {
                redirector(); // call again to enable the recursive behaviour below
                const parsed = new URL(uri, base);
                return [ 302, undefined, { Location: parsed.searchParams.get('url') } ];
            });
    };

    beforeEach(() => {
        redirector();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    it('redirect supported', function () {
        return server.query('https://httpbin.org/redirect-to?url=http://www.example.com', 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 200);
            });
    });

    it('redir-to-private', function () {
        return server.query('https://httpbin.org/redirect-to?url=http://192.168.1.2', 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 400);
            }, function (err) {
                assert.status(err, 400);
            });
    });

    it('redir-to-redir-private', function () {
        return server.query('https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=http://192.168.1.2', 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 400);
            }, function (err) {
                assert.status(err, 400);
            });
    });

    it('follows relative redirects', function () {
        return server.query('https://httpbin.org/redirect-to?url=/redirect-to?url=http://example.com', 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 200);
            }, function (err) {
                assert.status(err, 200);
            });
    });

    it('redir-to-redir-to-redir-to-private', function () {
        return server.query('https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=http://192.168.1.2', 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 400);
            }, function (err) {
                assert.status(err, 400);
            });
    });

    it('five-redirect-max-by-default-under', function () {
        const url = 'https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://en.wikipedia.org/wiki/Zotero';
        return server.query(url, 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 200);
            }, function (err) {
                assert.status(err, 200);
            });
    });

    it('five-redirect-max-by-default-equal', function () {
        const url = 'https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://en.wikipedia.org/wiki/Zotero';
        return server.query(url, 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 200);
            }, function (err) {
                assert.status(err, 200);
                assert.deepEqual(err.body.Error, 'Unable to load URL ' + url);
            });
    });

    it('five-redirect-max-by-default-over', function () {
        return server.query('https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://en.wikipedia.org/wiki/Zotero', 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 400);
            }, function (err) {
                assert.status(err, 400);
            });
    });

});
