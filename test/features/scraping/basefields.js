'use strict';

const assert = require('../../utils/assert.js');
const Server = require('../../utils/server.js');

describe('correctly gets base fields instead of more specific fields', function () {

    this.timeout(20000);
    const server = new Server();

    describe(' using zotero results', function () {

        before(() => server.start());

        it('conferencePaper', function () {
            return server.query('10.1007/11926078_68', 'mediawiki-basefields', 'en').then(function (res) {
                assert.status(res, 200);
                assert.isInArray(res.body[0].source, 'Zotero', 'Expected response from Zotero');
                assert.deepEqual(!!res.body[0].publicationTitle, true, 'Missing publicationTitle field');
                assert.deepEqual(!!res.body[0].proceedingsTitle, false, 'Missing proceedingsTitle field');
            });
        });

        it('encyclopediaArticle', function () {
            return server.query('http://fr.wikipedia.org/w/index.php?title=Ninja_Turtles_(film)&oldid=115125238',
                'mediawiki-basefields', 'en', 'true').then(function (res) {
                assert.status(res, 200);
                assert.isInArray(res.body[0].source, 'Zotero', 'Expected response from Zotero');
                assert.deepEqual(!!res.body[0].publicationTitle, true, 'Missing publicationTitle field');
                assert.deepEqual(!!res.body[0].encyclopediaTitle, false, 'Missing encyclopediaTitle field');
            });
        });

        after(() => server.stop());
        // TODO: Add test for creator field basefields

    });

    describe(' using native scraper', function () {

        before(() => server.start({ zotero: false }));
        after(() => server.stop());

        it('webpage', function () {
            return server.query('http://example.com',
                'mediawiki-basefields', 'en', 'false').then(function (res) {
                assert.status(res, 200);
                assert.isNotInArray(res.body[0].source, 'Zotero', 'Unexpected response from Zotero');
                assert.deepEqual(!!res.body[0].publicationTitle, true, 'Missing publicationTitle field');
                assert.deepEqual(!!res.body[0].websiteTitle, false, 'Missing websiteTitle field');
            });
        });

    });
});
