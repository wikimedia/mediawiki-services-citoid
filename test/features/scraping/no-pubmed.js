'use strict';


var assert = require('../../utils/assert.js');
var Server = require('../../utils/server.js');


describe('noPubmed.js - Disable pubmed requests for extra IDs', function() {

    this.timeout(20000);
    const server = new Server();
    before(() => server.start({ pubmed:false }));
    after(() => server.stop());

    describe('PMID ', function() {
        // PMID on NIH website that is not found in the id converter api
        it('not in id converter', function() {
            return server.query('14656957').then(function(res) {
                assert.checkZotCitation(res, 'Seventh report of the Joint National Committee on Prevention, Detection, Evaluation, and Treatment of High Blood Pressure');
                assert.deepEqual(res.body.length, 1, 'Unexpected number of citations in body');
                assert.deepEqual(!!res.body[0].PMID, true, 'Missing PMID'); // From Zotero
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI'); // From Zotero
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // PMID on NIH website that is not found in the id converter api
        it('returns citation interpreted as both pmid and pmcid', function() {
            return server.query('14656').then(function(res) {
                assert.checkZotCitation(res); // Which citation is first is unpredictable
                assert.deepEqual(res.body.length, 2, 'Unexpected number of citations in body');
                assert.deepEqual(!!res.body[0].PMID, true, 'Missing first PMID'); // From Zotero
                assert.deepEqual(!!res.body[1].PMID, true, 'Missing second PMID'); // From Zotero
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('with space ', function() {
            return server.query('PMID 14656957').then(function(res) {
                assert.checkZotCitation(res, 'Seventh report of the Joint National Committee on Prevention, Detection, Evaluation, and Treatment of High Blood Pressure');
                assert.deepEqual(!!res.body[0].PMID, true, 'Missing PMID'); // From Zotero
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI'); // From Zotero
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('with less than eight digits', function() {
            return server.query('123').then(function(res) {
                assert.deepEqual(res.body.length, 1, 'Unexpected number of citations in body');
                assert.checkZotCitation(res, 'The importance of an innervated and intact antrum and pylorus in preventing postoperative duodenogastric reflux and gastritis');
                assert.deepEqual(!!res.body[0].PMID, true, 'Missing PMID');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('has PMCID, DOI, PMID from zotero', function() {
            return server.query('11467425').then(function(res) {
                assert.deepEqual(res.body.length, 1, 'Unexpected number of citations in body');
                assert.checkZotCitation(res, 'Moth hearing in response to bat echolocation calls manipulated independently in time and frequency');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID'); // Has pmcid, from Zotero
                assert.deepEqual(!!res.body[0].PMID, true, 'Missing PMID');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });
    });

    describe('PMCID ', function() {
        it('with prefix', function() {
            return server.query('PMC3605911').then(function(res) {
                assert.checkZotCitation(res, 'Viral Phylodynamics');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMID'); // PMID from Zotero
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('with trailing space', function() {
            return server.query('PMC3605911 ').then(function(res) {
                assert.checkZotCitation(res, 'Viral Phylodynamics');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMID'); // PMID from Zotero
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('with encoded space', function() {
            return server.query('PMC3605911%20').then(function(res) {
                assert.checkZotCitation(res, 'Viral Phylodynamics');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMID'); // PMID from Zotero
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('which requires PMC prefix to retrieve DOI from id converter', function() {
            return server.query('PMC1690724').then(function(res) {
                assert.checkZotCitation(res, 'Moth hearing in response to bat echolocation calls manipulated independently in time and frequency.');
                assert.deepEqual(!!res.body[0].PMID, true, 'Missing PMID');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID'); // From Zotero
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });
    });

    describe('DOI - uses /search endpoint ', function() {
        it('too many redirects', function() {
            return server.query('10.1098/rspb.2000.1188').then(function(res) {
                assert.checkZotCitation(res, 'Moth hearing in response to bat echolocation calls manipulated independently in time and frequency');
                assert.deepEqual(!!res.body[0].PMID, true, 'Missing PMID'); // PMC not in
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // DOI which points directly to a resource which can be scraped by Zotero
        it('direct DOI', function() {
            return server.query('10.1056/NEJM200106073442306').then(function(res) {
                assert.checkZotCitation(res, 'AIDS — The First 20 Years');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, '1764–1772', 'Wrong pages item; expected 1764–1772, got ' + res.body[0].pages);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // DOI extracted from within a string
        it('DOI with space', function() {
            return server.query('DOI: 10.1056/NEJM200106073442306').then(function(res) {
                assert.checkZotCitation(res, 'AIDS — The First 20 Years');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, '1764–1772', 'Wrong pages item; expected 1764–1772, got ' + res.body[0].pages);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // DOI which points to a link which contains further redirects to the Zotero-scrapable resource
        it('DOI with redirect', function() {
            return server.query('10.1371/journal.pcbi.1002947').then(function(res) {
                assert.checkZotCitation(res);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, 'e1002947', 'Wrong pages item; expected e1002947, got ' + res.body[0].pages);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // Ensure DOI is present in zotero scraped page when requested from link containing DOI
        it('non-dx.DOI link with DOI pointing to resource in zotero with no DOI', function() {
            return server.query('http://link.springer.com/chapter/10.1007/11926078_68').then(function(res) {
                assert.checkZotCitation(res);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            });
        });

        // Ensure DOI is present in zotero scraped page when requested from DOI
        it('DOI pointing to resource in zotero with no DOI', function() {
            return server.query('10.1007/11926078_68').then(function(res) {
                assert.checkZotCitation(res);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            });
        });

        // Ensure DOI is present in non-zotero scraped page when request from DOI link
        it('DOI.org link pointing to resource in zotero with no DOI', function() {
            return server.query('http://DOI.org/10.1007/11926078_68').then(function(res) {
                assert.checkZotCitation(res);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            });
        });

        // Ensure DOI is present in non-zotero scraped page when request from DOI link
        it('DOI which requires cookie to properly follow redirect to Zotero; no results from crossRef', function() {
            return server.query('10.1642/0004-8038(2005)122[0673:PROAGP]2.0.CO;2').then(function(res) {
                assert.checkZotCitation(res, 'Phylogenetic Relationships of Antpitta Genera (Passeriformes: Formicariidae)');
                assert.deepEqual(res.body[0].publicationTitle, 'The Auk', 'Incorrect publicationTitle; Expected The Auk, got' + res.body[0].publicationTitle);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].issue, true, 'Missing issue');
                assert.deepEqual(!!res.body[0].volume, true, 'Missing volume');
            });
        });

        it('doi pointing to bookSection', function() {
            return server.query('10.1007/11926078_68').then(function(res) {
                assert.checkZotCitation(res, 'Semantic MediaWiki');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'bookSection', 'Wrong itemType; expected bookSection, got' + res.body[0].itemType);
            });
        });

        // Fake url but with info in cross ref that can be pulled from doi in url - uses requestFromDOI
        it('doi in url with query parameters- uses Zotero', function() {
            return server.query('example.com/10.1086/378695?uid=3739832&uid=2&uid=4&uid=3739256&sid=21105503736473').then(function(res) {
                assert.checkZotCitation(res, 'Salaries, Turnover, and Performance in the Federal Criminal Justice System');
                assert.deepEqual(res.body[0].DOI, '10.1086/378695');
            });
        });

        it('doi with US style date', function() {
            return server.query('10.1542/peds.2007-2362').then(function(res) {
                assert.checkZotCitation(res, 'Management of Children With Autism Spectrum Disorders');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].date, '2007-11-01', 'Incorrect date; expected 2007-11-01, got ' + res.body[0].date);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);

            });
        });
    });

});

describe('noPubmed.js - Defaults conf to true if pubmed undefined', function() {

    this.timeout(20000);
    const server = new Server();
    before(() => server.start({ pubmed:undefined }));
    after(() => server.stop());

    it('PMCID available from NIH DB only', function() {
        return server.query('http://rspb.royalsocietypublishing.org/content/267/1453/1627').then(function(res) {
            assert.checkZotCitation(res, 'Moth hearing in response to bat echolocation calls manipulated independently in time and frequency');
            assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID'); // Not present in Zotero - should come from API
            assert.deepEqual(!!res.body[0].PMID, true, 'Missing PMID'); // Present in Zotero
            assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI'); // Present in Zotero
            assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
        });
    });
});
