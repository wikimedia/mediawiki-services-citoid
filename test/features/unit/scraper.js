var assert = require('../../utils/assert.js');
var scraper = require('../../../lib/Scraper.js');


describe('lib/Scraper.js functions: ', function() {

    let result;
    let expected;
    let logger = { // Dummy logger
        log: function(){}
    };

    describe('matchIDs function: ', function() {

        let metadata = {};
        let citationObj = {};

        it('gets doi from bePress string', function() {
            citationObj = {};
            metadata = {
                bePress: {
                    doi: "10.100/example"
                }
            };
            expected = {doi: "10.100/example"};
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('gets doi from bePress Array', function() {
            citationObj = {};
            metadata = {
                bePress: {
                    doi: ["puppies", "10.100/example"]
                }
            };
            expected = {doi: "10.100/example"};
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('gets doi from highwirePress string', function() {
            citationObj = {};
            metadata = {
                highwirePress: {
                    doi: "10.100/example"
                }
            };
            expected = {doi: "10.100/example"};
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('gets doi from highwirePress Array', function() {
            citationObj = {};
            metadata = {
                highwirePress: {
                    doi: ["puppies", "10.100/example"]
                }
            };
            expected = {doi: "10.100/example"};
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('gets doi from dublinCore string', function() {
            citationObj = {};
            metadata = {
                dublinCore: {
                    identifier: "10.100/example"
                }
            };
            expected = {doi: "10.100/example"};
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('gets doi from dublinCore Array', function() {
            citationObj = {};
            metadata = {
                dublinCore: {
                    identifier: ["puppies", "10.100/example"]
                }
            };
            expected = {doi: "10.100/example"};
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('Returns empty metadata from empty object', function() {
            citationObj = {};
            metadata = {};
            expected = {};
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });

        it('Multiple metadata types', function() {
            citationObj = {};
            metadata = {
                dublinCore: {
                    identifier: ["puppies", "10.100/example"]
                },
                highwirePress: {
                    doi: "10.100/example2"
                },
                bePress: {
                    doi: "10.100/example3"
                }
            };
            expected = {doi: "10.100/example"};
            result = scraper.matchIDs(citationObj, metadata, logger);
            assert.deepEqual(result, expected);
        });
    });
});
