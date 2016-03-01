/* Unit tests for the general translator */

var assert = require('../../../utils/assert.js');
var gen = require('../../../../lib/translators/general.js');

describe('general translator unit', function() {

    var result;
    var expected;
    var input;

    it('Author function adds lists of strings', function() {
        expected = {
            creators: [{
                creatorType: 'author',
                firstName: '',
                lastName: 'One'
            }]
        };
        result = gen.generalWithAuthor.creator.translate({}, {author:['One']}, 'author');
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
        result = gen.generalWithAuthor.creator.translate({}, {author:'One'}, 'author');
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
        result = gen.generalWithAuthor.creator.translate({}, {author:'One Two'}, 'author');
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
        result = gen.generalWithAuthor.creator.translate({}, {author:'One Two Three'}, 'author');
        assert.deepEqual(result, expected);
    });
});
