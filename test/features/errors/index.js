'use strict';

const preq = require('preq');
const assert = require('../../utils/assert.js');
const Server = require('../../utils/server.js');

describe('errors', function () {

    this.timeout(20000);
    const server = new Server();

    before(() => server.start());

    after(() => server.stop());

    it('missing search in query', function () {
        return preq.get({
            uri: server.config.qURI,
            query: {
                format: 'mediawiki'
            }
        }).then(function (res) {
            assert.status(res, 400);
        }, function (err) {
            assert.checkError(err, 400, "No 'search' value specified");
        });
    });

    it('missing format in query', function () {
        return preq.get({
            uri: server.config.qURI,
            query: {
                search: '123456'
            }
        }).then(function (res) {
            assert.status(res, 400);
        }, function (err) {
            assert.checkError(err, 400, "No 'format' value specified");
        });
    });

    it('bad format in query', function () {
        const format = 'badformat';
        return preq.get({
            uri: server.config.qURI,
            query: {
                search: '123456',
                format: format
            }
        }).then(function (res) {
            assert.status(res, 400);
        }, function (err) {
            assert.checkError(err, 400, 'Invalid format requested ' + format);
        });
    });

    it('bad domain', function () {
        return server.query('example./com', 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 400);
            }, function (err) {
                assert.status(err, 400);
                assert.deepEqual(err.body.Error, 'Invalid host supplied');
            });
    });

    it('resource has http errors', function () {
        const url = 'http://example.com/thisurldoesntexist';
        return server.query(url, 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 404);
            }, function (err) {
                assert.status(err, 404);
                assert.deepEqual(err.body.Error, 'Unable to load URL ' + url);
            });
    });

    it('unknown doi', function () {
        const doi = '10.1000/thisdoidoesntexist';
        return server.query(doi, 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 404);
            }, function (err) {
                assert.checkError(err, 404, 'Unable to resolve DOI ' + doi,
                    'Unexpected error message ' + err.body.Error);
            });
    });

    it('doi url with single quote', function () {
        const doi = 'http://DOI.org/10.1007/11926078_68\'';
        return server.query(doi, 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 404);
            }, function (err) {
                assert.checkError(err, 404, 'Unable to load URL https://doi.org/10.1007/11926078_68%27',
                    'Unexpected error message ' + err.body.Error);
            });
    });

    it('doi url with double quote', function () {
        const doi = 'http://DOI.org/10.1007/11926078_68"';
        return server.query(doi, 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 404);
            }, function (err) {
                assert.checkError(err, 404, 'Unable to load URL https://doi.org/10.1007/11926078_68%22',
                    'Unexpected error message ' + err.body.Error);
            });
    });

    it('doi with single quote', function () {
        const doi = '10.1007/11926078_68\'';
        return server.query(doi, 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 404);
            }, function (err) {
                assert.checkError(err, 404, "Unable to resolve DOI 10.1007/11926078_68'",
                    'Unexpected error message ' + err.body.Error);
            });
    });

    it('bad pmid', function () {
        const pmid = '99999999';
        return server.query(pmid, 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 404);
            }, function (err) {
                assert.checkError(err, 404); // May be interpreted as PMID or PMCID
            });
    });

    it('bad pmcid', function () {
        const pmcid = 'PMC9999999';
        return server.query(pmcid, 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 404);
            }, function (err) {
                assert.checkError(err, 404, 'Unable to locate resource with pmcid ' + pmcid,
                    'Unexpected error message ' + err.body.Error);
            });
    });

});
