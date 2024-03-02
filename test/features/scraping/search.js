'use strict';

const assert = require('../../utils/assert.js');
const Server = require('../../utils/server.js');

describe('Freetext or ambiguous search, classified as "any" input type, i.e. title or citation', function () {

    describe('Default config', function () {

        this.timeout(20000);
        const server = new Server();

        before(() => server.start());

        after(() => server.stop());

        // Previously gave error; now passes to search
        it('spaces in url missing http:// and www', function () {
            const url = 'example.com/spaces in url';
            return server.query(url, 'mediawiki', 'en')
                .then(function (res) {
                    assert.status(res, 200);
                });
        });

        // Uses json as plain text search term; previously gave error
        it('json in search', function () {
            return server.query('{"json":"object"}', 'mediawiki', 'en')
                .then(function (res) {
                    assert.status(res, 200);
                });
        });

        // Uses search; previously gave error
        it('javascript in search', function () {
            return server.query('f<script>alert(1);</script>', 'mediawiki', 'en')
                .then(function (res) {
                    assert.status(res, 200);
                });
        });

        // Uses search; previously gave error
        it('localhost:1970', function () {
            return server.query('localhost:1970', 'mediawiki', 'en')
                .then(function (res) {
                    assert.status(res, 200);
                }, function (err, res) {
                    assert.status(err, 200);
                });
        });

        it('Open search for Schrodinger', function () {
            return server.query('E. Schrodinger, Proc. Cam. Phil. Soc. 31, 555 (1935)').then(function (res) {
                assert.checkCitation(res, 'Discussion of Probability Relations between Separated Systems');
                assert.deepEqual(res.body.length, 1); // One from Crossref
            });
        });

        it('Open search containing <> works; but gets wrong results from crossRef', function () {
            return server.query('Title. Available at: <http://www.example.com>. Accessed on May 19, 1998.').then(function (res) {
                assert.checkCitation(res);
                assert.deepEqual(res.body.length, 2); // One from url, one from Crossref
            });
        });

        it('Open search with www but no protocol', function () {
            return server.query('Title. Available at: <www.example.com>. Accessed on May 19, 1998.').then(function (res) {
                assert.status(res, 200);
                assert.deepEqual(res.body.length, 2); // One from url, one from Crossref
            });
        });

        // Timing out due to upstream request response time
        it('Open search with doi', function () {
            return server.query('Kingsolver JG, Hoekstra HE, Hoekstra JM, Berrigan D, Vignieri SN, Hill CE, Hoang A, Gibert P, Beerli P (2001) Data from: The strength of phenotypic selection in natural populations. Dryad Digital Repository. doi:10.5061/dryad.166').then(function (res) {
                assert.checkZotCitation(res, 'Data from: The strength of phenotypic selection in natural populations');
                assert.deepEqual(res.body.length, 1); // One citation from detected DOI
            });
        });

        // Gets correct data from url, incorrect data from crossRef
        it('Open search with url', function () {
            return server.query('Frederico Girosi; Gary King, 2006, ‘Cause of Death Data’, http://hdl.handle.net/1902.1/UOVMCPSWOL UNF:3:9JU+SmVyHgwRhAKclQ85Cg== IQSS Dataverse Network [Distributor] V3 [Version].').then(function (res) {
                assert.checkCitation(res);
                assert.deepEqual(res.body.length, 2); // One from Worldcat, one from Crossref
            });
        });

        // Gets item from single search term
        it('Open search with single term', function () {
            return server.query('Mediawiki').then(function (res) {
                assert.checkCitation(res);
                assert.deepEqual(res.body.length, 1); // One from Crossref
            });
        });

        // Gets item from single search term
        it('Harry Potter', function () {
            return server.query('Mediawiki').then(function (res) {
                assert.checkCitation(res);
                assert.deepEqual(res.body.length, 1); // One from Crossref
            });
        });
    });

});
