'use strict';

/* Unit tests for the translators/util.js functions */

const assert = require('../../../utils/assert.js');
const ex = require('../../../../lib/Exporter.js');
const ut = require('../../../../lib/translators/util/index.js');

const makeTranslator = ut.makeTranslator;
const makePagesTranslator = ut.makePagesTranslator;
const makeListTranslator = ut.makeListTranslator;

const fixDate = ex.fixDate;
const fixLang = ex.fixLang;
const vISBN = ex.validateISBN;

describe('translator utilities: ', function () {

    let result;
    let expected;
    let input;
    let author;
    let contributor;

    describe('makeTranslator function: ', function () {

        it('strips leading and trailing whitespace', function () {
            expected = { title: 'Title of the Song' };
            result = makeTranslator('title').translate({}, { title: [ '\nTitle of the Song \xa0' ] }, 'title');
            assert.deepEqual(result, expected);
        });

        it('correctly adds date with fixDate validate function', function () {
            expected = { date: '2012-08' };
            result = makeTranslator('date', fixDate).translate({}, { date: [ 'August 2012' ] }, 'date');
            assert.deepEqual(result, expected);
        });

        it('correctly uses fixLang validate function', function () {
            expected = { language: 'en-US' };
            result = makeTranslator('language', fixLang).translate({}, { date: 'en_US' }, 'date');
            assert.deepEqual(result, expected);
        });
    });

    describe('makePagesTranslator function: ', function () {

        it('Uses spage and epage', function () {
            expected = { pages: '32–45' };
            result = makePagesTranslator('pages', 'spage', 'epage').translate({}, { spage: '32', epage: '45' }, 'spage');
            assert.deepEqual(result, expected);
        });

        it('Uses optional pages arg and converts - to en dash', function () {
            expected = { pages: '12–13' };
            result = makePagesTranslator('pages', 'spage', 'epage', 'pages').translate({}, { spage: '32', epage: '45', 'pages': '12-13' }, 'spage');
            assert.deepEqual(result, expected);
        });
    });

    describe('makeListTranslator function: ', function () {

        it('Correctly adds one isbn', function () {
            input = [ '978-3-16-148410-0' ];
            expected = {
                ISBN: '978-3-16-148410-0'
            };
            result = makeListTranslator('ISBN').translate({}, { isbn: input }, 'isbn');
            assert.deepEqual(result, expected);
        });

        it('Correctly uses isbn validate function', function () {
            input = [ '978-3-16-148410-0' ];
            expected = {
                ISBN: '9783161484100'
            };
            result = makeListTranslator('ISBN', vISBN).translate({}, { isbn: input }, 'isbn');
            assert.deepEqual(result, expected);
        });

        it('Correctly uses issn validate function', function () {
            const inputISSN = [ '1234-5678' ];
            expected = {
                ISSN: '1234-5678'
            };
            result = makeListTranslator('ISSN').translate({}, { issn: inputISSN }, 'issn');
            assert.deepEqual(result, expected);
        });

        it('Correctly adds two issn and one eissn', function () {
            const inputISSN = [ '1111-1111, 4444-4444' ];
            const inputEISSN = [ '2222-2222' ];
            expected = {
                ISSN: '1111-1111, 4444-4444, 2222-2222'
            };
            result = makeListTranslator('ISSN').translate({}, { issn: inputISSN }, 'issn');
            result = makeListTranslator('ISSN').translate(result, { issn: inputEISSN }, 'issn');
            assert.deepEqual(result, expected);
        });

        it('Correctly adds two isbn', function () {
            const inputISBN = [ '978-3-16-148410-0', '978-9-99-999999-X' ];
            expected = {
                ISBN: '978-3-16-148410-0, 978-9-99-999999-X'
            };
            result = makeListTranslator('ISBN').translate({}, { isbn: inputISBN }, 'isbn');
            assert.deepEqual(result, expected);
        });
    });

    describe('makeCreatorsTranslator function: ', function () {

        it('Name as written', function () {
            input = [ 'Daniel J. Barrett' ];
            expected = {
                creators: [ {
                    'creatorType': 'author',
                    'firstName': '',
                    'lastName': 'Daniel J. Barrett'
                } ]
            };
            result = ut.makeCreatorsTranslator('author').translate({}, { author: input }, 'author');
            assert.deepEqual(result, expected);
        });

        it('Format Last name, first name', function () {
            input = [ 'Barrett, Daniel J.' ];
            expected = {
                creators: [ {
                    'creatorType': 'author',
                    'firstName': '',
                    'lastName': 'Barrett, Daniel J.'
                } ]
            };
            result = ut.makeCreatorsTranslator('author').translate({}, { author: input }, 'author');
            assert.deepEqual(result, expected);
        });

        it('Adds two different contributor types', function () {
            author = 'J.K. Rowling';
            contributor = 'Mary GrandPré';
            expected = {
                creators: [ {
                    'creatorType': 'author',
                    'firstName': '',
                    'lastName': 'J.K. Rowling'
                },
                {
                    'creatorType': 'contributor',
                    'firstName': '',
                    'lastName': 'Mary GrandPré'
                } ]
            };
            result = ut.makeCreatorsTranslator('author').translate({}, { author: author }, 'author');
            result = ut.makeCreatorsTranslator('contributor').translate(result, { contributor: contributor }, 'contributor');
            assert.deepEqual(result, expected);
        });

    });
});
