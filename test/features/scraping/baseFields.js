'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('correctly gets base fields instead of more specific fields', function() {

    this.timeout(40000);

    before(function () { return server.start(); });

    describe(' using zotero results', function() {

        it('bookSection', function() {
            return server.query('10.1007/11926078_68', 'mediawiki', 'en', '1').then(function(res) {
                assert.status(res, 200);
                assert.deepEqual(!!res.body[0].publicationTitle, true, 'Missing publicationTitle field');
                assert.deepEqual(!!res.body[0].bookTitle, true, 'Missing bookTitle field');
                //TODO replace above line with below line once backwards compatibility is no longer needed
                //assert.deepEqual(res.body[0].bookTitle, undefined, 'Invalid field bookTitle');
            });
        });

        it('encyclopediaArticle', function() {
            return server.query('http://fr.wikipedia.org/w/index.php?title=Ninja_Turtles_(film)&oldid=115125238',
                'mediawiki', 'en', 'true').then(function(res) {
                assert.status(res, 200);
                assert.deepEqual(!!res.body[0].publicationTitle, true, 'Missing publicationTitle field');
                assert.deepEqual(!!res.body[0].encyclopediaTitle, true, 'Missing encyclopediaTitle field');
                //TODO replace above line with below line once backwards compatibility is no longer needed
                //assert.deepEqual(res.body[0].encyclopediaTitle, undefined, 'Invalid field encyclopediaTitle');
            });
        });

        //TODO: Add test for creator field basefields

    });

    describe(' using native scraper', function() {

        it('webpage', function() {
            return server.query('http://blog.woorank.com/2013/04/dublin-core-metadata-for-seo-and-usability/',
                'mediawiki', 'en', 'true').then(function(res) {
                assert.status(res, 200);
                assert.deepEqual(!!res.body[0].publicationTitle, true, 'Missing publicationTitle field');
                assert.deepEqual(!!res.body[0].websiteTitle, true, 'Missing websiteTitle field');
                //assert.deepEqual(res.body[0].websiteTitle, undefined, 'Invalid field websiteTitle');
            });
        });

    });

});

