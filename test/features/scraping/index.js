'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('scraping', function() {

    this.timeout(40000);

    before(function () { return server.start(); });

    describe(' using zotero results', function() {
        //PMID on NIH website that is not found in the id converter api
        it('PMID (not in id converter)', function() {
            return server.query('14656957').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Seventh report of the Joint National Committee on Prevention, Detection, Evaluation, and Treatment of High Blood Pressure');
                assert.deepEqual(!!res.body[0].PMID, true, 'Missing PMID');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('PMCID with prefix', function() {
            return server.query('PMC3605911').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Viral Phylodynamics');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('PMCID without prefix', function() {
            return server.query('3605911').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Viral Phylodynamics');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('PMCID with trailing space', function() {
            return server.query('3605911 ').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Viral Phylodynamics');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        it('PMCID with encoded space', function() {
            return server.query('3605911%20').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Viral Phylodynamics');
                assert.deepEqual(!!res.body[0].PMCID, true, 'Missing PMCID');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // DOI which points directly to a resource which can be scraped by Zotero
        it('direct DOI', function() {
            return server.query('10.1056/NEJM200106073442306').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, '1764–1772', 'Wrong pages item; expected e1002947, got ' + res.body[0].pages);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // DOI extracted from within a string
        it('DOI with space', function() {
            return server.query('DOI: 10.1056/NEJM200106073442306').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, '1764–1772', 'Wrong pages item; expected e1002947, got ' + res.body[0].pages);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // DOI which points to a link which contains further redirects to the Zotero-scrapable resource
        it('DOI with redirect', function() {
            return server.query('10.1371/journal.pcbi.1002947').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, 'e1002947', 'Wrong pages item; expected e1002947, got ' + res.body[0].pages);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        /* FIXME: determine why exactly this test is not passing any more and re-enable it */
        // DOI which needs User-Agent to be set in order to detect the redirect
        it.skip('DOI with User-Agent set', function() {
            return server.query('10.1088/0004-637X/802/1/65').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'The 2012 Flare of PG 1553+113 Seen with H.E.S.S. and Fermi-LAT');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, '65', 'Wrong pages item; expected 65, got ' + res.body[0].pages);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });
        /* END FIXME */

        // Ensure DOI is present in zotero scraped page when requested from link containing DOI
        it('non-dx.DOI link with DOI pointing to resource in zotero with no DOI', function() {
            return server.query('http://link.springer.com/chapter/10.1007/11926078_68').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            });
        });

        // Ensure DOI is present in zotero scraped page when requested from DOI
        it('DOI pointing to resource in zotero with no DOI', function() {
            return server.query('10.1007/11926078_68').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            });
        });

        // Ensure DOI is present in non-zotero scraped page when request from DOI link
        it('dx.DOI link pointing to resource in zotero with no DOI', function() {
            return server.query('http://dx.DOI.org/10.1007/11926078_68').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            });
        });

        // Ensure DOI is present in non-zotero scraped page when request from DOI link
        it('DOI which requires cookie to properly follow redirect to Zotero; no results from crossRef', function() {
            return server.query('10.1642/0004-8038(2005)122[0673:PROAGP]2.0.CO;2').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Phylogenetic relationships of antpitta genera (passeriformes: formicariidae)');
                assert.deepEqual(res.body[0].publicationTitle, 'The Auk', 'Incorrect publicationTitle; Expected The Auk, got' + res.body[0].publicationTitle);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(!!res.body[0].issue, true, 'Missing issue');
                assert.deepEqual(!!res.body[0].volume, true, 'Missing volume');
            });
        });

        it('doi pointing to bookSection', function() {
            return server.query('10.1007/11926078_68').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Semantic MediaWiki');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].itemType, 'bookSection', 'Wrong itemType; expected bookSection, got' + res.body[0].itemType);
            });
        });

        // Fake url but with info in cross ref that can be pulled from doi in url - uses requestFromDOI & zotero
        it('doi in url with query parameters- uses Zotero', function() {
            return server.query('example.com/10.1086/378695?uid=3739832&uid=2&uid=4&uid=3739256&sid=21105503736473').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Salaries, Turnover, and Performance in the Federal Criminal Justice System');
                assert.deepEqual(res.body[0].DOI, '10.1086/378695');
            });
        });

        // Ensure html tags are stripped out of title
        it('zotero gives us html tags in title', function() {
            return server.query('http://fr.wikipedia.org/w/index.php?title=Ninja_Turtles_(film)&oldid=115125238').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Ninja Turtles (film)');
                assert.deepEqual(res.body[0].itemType, 'encyclopediaArticle', 'Wrong itemType; expected encyclopediaArticle, got' + res.body[0].itemType);
            });
        });

        it('doi with US style date', function() {
            return server.query('10.1542/peds.2007-2362').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Management of Children With Autism Spectrum Disorders');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].date, '2007-11-01', 'Incorrect date; expected 2007-11-01, got ' + res.body[0].date);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);

            });
        });

        it('fixes en dash in zotero results', function() {
            return server.query('http://onlinelibrary.wiley.com/doi/10.1111/j.2044-835X.1998.tb00748.x/abstract').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Emotional instability as an indicator of strictly timed infantile developmental transitions');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].pages, '15–44');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);

            });
        });

        // Correctly adds authors from zotero 'name' field
        it('Correctly skips bad authors from Zotero whilst converting to mediawiki format', function() {
            return server.query('http://dx.doi.org/10.1001/jama.296.10.1274').then(function(res) {
                var expectedAuthor = [
                    [ '', 'Detsky ME'],
                    ['','McDonald DR'],
                    ['', 'Baerlocher MO'],
                    ['','Tomlinson GA'],
                    ['','McCrory DC'],
                    ['','Booth CM']
                ];
                assert.status(res, 200);
                assert.checkCitation(res, 'DOes this patient with headache have a migraine or need neuroimaging?'); // Title from crossRef
                assert.deepEqual(res.body[0].author, expectedAuthor);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // The following tests require the WMF fork of the zotero translators, as found
        // here: https://gerrit.wikimedia.org/r/mediawiki/services/zotero/translators
        describe(' uses WMF translator fork', function() {
            // This test will pass with either repository since the output should be the same.
            it('Google books link that cause Zotero to have internal server error', function() {
                return server.query('https://www.google.co.uk/search?tbm=bks&hl=en&q=isbn%3A0596554141').then(function(res) {
                    assert.status(res, 200);
                    assert.checkCitation(res, 'isbn%3A0596554141 - Google Search');
                    assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
                });
            });

            it('Google books link that lacks native url field', function() {
                return server.query('http://books.google.de/books?hl=en&lr=&id=Ct6FKwHhBSQC&oi=fnd&pg=PP9&dq=%22Peggy+Eaton%22&ots=KN-Z0-HAcv&sig=snBNf7bilHi9GFH4-6-3s1ySI9Q&redir_esc=y#v=onepage&q=%22Peggy%20Eaton%22&f=false').then(function(res) {
                    assert.status(res, 200);
                    assert.checkZotCitation(res, 'Some American Ladies: Seven Informal Biographies ...');
                });
            });

        });

    });

    describe(' using native scraper', function() {

        it('example domain', function() {
            return server.query('example.com').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Example Domain');
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
            });
        });

        // Prefer original url for using native scraper
        it('uses original url', function() {
            var url = 'http://www.google.com';
            return server.query(url).then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Google');
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
                assert.deepEqual(res.body[0].url, url);
            });
        });

        it('websiteTitle but no publicationTitle', function() {
            return server.query('http://blog.woorank.com/2013/04/dublin-core-metadata-for-seo-and-usability/').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res);
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
                assert.deepEqual(!!res.body[0].websiteTitle, true, 'Missing websiteTitle field');
                assert.deepEqual(res.body[0].publicationTitle, undefined, 'Invalid field publicationTitle');
            });
        });

        it('requires cookie handling', function() {
            return server.query('www.jstor.org/discover/10.2307/3677029').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res);
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
            });
        });

        // Ensure DOI is present in non-zotero scraped page when requested from DOI
        it('DOI pointing to resource not in zotero', function() {
            return server.query('10.2307/3677029').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res);
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].websiteTitle, undefined, 'Unexpected field websiteTitle');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // Ensure DOI is present in non-zotero scraped page when request from DOI link
        it('dx.DOI link pointing to resource not in zotero - uses crossRef', function() {
            return server.query('http://dx.DOI.org/10.2307/3677029').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Flight Feather Moult in the Red-Necked Nightjar Caprimulgus ruficollis');
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
                assert.checkZotCitation(res, 'IOC World Bird List 4.4');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
            });
        });

        // Ensure DOI is present in non-zotero scraped page where scraping fails
        it('DOI pointing to resource that can\'t be scraped - uses crossRef', function() {
            return server.query('10.1038/scientificamerican0200-90')
            .then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res);
                assert.deepEqual(!!res.body[0].author, true, 'Missing authors');
                assert.deepEqual(!!res.body[0].issue, true, 'Missing issue');
                assert.deepEqual(!!res.body[0].volume, true, 'Missing volume');
                assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
                assert.deepEqual(res.body[0].websiteTitle, undefined, 'Unexpected field websiteTitle');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

        // Fake url but with info in cross ref that can be pulled from doi in url - uses requestFromURL & crossRef
        it('doi in url with query parameters - uses crossRef', function() {
            return server.query('http://www.example.com/10.1086/378695?uid=3739832&uid=2&uid=4&uid=3739256&sid=21105503736473').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Salaries, Turnover, and Performance in the Federal Criminal Justice System*');
                assert.deepEqual(res.body[0].DOI, '10.1086/378695');
                assert.deepEqual(res.body[0].author.length, 1);
            });
        });

        // URL with string that previously matched doi regex but shouldn't
        it('url with pseudo doi', function() {
            return server.query('http://g2014results.thecgf.com/athlete/weightlifting/1024088/dika_toua.html').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Glasgow 2014 - Dika Toua Profile');
                assert.deepEqual(!!res.body[0].DOI, false);
            });
        });

        // Article with publisher field filled in with dublinCore metadata (general has it too as fallback)
        it('Article with doi and DublinCore metadata', function() {
            return server.query('http://mic.sgmjournals.org/content/journal/micro/10.1099/mic.0.26954-0').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Increased transcription rates correlate with increased reversion rates in leuB and argH Escherichia coli auxotrophs'); // Title from crossRef
                assert.deepEqual(res.body[0].date, '2004-05-01');
                assert.deepEqual(res.body[0].DOI, '10.1099/mic.0.26954-0');
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });

    });

});

