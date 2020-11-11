'use strict';

/* Unit tests for the coins translator */

const assert = require('../../../utils/assert.js');
const coins = require('../../../../lib/translators/coins.js');

describe('coins metadata', function() {

    let result;
    let expected;
    let metadata;
    let citation;

    it('Correctly adds pages from spage and epage', function() {
        metadata = {
            spage: '97',
            epage: '102'
        };
        expected = {
            itemType: 'bookSection',
            pages: '97–102'
        };
        result = coins.other.spage({ itemType: 'bookSection' }, metadata);
        assert.deepEqual(result, expected);
    });

    it('Correctly fixes en dash in pages fields', function() {
        expected = {
            pages: '15–44'
        };
        result = coins.bookSection.pages.translate({}, { pages: '15-44' }, 'pages');
        assert.deepEqual(result, expected);
    });

    it('Correctly adds date', function() {
        expected = {
            date: '2010'
        };
        result = coins.general.date.translate({}, { date: '2010' }, 'date');
        assert.deepEqual(result, expected);
    });

    describe('exports.other.addCreators function', function() {

        it('Doesn\'t add empty creators field', function() {
            citation = {
                itemType: 'journalArticle'
            };
            metadata = {
            };
            result = coins.other.addCreators(citation, metadata);
            expected = {
                itemType: 'journalArticle'
            };
            assert.deepEqual(result, expected);
        });

        it('Doesn\'t add creators field if missing itemType', function() {
            expected = {
            };
            citation = {};
            metadata = {
                aulast: 'Lastname',
                aufirst: 'Firstname',
                ausuffix: 'Jr.',
                au: [ 'Firstname Lastname, Jr.' ]
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });

        // Regression from not splitting author names by default, see T218125
        it.skip('Doesn\'t add duplicate author names', function() {
            citation = {
                itemType: 'journalArticle'
            };
            expected = {
                itemType: 'journalArticle',
                creators: [ {
                    creatorType: 'author',
                    firstName: 'Firstname',
                    lastName: 'Lastname, Jr.'
                } ]
            };
            metadata = {
                aulast: 'Lastname',
                aufirst: 'Firstname',
                ausuffix: 'Jr.',
                au: [ 'Firstname Lastname, Jr.' ]
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });

        // Regression from not splitting author names by default, see T218125
        it.skip('Doesn\'t add duplicate author names with nbsp present', function() {
            citation = {
                itemType: 'journalArticle'
            };
            citation = {
                itemType: 'journalArticle',
                creators: [ {
                    creatorType: 'author',
                    firstName: 'Firstname',
                    lastName: 'Lastname, Jr.'
                } ]
            };
            metadata = {
                aulast: 'Lastname',
                aufirst: 'Firstname',
                ausuffix: 'Jr.',
                au: [ 'Firstname\xa0Lastname,\xa0Jr.' ] // Contains nbsp instead of traditional space
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });

        it('Correctly adds name with missing firstname', function() {
            citation = {
                itemType: 'journalArticle'
            };
            expected = {
                itemType: 'journalArticle',
                creators: [ {
                    creatorType: 'author',
                    firstName: '',
                    lastName: 'Lastname'
                } ]
            };
            metadata = {
                aulast: 'Lastname'
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });

        it('Correctly adds name with missing lastname', function() {
            citation = {
                itemType: 'journalArticle'
            };
            expected = {
                itemType: 'journalArticle',
                creators: [ {
                    creatorType: 'author',
                    firstName: 'Firstname',
                    lastName: ''
                } ]
            };
            metadata = {
                aufirst: 'Firstname'
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });

        it('Correctly uses auinit1 and auinitm', function() {
            citation = {
                itemType: 'journalArticle'
            };
            expected = {
                itemType: 'journalArticle',
                creators: [ {
                    creatorType: 'author',
                    firstName: 'F. M.',
                    lastName: 'Lastname'
                } ]
            };
            metadata = {
                aulast: 'Lastname',
                auinit1: 'F.',
                auinitm: 'M.'
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });

        it('Correctly uses auinit1 and auinitm', function() {
            citation = {
                itemType: 'journalArticle'
            };
            expected = {
                itemType: 'journalArticle',
                creators: [ {
                    creatorType: 'author',
                    firstName: 'F. M.',
                    lastName: 'Lastname'
                } ]
            };
            metadata = {
                aulast: 'Lastname',
                auinit: 'F. M.'
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });

        it('Correctly adds corporation names', function() {
            citation = {
                itemType: 'journalArticle'
            };
            expected = {
                itemType: 'journalArticle',
                creators: [ {
                    creatorType: 'author',
                    firstName: '',
                    lastName: 'Name of corporation'
                } ]
            };
            metadata = {
                aucorp: [
                    'Name of corporation'
                ]
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });

        it('Does not split names in au field', function() {
            citation = {
                itemType: 'journalArticle'
            };
            expected = {
                itemType: 'journalArticle',
                creators: [ {
                    creatorType: 'author',
                    firstName: '',
                    lastName: 'A. B. Cdefg'
                },
                {
                    creatorType: 'author',
                    firstName: '',
                    lastName: 'H. I. Jklmno'
                } ]
            };
            metadata = {
                au: [
                    'A. B. Cdefg',
                    'H. I. Jklmno'
                ]
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });
    });

});
