'use strict';

/* Unit tests for the xISBN translator */

const assert = require('../../../utils/assert.js');
const oSearch = require('../../../../lib/translators/openSearch.js');

describe('openSearch translator unit tests: ', function () {

    let result;
    let expected;
    const input = {
        author: [ { name: [ 'Barrett, Daniel J.' ] } ],
        title: [ 'MediaWiki' ],
        link: [ { $: { href: 'http://worldcat.org/oclc/900464810' } } ],
        id: [ 'http://worldcat.org/oclc/474668158' ],
        updated: [ '2016-08-20T01:20:27Z' ],
        summary: [ 'MediaWiki is the world\'s most popular wiki platform, the software that runs Wikipedia and thousands of other websites. In corporate environments, MediaWiki can transform the way teams write and collaborate. This comprehensive book covers MediaWiki\'s rich (and sometimes subtle) features, helping you become a wiki expert' ],
        'dc:identifier': [ 'urn:ISBN:9780596519797', 'urn:ISBN:0596519796' ],
        'oclcterms:recordIdentifier': [ '474668158' ]
    };

    it('title', function () {
        expected = { title: 'MediaWiki' };
        result = oSearch.book.title.translate({}, input, 'title');
        assert.deepEqual(result, expected);
    });

    it('oclc', function () {
        expected = { oclc: '474668158' };
        result = oSearch.book['oclcterms:recordIdentifier'].translate({}, input, 'oclcterms:recordIdentifier');
        assert.deepEqual(result, expected);
    });

});
