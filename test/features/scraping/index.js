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

    // Previously gave error; now passes to search
    it('spaces in url missing http:// and www', function() {
        var url = 'example.com/spaces in url';
        return server.query(url, 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 200);
        });
    });

    // Uses json as plain text search term; previously gave error
    it('json in search', function() {
        return server.query('{"json":"object"}', 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 200);
        });
    });

    // Uses search; previously gave error
    it('javascript in search', function() {
        return server.query('f<script>alert(1);</script>', 'mediawiki', 'en')
        .then(function(res) {
            assert.status(res, 200);
        });
    });

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
            assert.isInArray(res.body[0].source, 'citoid');
            assert.checkCitation(res, 'Google');
            assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
            assert.deepEqual(res.body[0].url, url);
        });
    });

    it('websiteTitle but no publicationTitle', function() {
        return server.query('http://blog.woorank.com/2013/04/dublin-core-metadata-for-seo-and-usability/').then(function(res) {
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
            assert.checkCitation(res, 'Microsoft\'s PEAP version 0 (Implementation in Windows XP SP1)');
            assert.isInArray(res.body[0].source, 'citoid');
            assert.deepEqual(res.body[0].itemType, 'webpage');
            assert.deepEqual(res.body[0].publicationTitle, undefined); //TODO: Investigate why this is undefined
        });
    });

    it('dublinCore data with multiple identifiers in array', function() {
        return server.query('http://apps.who.int/iris/handle/10665/70863').then(function(res) {
            assert.checkCitation(res, 'Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)');
            assert.isInArray(res.body[0].source, 'citoid');
            assert.deepEqual(res.body[0].itemType, 'journalArticle');
            assert.deepEqual(res.body[0].publisher, undefined); //TODO: Investigate why this is undefined
            assert.deepEqual(res.body[0].publicationTitle, undefined); //TODO: Investigate why this is undefined
        });
    });

    it('gets DOI from dublinCore identifier field', function() {
        return server.query('http://eprints.gla.ac.uk/113711/').then(function(res) {
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
                assert.deepEqual(!!res.body[0].PMCID, true, 'PMC2096233');
                assert.deepEqual(res.body[0].PMID, undefined, 'PMID is null');
            });
        });

    });

    // Restricted url but with info in crossRef that can be pulled from DOI in url
    it('DOI in restricted url', function() {
        return server.query('http://localhost/10.1086/378695').then(function(res) {
            assert.checkCitation(res, 'Salaries, Turnover, and Performance in the Federal Criminal Justice System');
            assert.isInArray(res.body[0].source, 'Crossref');
            assert.deepEqual(res.body[0].DOI, '10.1086/378695');
            assert.deepEqual(res.body[0].author.length, 1);
        });
    });

    it('Open search for Schrodinger', function() {
        return server.query('E. Schrodinger, Proc. Cam. Phil. Soc. 31, 555 (1935)').then(function(res) {
            assert.checkCitation(res, 'Discussion of Probability Relations between Separated Systems');
            assert.isInArray(res.body[0].source, 'Crossref');
            assert.deepEqual(res.body[0].DOI, '10.1017/s0305004100013554');
            assert.deepEqual(res.body[0].author.length, 2);
        });
    });

    it('Open search containing <> works; but gets wrong results from crossRef', function() {
        return server.query('Title. Available at: <http://www.example.com>. Accessed on May 19, 1998.').then(function(res) {
            assert.checkCitation(res);
            assert.deepEqual(res.body.length, 2); // Two citations; one from url, one from crossRef
        });
    });

    it('Open search with www but no protocol', function() {
        return server.query('Title. Available at: <www.example.com>. Accessed on May 19, 1998.').then(function(res) {
            assert.checkCitation(res);
            assert.deepEqual(res.body.length, 2); // Two citations; one from url, one from crossRef
        });
    });

    it('Open search with doi', function() {
        return server.query('Kingsolver JG, Hoekstra HE, Hoekstra JM, Berrigan D, Vignieri SN, Hill CE, Hoang A, Gibert P, Beerli P (2001) Data from: The strength of phenotypic selection in natural populations. Dryad Digital Repository. doi:10.5061/dryad.166').then(function(res) {
            assert.checkZotCitation(res, 'Data from: The strength of phenotypic selection in natural populations');
            assert.deepEqual(res.body.length, 1); // One citation from detected DOI
        });
    });

    // Gets correct data from url, incorrect data from crossRef
    it('Open search with url', function() {
        return server.query('Frederico Girosi; Gary King, 2006, ‘Cause of Death Data’, http://hdl.handle.net/1902.1/UOVMCPSWOL UNF:3:9JU+SmVyHgwRhAKclQ85Cg== IQSS Dataverse Network [Distributor] V3 [Version].').then(function(res) {
            assert.checkCitation(res);
            assert.deepEqual(res.body.length, 2); // Two citations; one from url, one from crossRef
        });
    });

    // Gets item from single search term
    it('Open search with single term', function() {
        return server.query('Mediawiki').then(function(res) {
            assert.checkCitation(res);
            assert.deepEqual(res.body.length, 1); // One citation from crossRef
        });
    });

});
