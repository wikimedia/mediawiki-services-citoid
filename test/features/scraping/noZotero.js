'use strict';

/**
 * Tests for when Zotero is down/inaccessible
 */

var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');

describe('Zotero service down or disabled: ', function() {

    describe('unreachable', function() {

        this.timeout(40000);

        // Give Zotero port which is it is not running from-
        // Mimics Zotero being down.
        before(function () { return server.start({zoteroPort:1971}); });

        // PMID on NIH website that is not found in the id converter api
        // This will fail when Zotero is disabled because we no longer directly scrape pubMed central URLs,
        // as they have blocked our UA in the past.
        it('PMID not in doi id converter api', function() {
            var pmid = '14656957';
            return server.query(pmid, 'mediawiki', 'en')
            .then(function(res) {
                assert.status(res, 404);
            }, function(err) {
                assert.checkError(err, 404); // Exact error may differ as may be interpreted as pmcid or pmid
            });
        });

        // PMID on NIH website that is found in the id converter api- should convert to DOI
        // Uses three sources, crossref, pubmed and citoid
        it('PMCID present in doi id converter api', function() {
            return server.query('PMC3605911').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Viral Phylodynamics');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.isInArray(res.body[0].source, 'PubMed');
                assert.isInArray(res.body[0].source, 'citoid');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].ISSN, true, 'Should contain ISSN'); // From highwire
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // JSTOR page, uses crossRef
        it('JSTOR page', function() {
            return server.query('http://www.jstor.org/discover/10.2307/3677029').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Flight Feather Moult in the Red-Necked Nightjar Caprimulgus ruficollis');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].ISSN, false, 'Should not contain ISSN'); // This indicates Zotero is actually activated since ISSN is not in crossRef, where we're obtaining the metadata
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('Article with doi within DublinCore metadata + highwire data', function() {
            return server.query('http://www.sciencemag.org/content/303/5656/387.short').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Multiple Ebola Virus Transmission Events and Rapid Decline of Central African Wildlife');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(res.body[0].date, '2004-01-16'); // Field uses highwire data with bePress translator
                assert.deepEqual(res.body[0].DOI, '10.1126/science.1092528'); // DOI from DC metadata
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('doi spage and epage fields in crossRef coins data', function() {
            return server.query('http://dx.doi.org/10.1002/jlac.18571010113').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Ueber einige Derivate des Naphtylamins');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, '90–93', 'Missing pages'); // Uses en dash
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);

            });
        });

        it('successfully uses highwire press metadata', function() {
            return server.query('http://mic.microbiologyresearch.org/content/journal/micro/10.1099/mic.0.082289-0').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Resistance to bacteriocins produced by Gram-positive bacteria');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].ISSN, true, 'Missing ISSN'); // Comes from highwire
                assert.deepEqual(res.body[0].author.length, 3, 'Should have 3 authors');
                assert.deepEqual(res.body[0].pages, '683–700', 'Incorrect or missing pages'); // Comes from crossRef
                assert.deepEqual(res.body[0].date, '2015-04-01', 'Incorrect or missing date'); // Comes from highwire
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);

            });
        });

        it('successfully uses bepress press metadata alone', function() {
            return server.query('http://uknowledge.uky.edu/upk_african_history/1/').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'South Africa and the World: The Foreign Policy of Apartheid');
                assert.isInArray(res.body[0].source, 'citoid');
                assert.deepEqual(res.body[0].author.length, 1, 'Should have 1 author');
                assert.deepEqual(res.body[0].date, '1970-01-01', 'Incorrect or missing date'); // Comes from highwire
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType); // Actually is a book but no way to tell from metadata :(

            });
        });

        // Article with publisher field filled in with dublinCore metadata (general has it too as fallback)
        it('Article with doi and DublinCore metadata', function() {
            return server.query('http://mic.sgmjournals.org/content/journal/micro/10.1099/mic.0.26954-0').then(function(res) {
                assert.status(res, 200);
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.checkCitation(res, 'Increased transcription rates correlate with increased reversion rates in leuB and argH Escherichia coli auxotrophs'); // Title from crossRef
                assert.deepEqual(res.body[0].date, '2004-05-01');
                assert.deepEqual(res.body[0].DOI, '10.1099/mic.0.26954-0');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('Get error for bibtex export', function() {
            return server.query('http://www.example.com', 'bibtex', 'en')
            .then(function(res) {
                assert.status(res, 404);
            }, function(err) {
                assert.deepEqual(JSON.parse(err.body.toString()).Error,'Unable to serve bibtex format at this time');
                assert.status(err, 404);
                //assert.checkError(err, 404, 'Unable to serve bibtex format at this time');
            });
        });

        it('requires cookie handling', function() {
            return server.query('www.jstor.org/discover/10.2307/3677029').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res);
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
            });
        });

        // Ensure DOI is present in non-zotero scraped page where scraping fails
        it('DOI pointing to resource that can\'t be scraped - uses crossRef', function() {
            return server.query('10.1038/scientificamerican0200-90')
            .then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res);
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].author, true, 'Missing authors');
                assert.deepEqual(!!res.body[0].issue, true, 'Missing issue');
                assert.deepEqual(!!res.body[0].volume, true, 'Missing volume');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].websiteTitle, undefined, 'Unexpected field websiteTitle');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // Ensure DOI is present in non-zotero scraped page when request from DOI link
        it('dx.DOI link - uses crossRef', function() {
            return server.query('http://dx.DOI.org/10.2307/3677029').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Flight Feather Moult in the Red-Necked Nightjar Caprimulgus ruficollis');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].author, true, 'Missing authors');
                assert.deepEqual(!!res.body[0].issue, true, 'Missing issue');
                assert.deepEqual(!!res.body[0].volume, true, 'Missing volume');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].websiteTitle, undefined, 'Unexpected field websiteTitle');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('Case sensitive DOI with 5 digit registrant code and unknown genre in crossRef', function() {
            return server.query('10.14344/IOC.ML.4.4').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'IOC World Bird List 4.4');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            });
        });
    });

    describe('disabled in conf', function() {

        this.timeout(40000);

        // Give Zotero port which is it is not running from-
        // Mimics Zotero being down.
        before(function () { return server.start({zotero:false}); });

        // PMID on NIH website that is not found in the id converter api
        // This will fail when Zotero is disabled because we no longer directly scrape pubMed central URLs,
        // as they have blocked our UA in the past.
        it('PMID not in doi id converter api', function() {
            var pmid = '14656957';
            return server.query(pmid, 'mediawiki', 'en')
            .then(function(res) {
                assert.status(res, 404);
            }, function(err) {
                assert.checkError(err, 404); // Error may be for pmcid or pmid
            });
        });

        // PMID on NIH website that is found in the id converter api- should convert to DOI
        // Uses three sources, crossref, pubmed and citoid
        it('PMCID present in doi id converter api', function() {
            return server.query('PMC3605911').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Viral Phylodynamics');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.isInArray(res.body[0].source, 'PubMed');
                assert.isInArray(res.body[0].source, 'citoid');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].ISSN, true, 'Should contain ISSN'); // From highwire
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // JSTOR page with tabs in natively scraped title
        it('JSTOR page with tabs in natively scraped title', function() {
            return server.query('http://www.jstor.org/discover/10.2307/3677029').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Flight Feather Moult in the Red-Necked Nightjar Caprimulgus ruficollis');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].ISSN, false, 'Should not contain ISSN'); // This indicates Zotero is actually activated since ISSN is not in crossRef, where we're obtaining the metadata
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('Article with doi within DublinCore metadata + highwire data', function() {
            return server.query('http://www.sciencemag.org/content/303/5656/387.short').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Multiple Ebola Virus Transmission Events and Rapid Decline of Central African Wildlife');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(res.body[0].date, '2004-01-16'); // Field uses highwire data with bePress translator
                assert.deepEqual(res.body[0].DOI, '10.1126/science.1092528'); // DOI from DC metadata
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('doi spage and epage fields in crossRef coins data', function() {
            return server.query('http://dx.doi.org/10.1002/jlac.18571010113').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Ueber einige Derivate des Naphtylamins');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, '90–93', 'Missing pages'); // Uses en dash
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);

            });
        });

        it('successfully uses highwire press metadata', function() {
            return server.query('http://mic.microbiologyresearch.org/content/journal/micro/10.1099/mic.0.082289-0').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Resistance to bacteriocins produced by Gram-positive bacteria');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].ISSN, true, 'Missing ISSN'); // Comes from highwire
                assert.deepEqual(res.body[0].author.length, 3, 'Should have 3 authors');
                assert.deepEqual(res.body[0].pages, '683–700', 'Incorrect or missing pages'); // Comes from crossRef
                assert.deepEqual(res.body[0].date, '2015-04-01', 'Incorrect or missing date'); // Comes from highwire
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);

            });
        });

        it('successfully uses bepress press metadata alone', function() {
            return server.query('http://uknowledge.uky.edu/upk_african_history/1/').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'South Africa and the World: The Foreign Policy of Apartheid');
                assert.isInArray(res.body[0].source, 'citoid');
                assert.deepEqual(res.body[0].author.length, 1, 'Should have 1 author');
                assert.deepEqual(res.body[0].date, '1970-01-01', 'Incorrect or missing date'); // Comes from highwire
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType); // Actually is a book but no way to tell from metadata :(

            });
        });

        // Article with publisher field filled in with dublinCore metadata (general has it too as fallback)
        it('Article with doi and DublinCore metadata', function() {
            return server.query('http://mic.sgmjournals.org/content/journal/micro/10.1099/mic.0.26954-0').then(function(res) {
                assert.status(res, 200);
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.checkCitation(res, 'Increased transcription rates correlate with increased reversion rates in leuB and argH Escherichia coli auxotrophs'); // Title from crossRef
                assert.deepEqual(res.body[0].date, '2004-05-01');
                assert.deepEqual(res.body[0].DOI, '10.1099/mic.0.26954-0');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('Get error for bibtex export', function() {
            return server.query('http://www.example.com', 'bibtex', 'en')
            .then(function(res) {
                assert.status(res, 404);
            }, function(err) {
                assert.deepEqual(JSON.parse(err.body.toString()).Error,'Unable to serve bibtex format at this time');
                assert.status(err, 404);
                //assert.checkError(err, 404, 'Unable to serve bibtex format at this time');
            });
        });

        it('requires cookie handling', function() {
            return server.query('www.jstor.org/discover/10.2307/3677029').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res);
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
            });
        });

        // Ensure DOI is present in non-zotero scraped page where scraping fails
        it('DOI pointing to resource that can\'t be scraped - uses crossRef', function() {
            return server.query('10.1038/scientificamerican0200-90')
            .then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res);
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].author, true, 'Missing authors');
                assert.deepEqual(!!res.body[0].issue, true, 'Missing issue');
                assert.deepEqual(!!res.body[0].volume, true, 'Missing volume');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].websiteTitle, undefined, 'Unexpected field websiteTitle');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // Ensure DOI is present in non-zotero scraped page when request from DOI link
        it('dx.DOI link - uses crossRef', function() {
            return server.query('http://dx.DOI.org/10.2307/3677029').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Flight Feather Moult in the Red-Necked Nightjar Caprimulgus ruficollis');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].author, true, 'Missing authors');
                assert.deepEqual(!!res.body[0].issue, true, 'Missing issue');
                assert.deepEqual(!!res.body[0].volume, true, 'Missing volume');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].websiteTitle, undefined, 'Unexpected field websiteTitle');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('Case sensitive DOI with 5 digit registrant code and unknown genre in crossRef', function() {
            return server.query('10.14344/IOC.ML.4.4').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'IOC World Bird List 4.4');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            });
        });
    });

});