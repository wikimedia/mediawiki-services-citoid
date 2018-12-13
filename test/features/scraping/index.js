'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


if (!server.stopHookAdded) {
    server.stopHookAdded = true;
    after(() => server.stop());
}

describe('Native scraper: ', function() {

    before(function () { return server.start(); });

    // Fake url but with info in crossRef that can be pulled from doi in url - uses requestFromURL & crossRef
    it('doi in url with query parameters - uses crossRef', function() {
        return server.query('http://www.example.com/10.1086/378695?uid=3739832&uid=2&uid=4&uid=3739256&sid=21105503736473').then(function(res) {
            assert.checkCitation(res, 'Salaries, Turnover, and Performance in the Federal Criminal Justice System');
            assert.isInArray(res.body[0].source, 'Crossref');
            assert.deepEqual(res.body[0].issue, '1');
            assert.deepEqual(res.body[0].volume, '47');
            assert.deepEqual(res.body[0].date, '2004-04');
            assert.deepEqual(res.body[0].DOI, '10.1086/378695');
            assert.deepEqual(res.body[0].author.length, 1);
        });
    });

    // Unable to scrape and ends up with crossRef data
    it('DOI with redirect - Wiley', function() {
        return server.query('10.1029/94WR00436').then(function(res) {
            assert.checkCitation(res, 'A distributed hydrology-vegetation model for complex terrain');
            assert.deepEqual(res.body[0].publicationTitle, 'Water Resources Research', 'Incorrect publicationTitle; Expected "Water Resources Research", got' + res.body[0].publicationTitle);
            assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            assert.deepEqual(!!res.body[0].issue, true, 'Missing issue');
            assert.deepEqual(!!res.body[0].volume, true, 'Missing volume');
        });
    });


});

