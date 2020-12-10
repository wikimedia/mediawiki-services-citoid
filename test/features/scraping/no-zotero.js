'use strict';

/**
 * Tests for when Zotero is down/inaccessible
 */

const assert = require('../../utils/assert.js');
const Server = require('../../utils/server.js');

describe('Zotero service down or disabled:', function () {

    describe('unreachable', function () {

        this.timeout(20000);
        const server = new Server();

        // Give Zotero port which is it is not running from-
        // Mimics Zotero being down.
        before(() => server.start({ zoteroPort: 1971 }));
        after(() => server.stop());

        // PMID on NIH website that is not found in the id converter api
        // This will fail when Zotero is disabled because we no longer directly scrape pubMed central URLs,
        // as they have blocked our UA in the past.
        it('PMID not in doi id converter api', function () {
            const pmid = '14656957';
            return server.query(pmid, 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 404);
            }, function (err) {
                assert.checkError(err, 404); // Exact error may differ as may be interpreted as pmcid or pmid
            });
        });

        // PMID on NIH website that is found in the id converter api- should convert to DOI
        // Uses three sources, crossref, pubmed and citoid
        it('PMCID present in doi id converter api', function () {
            return server.query('PMC3605911').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Viral Phylodynamics');
                assert.deepEqual(res.body[0].url, 'https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002947');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.isInArray(res.body[0].source, 'PubMed');
                assert.deepEqual(res.body[0].PMCID, 'PMC3605911');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].ISSN, true, 'Should contain ISSN'); // From highwire
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // JSTOR page, uses crossRef
        it('JSTOR page', function () {
            return server.query('http://www.jstor.org/discover/10.2307/3677029').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Flight Feather Moult in the Red-Necked Nightjar Caprimulgus ruficollis');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].ISSN, true, 'Should contain ISSN');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('Article with doi within DublinCore metadata + highwire data', function () {
            return server.query('http://www.sciencemag.org/content/303/5656/387.short').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Multiple Ebola Virus Transmission Events and Rapid Decline of Central African Wildlife');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(res.body[0].date, '2004-01-16'); // Field uses highwire data with bePress translator
                assert.deepEqual(res.body[0].DOI, '10.1126/science.1092528'); // DOI from DC metadata
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('doi spage and epage fields in crossRef coins data', function () {
            return server.query('http://doi.org/10.1002/jlac.18571010113').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Ueber einige Derivate des Naphtylamins');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, '90–93', 'Missing pages'); // Uses en dash
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);

            });
        });

        it('successfully uses highwire press metadata', function () {
            return server.query('http://mic.microbiologyresearch.org/content/journal/micro/10.1099/mic.0.082289-0').then(function (res) {
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

        it('successfully uses bepress press metadata alone', function () {
            return server.query('http://uknowledge.uky.edu/upk_african_history/1/').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'South Africa and the World: The Foreign Policy of Apartheid');
                assert.deepEqual(res.body[0].author.length, 1, 'Should have 1 author');
                assert.deepEqual(res.body[0].date, '1970', 'Incorrect or missing date'); // Comes from highwire
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType); // Actually is a book but no way to tell from metadata :(

            });
        });

        it('Dead url with correct doi', function () {
            return server.query('http://mic.sgmjournals.org/content/journal/micro/10.1099/mic.0.26954-0').then(function (res) {
                assert.status(res, 200);
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.checkCitation(res, 'Increased transcription rates correlate with increased reversion rates in leuB and argH Escherichia coli auxotrophs'); // Title from crossRef
                assert.deepEqual(res.body[0].date, '2004-05-01');
                assert.deepEqual(res.body[0].DOI, '10.1099/mic.0.26954-0');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('Get error for bibtex export', function () {
            return server.query('http://www.example.com', 'bibtex', 'en')
            .then(function (res) {
                assert.status(res, 404);
            }, function (err) {
                assert.deepEqual(err.body.Error, 'Unable to serve bibtex format at this time');
                assert.status(err, 404);
                // assert.checkError(err, 404, 'Unable to serve bibtex format at this time');
            });
        });

        it('requires cookie handling', function () {
            return server.query('www.jstor.org/discover/10.2307/3677029').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res);
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
            });
        });

        // Ensure DOI is present in non-zotero scraped page where scraping fails
        it('DOI pointing to resource that can\'t be scraped - uses crossRef', function () {
            return server.query('10.1038/scientificamerican0200-90')
            .then(function (res) {
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
        it('dx.DOI link - uses crossRef', function () {
            return server.query('http://dx.DOI.org/10.2307/3677029').then(function (res) {
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

        it('Case sensitive DOI with 5 digit registrant code and unknown genre in crossRef', function () {
            return server.query('10.14344/IOC.ML.4.4').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'IOC World Bird List 4.4');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            });
        });

        it('gets date from crossRef REST API', function () {
            return server.query('10.1016/S0305-0491(98)00022-4').then(function (res) { // Not sending the correct link to zotero - investigate
                assert.status(res, 200);
                assert.checkCitation(res, 'Energetics and biomechanics of locomotion by red kangaroos (Macropus rufus)');
                assert.deepEqual(res.body[0].date, '1998-05');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(res.body[0].itemType, 'journalArticle');
            });
        });

        it('gets editors from crossRef REST API for book-tract type', function () {
            return server.query('10.1017/isbn-9780511132971.eh1-7').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Population of the slave states, by state, race, and slave status: 1860-1870');
                assert.deepEqual(!!res.body[0].date, false); // null date in crossRef
                assert.deepEqual(!!res.body[0].editor, true); // Has editors
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(res.body[0].itemType, 'bookSection');
            });
        });

        it('gets proceedings from crossRef REST API', function () {
            return server.query('10.4271/2015-01-0821').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Simulating a Complete Performance Map of an Ethanol-Fueled Boosted HCCI Engine');
                assert.deepEqual(res.body[0].date, '2015-04-14'); // null date in crossRef
                assert.deepEqual(!!res.body[0].author, true); // Has editors
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(res.body[0].itemType, 'conferencePaper');
            });
        });

        // Prefer original url for using native scraper
        it('uses original url', function () {
            const url = 'http://www.google.com';
            return server.query(url).then(function (res) {
                assert.checkCitation(res, 'Google');
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
                assert.deepEqual(res.body[0].url, url);
            });
        });

        it('websiteTitle but no publicationTitle', function () {
            return server.query('http://blog.woorank.com/2013/04/dublin-core-metadata-for-seo-and-usability/').then(function (res) {
                assert.checkCitation(res);
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
                assert.deepEqual(!!res.body[0].websiteTitle, true, 'Missing websiteTitle field');
                assert.deepEqual(res.body[0].publicationTitle, undefined, 'Invalid field publicationTitle');
            });
        });

        it('dublinCore data with multiple identifiers in array', function () {
            return server.query('http://apps.who.int/iris/handle/10665/70863').then(function (res) {
                assert.checkCitation(res, 'Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)');
                assert.deepEqual(res.body[0].itemType, 'journalArticle');
                assert.deepEqual(res.body[0].publisher, undefined); // TODO: Investigate why this is undefined
                assert.deepEqual(res.body[0].publicationTitle, undefined); // TODO: Investigate why this is undefined
            });
        });

        it('has page range in direct scrape', function () {
            return server.query('10.1017/s0305004100013554').then(function (res) {
                assert.checkCitation(res, 'Discussion of Probability Relations between Separated Systems');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, '555–563', 'Wrong pages item; expected 555–563, got ' + res.body[0].pages);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // Unable to scrape and ends up with crossRef data
        it('DOI with redirect - Wiley', function () {
            return server.query('10.1029/94WR00436').then(function (res) {
                assert.checkCitation(res, 'A distributed hydrology-vegetation model for complex terrain');
                assert.deepEqual(res.body[0].publicationTitle, 'Water Resources Research', 'Incorrect publicationTitle; Expected "Water Resources Research", got' + res.body[0].publicationTitle);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].issue, true, 'Missing issue');
                assert.deepEqual(!!res.body[0].volume, true, 'Missing volume');
            });
        });
    });

    describe('disabled in conf', function () {

        const server = new Server();
        this.timeout(40000);

        before(() => server.start({ zotero: false }));
        after(() => server.stop());

        // PMID on NIH website that is not found in the id converter api
        // This will fail when Zotero is disabled because we no longer directly scrape pubMed central URLs,
        // as they have blocked our UA in the past.
        it('PMID not in doi id converter api', function () {
            const pmid = '14656957';
            return server.query(pmid, 'mediawiki', 'en')
            .then(function (res) {
                assert.status(res, 404);
            }, function (err) {
                assert.checkError(err, 404); // Error may be for pmcid or pmid
            });
        });

        // PMID on NIH website that is found in the id converter api- should convert to DOI
        // Uses three sources, crossref, pubmed and citoid
        it('PMCID present in doi id converter api', function () {
            return server.query('PMC3605911').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Viral Phylodynamics');
                assert.deepEqual(res.body[0].url, 'https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002947');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.isInArray(res.body[0].source, 'PubMed');
                assert.deepEqual(res.body[0].PMCID, 'PMC3605911');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].ISSN, true, 'Should contain ISSN'); // From highwire
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // JSTOR page with tabs in natively scraped title
        it('JSTOR page with tabs in natively scraped title', function () {
            return server.query('http://www.jstor.org/discover/10.2307/3677029').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Flight Feather Moult in the Red-Necked Nightjar Caprimulgus ruficollis');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].ISSN, true, 'Missing ISSN');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('Article with doi within DublinCore metadata + highwire data', function () {
            return server.query('http://www.sciencemag.org/content/303/5656/387.short').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Multiple Ebola Virus Transmission Events and Rapid Decline of Central African Wildlife');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(res.body[0].date, '2004-01-16'); // Field uses highwire data with bePress translator
                assert.deepEqual(res.body[0].DOI, '10.1126/science.1092528'); // DOI from DC metadata
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('doi spage and epage fields in crossRef coins data', function () {
            return server.query('http://dx.doi.org/10.1002/jlac.18571010113').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Ueber einige Derivate des Naphtylamins');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, '90–93', 'Missing pages'); // Uses en dash
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);

            });
        });

        it('successfully uses highwire press metadata', function () {
            return server.query('http://mic.microbiologyresearch.org/content/journal/micro/10.1099/mic.0.082289-0').then(function (res) {
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

        it('successfully uses bepress press metadata alone', function () {
            return server.query('http://uknowledge.uky.edu/upk_african_history/1/').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'South Africa and the World: The Foreign Policy of Apartheid');
                assert.deepEqual(res.body[0].author.length, 1, 'Should have 1 author');
                assert.deepEqual(res.body[0].date, '1970', 'Incorrect or missing date'); // Comes from highwire
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType); // Actually is a book but no way to tell from metadata :(

            });
        });

        it('Dead url with doi', function () {
            return server.query('http://mic.sgmjournals.org/content/journal/micro/10.1099/mic.0.26954-0').then(function (res) {
                assert.status(res, 200);
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.checkCitation(res, 'Increased transcription rates correlate with increased reversion rates in leuB and argH Escherichia coli auxotrophs'); // Title from crossRef
                assert.deepEqual(res.body[0].date, '2004-05-01');
                assert.deepEqual(res.body[0].DOI, '10.1099/mic.0.26954-0');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('Get error for bibtex export', function () {
            return server.query('http://www.example.com', 'bibtex', 'en')
            .then(function (res) {
                assert.status(res, 404);
            }, function (err) {
                assert.deepEqual(err.body.Error, 'Unable to serve bibtex format at this time');
                assert.status(err, 404);
                // assert.checkError(err, 404, 'Unable to serve bibtex format at this time');
            });
        });

        it('requires cookie handling', function () {
            return server.query('www.jstor.org/discover/10.2307/3677029').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res);
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
            });
        });

        // Ensure DOI is present in non-zotero scraped page where scraping fails
        it('DOI pointing to resource that can\'t be scraped - uses crossRef', function () {
            return server.query('10.1038/scientificamerican0200-90')
            .then(function (res) {
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
        it('dx.DOI link - uses crossRef', function () {
            return server.query('http://dx.DOI.org/10.2307/3677029').then(function (res) {
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

        it('Case sensitive DOI with 5 digit registrant code and unknown genre in crossRef', function () {
            return server.query('10.14344/IOC.ML.4.4').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'IOC World Bird List 4.4');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            });
        });

        it('gets date from crossRef REST API', function () {
            return server.query('10.1016/S0305-0491(98)00022-4').then(function (res) { // Not sending the correct link to zotero - investigate
                assert.status(res, 200);
                assert.checkCitation(res, 'Energetics and biomechanics of locomotion by red kangaroos (Macropus rufus)');
                assert.deepEqual(res.body[0].date, '1998-05');
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(res.body[0].itemType, 'journalArticle');
            });
        });

        it('gets editors from crossRef REST API for book-tract type', function () {
            return server.query('10.1017/isbn-9780511132971.eh1-7').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Population of the slave states, by state, race, and slave status: 1860-1870');
                assert.deepEqual(!!res.body[0].date, false); // null date in crossRef
                assert.deepEqual(!!res.body[0].editor, true); // Has editors
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(res.body[0].itemType, 'bookSection');
            });
        });

        it('gets proceedings from crossRef REST API', function () {
            return server.query('10.4271/2015-01-0821').then(function (res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Simulating a Complete Performance Map of an Ethanol-Fueled Boosted HCCI Engine');
                assert.deepEqual(res.body[0].date, '2015-04-14'); // null date in crossRef
                assert.deepEqual(!!res.body[0].author, true); // Has editors
                assert.isInArray(res.body[0].source, 'Crossref');
                assert.deepEqual(res.body[0].itemType, 'conferencePaper');
            });
        });

        it('PMCID but no PMID', function () {
            return server.query('PMC2096233',
                'mediawiki', 'en', 'true').then(function (res) {
                assert.status(res, 200);
                assert.deepEqual(!!res.body[0].PMCID, true, '2096233');
                assert.deepEqual(res.body[0].PMID, undefined, 'PMID is null');
            });
        });

        // Unable to scrape and ends up with crossRef data
        it('DOI with redirect - Wiley', function () {
            return server.query('10.1029/94WR00436').then(function (res) {
                assert.checkCitation(res, 'A distributed hydrology-vegetation model for complex terrain');
                assert.deepEqual(res.body[0].publicationTitle, 'Water Resources Research', 'Incorrect publicationTitle; Expected "Water Resources Research", got' + res.body[0].publicationTitle);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].issue, true, 'Missing issue');
                assert.deepEqual(!!res.body[0].volume, true, 'Missing volume');
            });
        });
    });

});
