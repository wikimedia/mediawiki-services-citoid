'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


if (!server.stopHookAdded) {
    server.stopHookAdded = true;
    after(() => server.stop());
}

describe('using native scraper', function() {

    this.timeout(40000);

    before(function () { return server.start(); });

    it('example domain', function() {
        return server.query('example.com').then(function(res) {
            assert.status(res, 200);
            assert.isInArray(res.body[0].source, 'citoid');
            assert.checkCitation(res, 'Example Domain');
            assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
        });
    });

    // Prefer original url for using native scraper
    it('uses original url', function() {
        var url = 'http://www.google.com';
        return server.query(url).then(function(res) {
            assert.status(res, 200);
            assert.isInArray(res.body[0].source, 'citoid');
            assert.checkCitation(res, 'Google');
            assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
            assert.deepEqual(res.body[0].url, url);
        });
    });

    it('websiteTitle but no publicationTitle', function() {
        return server.query('http://blog.woorank.com/2013/04/dublin-core-metadata-for-seo-and-usability/').then(function(res) {
            assert.status(res, 200);
            assert.checkCitation(res);
            assert.isInArray(res.body[0].source, 'citoid');
            assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
            assert.deepEqual(!!res.body[0].websiteTitle, true, 'Missing websiteTitle field');
            assert.deepEqual(res.body[0].publicationTitle, undefined, 'Invalid field publicationTitle');
        });
    });

    // Fake url but with info in crossRef that can be pulled from doi in url - uses requestFromURL & crossRef
    it('doi in url with query parameters - uses crossRef', function() {
        return server.query('http://www.example.com/10.1086/378695?uid=3739832&uid=2&uid=4&uid=3739256&sid=21105503736473').then(function(res) {
            assert.status(res, 200);
            assert.checkCitation(res, 'Salaries, Turnover, and Performance in the Federal Criminal Justice System');
            assert.isInArray(res.body[0].source, 'Crossref');
            assert.deepEqual(res.body[0].issue, '1');
            assert.deepEqual(res.body[0].volume, '47');
            assert.deepEqual(res.body[0].date, '2004-04');
            assert.deepEqual(res.body[0].DOI, '10.1086/378695');
            assert.deepEqual(res.body[0].author.length, 1);
        });
    });

    it('url with pseudo doi', function() {
        return server.query('http://g2014results.thecgf.com/athlete/weightlifting/1024088/dika_toua.html').then(function(res) {
            assert.status(res, 200);
            assert.isInArray(res.body[0].source, 'citoid');
            assert.checkCitation(res, 'Glasgow 2014 - Dika Toua Profile');
            assert.deepEqual(!!res.body[0].DOI, false);
        });
    });

    // itemType from open graph
    it('itemType from open graph', function() {
        return server.query('http://www.aftenposten.no/kultur/Pinlig-for-Skaber-555558b.html').then(function(res) {
            assert.status(res, 200);
            assert.checkCitation(res, 'Pinlig for Skåber');
            assert.isInArray(res.body[0].source, 'citoid');
            assert.deepEqual(res.body[0].itemType, 'newspaperArticle');
            assert.deepEqual(res.body[0].publicationTitle, 'Aftenposten');
        });
    });

    it('dublinCore data but no highWire metadata', function() {
        return server.query('https://tools.ietf.org/html/draft-kamath-pppext-peapv0-00').then(function(res) {
            assert.status(res, 200);
            assert.checkCitation(res, 'Microsoft\'s PEAP version 0 (Implementation in Windows XP SP1)');
            assert.isInArray(res.body[0].source, 'citoid');
            assert.deepEqual(res.body[0].itemType, 'webpage');
            assert.deepEqual(res.body[0].publicationTitle, undefined); //TODO: Investigate why this is undefined
        });
    });

    it('dublinCore data with multiple identifiers in array', function() {
        return server.query('http://apps.who.int/iris/handle/10665/70863').then(function(res) {
            assert.status(res, 200);
            assert.checkCitation(res, 'Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)');
            assert.isInArray(res.body[0].source, 'citoid');
            assert.deepEqual(res.body[0].itemType, 'journalArticle');
            assert.deepEqual(res.body[0].publisher, undefined); //TODO: Investigate why this is undefined
            assert.deepEqual(res.body[0].publicationTitle, undefined); //TODO: Investigate why this is undefined
        });
    });

    it('gets DOI from dublinCore identifier field', function() {
        return server.query('http://eprints.gla.ac.uk/113711/').then(function(res) {
            assert.status(res, 200);
            assert.checkCitation(res, 'Zika virus: a previously slow pandemic spreads rapidly through the Americas');
            assert.deepEqual(res.body[0].DOI, '10.1099/jgv.0.000381');
            assert.isInArray(res.body[0].source, 'citoid');
            assert.deepEqual(res.body[0].itemType, 'journalArticle');
        });
    });

    it('PMCID but no PMID', function() {

        it('webpage', function() {
            return server.query('PMC2096233',
                'mediawiki', 'en', 'true').then(function(res) {
                assert.status(res, 200);
                console.log(res);
                assert.deepEqual(!!res.body[0].PMCID, true, 'PMC2096233');
                assert.deepEqual(res.body[0].PMID, undefined, 'PMID is null');
            });
        });

    });

    // Restricted url but with info in crossRef that can be pulled from doi in url
    it('doi in restricted url', function() {
        return server.query('http://localhost/10.1086/378695').then(function(res) {
            assert.status(res, 200);
            assert.checkCitation(res, 'Salaries, Turnover, and Performance in the Federal Criminal Justice System');
            assert.isInArray(res.body[0].source, 'Crossref');
            assert.deepEqual(res.body[0].DOI, '10.1086/378695');
            assert.deepEqual(res.body[0].author.length, 1);
        });
    });


});
