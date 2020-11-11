'use strict';

const assert = require('../../utils/assert.js');
const scraper = require('../../../lib/Scraper.js');
const fs = require('fs');
const cheerio = require('cheerio');

describe('lib/Scraper.js functions: ', function() {

    let result;
    let expected;
    const logger = { // Dummy logger
        log: function () {}
    };

    describe('matchIDs function: ', function() {

        let metadata = {};
        let citationObj = {};

        it('gets doi from bePress string', () => {
            citationObj = {};
            metadata = {
                bePress: {
                    doi: '10.100/example'
                }
            };
            expected = { doi: '10.100/example' };
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('gets doi from bePress Array', () => {
            citationObj = {};
            metadata = {
                bePress: {
                    doi: [ 'puppies', '10.100/example' ]
                }
            };
            expected = { doi: '10.100/example' };
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('gets doi from highwirePress string', () => {
            citationObj = {};
            metadata = {
                highwirePress: {
                    doi: '10.100/example'
                }
            };
            expected = { doi: '10.100/example' };
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('gets doi from highwirePress Array', () => {
            citationObj = {};
            metadata = {
                highwirePress: {
                    doi: [ 'puppies', '10.100/example' ]
                }
            };
            expected = { doi: '10.100/example' };
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('gets doi from dublinCore string', () => {
            citationObj = {};
            metadata = {
                dublinCore: {
                    identifier: '10.100/example'
                }
            };
            expected = { doi: '10.100/example' };
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('gets doi from dublinCore Array', () => {
            citationObj = {};
            metadata = {
                dublinCore: {
                    identifier: [ 'puppies', '10.100/example' ]
                }
            };
            expected = { doi: '10.100/example' };
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('Returns empty metadata from empty object', () => {
            citationObj = {};
            metadata = {};
            expected = {};
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('Multiple metadata types', () => {
            citationObj = {};
            metadata = {
                dublinCore: {
                    identifier: [ 'puppies', '10.100/example' ]
                },
                highwirePress: {
                    doi: '10.100/example2'
                },
                bePress: {
                    doi: '10.100/example3'
                }
            };
            expected = { doi: '10.100/example' };
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });
    });

    describe('parsing', function() {

        it('should scrape meta tag charset content', (done) => {
            const results = scraper.contentTypeFromBody(cheerio.load(fs.readFileSync('test/utils/static/metacharset.html')));
            if (results !== 'iso-8859-1') {
                throw new Error('Expected to iso-8859-1; got ' + results);
            }
            done();
        });

    });
});
