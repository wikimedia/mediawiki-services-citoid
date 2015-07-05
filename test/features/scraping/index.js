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
				assert.deepEqual(res.body[0].pages, '1764-1772', 'Wrong pages item; expected e1002947, got ' + res.body[0].pages);
				assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
			});
		});

		// DOI extracted from within a string
		it('DOI with space', function() {
			return server.query('DOI: 10.1056/NEJM200106073442306').then(function(res) {
				assert.status(res, 200);
				assert.checkZotCitation(res);
				assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
				assert.deepEqual(res.body[0].pages, '1764-1772', 'Wrong pages item; expected e1002947, got ' + res.body[0].pages);
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

		it('doi pointing to bookSection', function() {
			return server.query('10.1007/11926078_68').then(function(res) {
				assert.status(res, 200);
				assert.checkZotCitation(res, 'Semantic MediaWiki');
				assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
				assert.deepEqual(res.body[0].itemType, 'bookSection', 'Wrong itemType; expected bookSection, got' + res.body[0].itemType);
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

		it('open graph', function() {
			return server.query('http://www.pbs.org/newshour/making-sense/care-peoples-kids/').then(function(res) {
				assert.status(res, 200);
				assert.checkCitation(res);
				assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
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
		it('dx.DOI link pointing to resource not in zotero', function() {
			return server.query('http://dx.DOI.org/10.2307/3677029').then(function(res) {
				assert.status(res, 200);
				assert.checkCitation(res);
				assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
				assert.deepEqual(res.body[0].websiteTitle, undefined, 'Unexpected field websiteTitle');
				assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
			});
		});

		// Ensure DOI is present in non-zotero scraped page where scraping fails
		it('DOI pointing to resource that can\'t be scraped', function() {
			return server.query('10.1038/scientificamerican0200-90')
			.then(function(res) {
				assert.status(res, 520);
			}, function(res) {
				assert.status(res, 520);
				assert.checkCitation(res);
				assert.deepEqual(res.body[0].websiteTitle, undefined, 'Unexpected field websiteTitle');
				assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
				assert.deepEqual(!!res.body[0].DOI, true, 'Missing DOI');
			});
		});

	});

});

