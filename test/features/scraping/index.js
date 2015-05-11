'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('scraping', function() {

	this.timeout(40000);

	before(function () { return server.start(); });

	//PMID on NIH website that is not found in the id converter api
	it('pmid (not in id converter)', function() {
		return server.query('14656957').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res, 'Seventh report of the Joint National Committee on Prevention, Detection, Evaluation, and Treatment of High Blood Pressure');
			assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
		});
	});

	it('pmcid with prefix', function() {
		return server.query('PMC3605911').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res, 'Viral Phylodynamics');
			assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
		});
	});

	it('pmcid without prefix', function() {
		return server.query('3605911').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res, 'Viral Phylodynamics');
			assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
		});
	});

	it('example domain', function() {
		return server.query('example.com').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res, 'Example Domain');
		});
	});

	// DOI which points directly to a resource which can be scraped by Zotero
	it('direct doi', function() {
		return server.query('10.1056/NEJM200106073442306').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res);
			assert.deepEqual(res.body[0].pages, '1764-1772', 'Wrong pages item; expected e1002947, got ' + res.body[0].pages);
			assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
		});
	});

	// DOI which points to a link which contains further redirects to the Zotero-scrapable resource
	it('doi with redirect', function() {
		return server.query('doi: 10.1371/journal.pcbi.1002947').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res);
			assert.deepEqual(res.body[0].pages, 'e1002947', 'Wrong pages item; expected e1002947, got ' + res.body[0].pages);
			assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
		});
	});

	it('open graph', function() {
		return server.query('http://www.pbs.org/newshour/making-sense/care-peoples-kids/').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res);
		});
	});

	it('websiteTitle + publicationTitle', function() {
		return server.query('http://blog.woorank.com/2013/04/dublin-core-metadata-for-seo-and-usability/').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res);
			assert.notDeepEqual(res.body[0].websiteTitle, undefined, 'Missing websiteTitle field');
			assert.notDeepEqual(res.body[0].publicationTitle, undefined, 'Missing publicationTitle field');
		});
	});

	it('requires cookie handling', function() {
		return server.query('www.jstor.org/discover/10.2307/3677029').then(function(res) {
			assert.status(res, 200);
			assert.checkCitation(res);
		});
	});

});
