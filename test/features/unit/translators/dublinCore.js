/* Unit tests for the dublinCore translator */

/* Unit tests for the general translator */

var assert = require('../../../utils/assert.js');
var dc = require('../../../../lib/translators/dublinCore.js');

describe('dublinCore translator unit', function() {

    var result;
    var expected;
    var input;

    it('Creator translate function adds lists of strings', function() {
        expected = {
            creators: [{
                creatorType: 'author',
                firstName: '',
                lastName: 'One'
            }]
        };
        result = dc.generalWithAuthor.creator.translate({}, ['One']);
        assert.deepEqual(result, expected);
    });

    it('Correctly adds an author string with one word', function() {
        expected = {
            creators: [{
                creatorType: 'author',
                firstName: '',
                lastName: 'One'
            }]
        };
        result = dc.generalWithAuthor.creator.translate({}, 'One');
        assert.deepEqual(result, expected);
    });

    it('Correctly adds an author string with two words', function() {
        expected = {
            creators: [{
                creatorType: 'author',
                firstName: 'One',
                lastName: 'Two'
            }]
        };
        result = dc.generalWithAuthor.creator.translate({}, 'One Two');
        assert.deepEqual(result, expected);
    });

    it('Correctly adds an author string with three words', function() {
        expected = {
            creators: [{
                creatorType: 'author',
                firstName: 'One Two',
                lastName: 'Three'
            }]
        };
        result = dc.generalWithAuthor.creator.translate({}, 'One Two Three');
        assert.deepEqual(result, expected);
    });
});
