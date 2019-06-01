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

});

