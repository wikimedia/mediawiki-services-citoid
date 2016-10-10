'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('Exports: ', function() {

    this.timeout(20000);

    before(function () { return server.start(); });

    describe('Exporting to bibtex: ', function() {
        it('bibtex from scraper', function() {
            return server.query('http://example.com', 'bibtex').then(function(res) {
                assert.status(res, 200);
                assert.checkBibtex(res, '\n@misc{_example_???');
            });
        });

        it('bibtex from zotero', function() {
            return server.query('http://www.ncbi.nlm.nih.gov/pubmed/14656957', 'bibtex').then(function(res) {
                assert.status(res, 200);
                assert.checkBibtex(res, '\n@article{chobanian_seventh_20');
            });
        });

        it('bibtex from pmid', function() {
            return server.query('14656957', 'bibtex').then(function(res) {
                assert.status(res, 200);
                assert.checkBibtex(res, '\n@article{chobanian_seventh_20');
            });
        });

    });

    describe('Exporting to zotero: ', function() {
        it('doi pointing to bookSection', function() {
            return server.query('10.1007/11926078_68', 'zotero').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Semantic MediaWiki');
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
                assert.notDeepEqual(res.body[0].accessDate, 'CURRENT_TIMESTAMP', 'Access date uncorrected');
                assert.ok(res.body[0].creators);
                assert.deepEqual(res.body[0].DOI, undefined, 'DOI is invalid field for type bookSection');
                assert.deepEqual(res.body[0].itemType, 'bookSection', 'Wrong itemType; expected bookSection, got' + res.body[0].itemType);
            });
        });
    });

    describe('Exporting to mwDeprecated: ', function() {
        it('doi pointing to bookSection', function() {
            return server.query('10.1007/11926078_68', 'mwDeprecated').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Semantic MediaWiki');
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
                assert.notDeepEqual(res.body[0].accessDate, 'CURRENT_TIMESTAMP', 'Access date uncorrected');
                assert.ok(res.body[0]['author1-last']);
                assert.ok(res.body[0].DOI);
                assert.deepEqual(res.body[0].itemType, 'bookSection', 'Wrong itemType; expected bookSection, got' + res.body[0].itemType);
            });
        });
        it('doi pointing to Zotero gotten response with name field instead of lastName in creators object', function() {
            return server.query('10.1001/jama.296.10.1274', 'mwDeprecated').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Does This Patient With Headache Have a Migraine or Need Neuroimaging?');
                assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
                assert.notDeepEqual(res.body[0].accessDate, 'CURRENT_TIMESTAMP', 'Access date uncorrected');
                assert.ok(res.body[0]['author1-last']);
                assert.ok(res.body[0].DOI);
                assert.deepEqual(res.body[0].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[0].itemType);
            });
        });
    });
});

