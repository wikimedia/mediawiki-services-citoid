/* Unit tests for the coins translator */

var assert = require('../../../utils/assert.js');
var coins = require('../../../../lib/translators/coins.js');


describe('coins unit', function() {

    var result;
    var expected;
    var input;
    var metadata;
    var citation;

    it('Correctly adds pages from spage and epage', function(){
        metadata = {
            spage : '97',
            epage : '102'
        };
        expected = {
            itemType : 'bookSection',
            pages: '97–102'
        };
        result = coins.other.spage({itemType: 'bookSection'}, metadata);
        assert.deepEqual(result, expected);
    });

    it('Correctly fixes en dash in pages fields', function() {
        expected = {
            pages: '15–44'
        };
        result = coins.bookSection.pages.translate({}, '15-44');
        assert.deepEqual(result, expected);
    });

    it('Correctly adds date', function() {
        expected = {
            date: '2010-01-01'
        };
        result = coins.general.date.translate({}, '2010');
        assert.deepEqual(result, expected);
    });

    it('Correctly adds one isbn', function() {
        input = ['978-3-16-148410-0'];
        expected = {
            ISBN: '978-3-16-148410-0'
        };
        result = coins.other.isbn.translate({}, input);
        assert.deepEqual(result, expected);
    });

    it('Correctly adds one issn and one eissn', function() {
        var inputISSN = ['978-3-16-148410-0'];
        var inputEISSN = ['978-9-99-000000-X'];
        expected = {
            ISSN: '978-3-16-148410-0, 978-9-99-000000-X'
        };
        result = coins.other.issn.translate({}, inputISSN);
        result = coins.other.eissn.translate(result, inputEISSN);
        assert.deepEqual(result, expected);
    });

    it('Correctly adds two issn and one eissn', function() {
        var inputISSN = ['978-3-16-148410-0', '978-9-99-999999-X'];
        var inputEISSN = ['978-9-99-000000-X'];
        expected = {
            ISSN: '978-3-16-148410-0, 978-9-99-999999-X, 978-9-99-000000-X'
        };
        result = coins.other.issn.translate({}, inputISSN);
        result = coins.other.eissn.translate(result, inputEISSN);
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
                au: ['Firstname Lastname, Jr.']
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });

        it('Doesn\'t add duplicate author names', function() {
            citation = {
                itemType: 'journalArticle'
            };
            expected = {
                itemType: 'journalArticle',
                creators: [{
                    creatorType: 'author',
                    firstName: 'Firstname',
                    lastName: 'Lastname, Jr.'
                }]
            };
            metadata = {
                aulast: 'Lastname',
                aufirst: 'Firstname',
                ausuffix: 'Jr.',
                au: ['Firstname Lastname, Jr.']
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });

        it('Doesn\'t add duplicate author names with nbsp present', function() {
            citation = {
                itemType: 'journalArticle'
            };
            citation = {
                itemType: 'journalArticle',
                creators: [{
                    creatorType: 'author',
                    firstName: 'Firstname',
                    lastName: 'Lastname, Jr.'
                }]
            };
            metadata = {
                aulast: 'Lastname',
                aufirst: 'Firstname',
                ausuffix: 'Jr.',
                au: ['Firstname\xa0Lastname,\xa0Jr.'] // Contains nbsp instead of traditional space
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
                creators: [{
                    creatorType: 'author',
                    firstName: '',
                    lastName: 'Lastname'
                }]
            };
            metadata = {
                aulast: 'Lastname',
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
                creators: [{
                    creatorType: 'author',
                    firstName: 'Firstname',
                    lastName: ''
                }]
            };
            metadata = {
                aufirst: 'Firstname',
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
                creators: [{
                    creatorType: 'author',
                    firstName: 'F. M.',
                    lastName: 'Lastname'
                }]
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
                creators: [{
                    creatorType: 'author',
                    firstName: 'F. M.',
                    lastName: 'Lastname'
                }]
            };
            metadata = {
                aulast: 'Lastname',
                auinit: 'F. M.',
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
                creators: [{
                    creatorType: 'author',
                    firstName: '',
                    lastName: 'Name of corporation'
                }]
            };
            metadata = {
                aucorp: [
                    'Name of corporation'
                ]
            };
            result = coins.other.addCreators(citation, metadata);
            assert.deepEqual(result, expected);
        });

        it('Correctly adds 3 word names', function() {
            citation = {
                itemType: 'journalArticle'
            };
            expected = {
                itemType: 'journalArticle',
                creators: [{
                    creatorType: 'author',
                    firstName: 'A. B.',
                    lastName: 'Cdefg'
                },
                {
                    creatorType: 'author',
                    firstName: 'H. I.',
                    lastName: 'Jklmno'
                }]
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
