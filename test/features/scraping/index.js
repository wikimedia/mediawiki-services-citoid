'use strict';

const assert = require('../../utils/assert.js');
const Server = require('../../utils/server.js');

describe('Native scraper:', function () {

    this.timeout(20000);
    const server = new Server();
    before(() => server.start());
    after(() => server.stop());

    // Fake url but with info in crossRef that can be pulled from doi in url - uses requestFromURL & crossRef
    it('doi in url with query parameters - uses Zotero', function () {
        return server.query('http://www.example.com/10.1086/378695?uid=3739832&uid=2&uid=4&uid=3739256&sid=21105503736473').then(function (res) {
            assert.checkZotCitation(res, 'Salaries, Turnover, and Performance in the Federal Criminal Justice System');
            assert.deepEqual(res.body[0].issue, '1');
            assert.deepEqual(res.body[0].volume, '47');
            assert.deepEqual(res.body[0].date, '2004-04-01');
            assert.deepEqual(res.body[0].DOI, '10.1086/378695');
            assert.deepEqual(res.body[0].author.length, 1);
        });
    });

});
