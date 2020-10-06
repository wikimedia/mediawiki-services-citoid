'use strict';

/* Unit tests for the marcXML translator */

const assert = require('../../../utils/assert.js');
const marc = require('../../../../lib/translators/marcXML.js');

describe('worldcat marcXML translator unit', function () {

    let result;
    let expected;

    it('Correctly adds an author string with one word', function () {
        expected = {
            creators: [ {
                creatorType: 'author',
                firstName: '',
                lastName: 'One'
            } ]
        };
        result = marc.book.c245.translate({}, { author: 'One' }, 'author');
        assert.deepEqual(result, expected);
    });

    it('Correctly adds an author string with two words', function () {
        expected = {
            creators: [ {
                creatorType: 'author',
                firstName: 'One',
                lastName: 'Two'
            } ]
        };
        result = marc.book.c245.translate({}, { author: 'Two, One' }, 'author');
        assert.deepEqual(result, expected);
    });

    it('Correctly adds an author string with three words', function () {
        expected = {
            creators: [ {
                creatorType: 'author',
                firstName: 'One Two',
                lastName: 'Three'
            } ]
        };
        result = marc.book.c245.translate({}, { author: 'Three, One Two' }, 'author');
        assert.deepEqual(result, expected);
    });

    it('Correctly adds an author string with date', function () {
        expected = {
            creators: [ {
                creatorType: 'author',
                firstName: 'Jeffrey',
                lastName: 'Silverthorne'
            } ]
        };
        result = marc.book.c245.translate({}, { author: 'Silverthorne, Jeffrey, 1946-' }, 'author');
        assert.deepEqual(result, expected);
    });

    it('Format Last name, first name', function () {
        expected = {
            creators: [ {
                'creatorType': 'author',
                'firstName': 'Daniel J.',
                'lastName': 'Barrett'
            } ]
        };
        result =  marc.book.c245.translate({}, { author: 'Barrett, Daniel J.' }, 'author');
        assert.deepEqual(result, expected);
    });
});
