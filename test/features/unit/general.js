var assert = require('../../utils/assert.js');
var gen = require('../../../lib/translators/general.js');
var fixDate = require('../../../lib/Exporter.js').fixDate;
var fixLang = require('../../../lib/Exporter.js').fixLang;

describe('general translator unit', function() {

	var result;
	var expected;
	var input;

	it('Translator function strips leading and trailing whitespace', function() {
		expected = {title: 'Title of the Song'};
		result = gen.util.makeTranslator('title').translate({}, ['\nTitle of the Song \xa0']);
		assert.deepEqual(result, expected);
	});

	it('Translator function correctly adds date with fixDate validate function', function() {
		expected = {date: '2012-08-01'};
		result = gen.util.makeTranslator('date', fixDate).translate({}, ['August 2012']);
		assert.deepEqual(result, expected);
	});

	it('Translator function correctly uses fixLang validate function', function() {
		expected = {language: 'en-US'};
		result = gen.util.makeTranslator('language', fixLang).translate({}, 'en_US');
		assert.deepEqual(result, expected);
	});

	it('Author function ignores non-string arguments', function() {
		expected = {};
		result = gen.general.author.translate({}, ['One']);
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
		result = gen.general.author.translate({}, 'One');
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
		result = gen.general.author.translate({}, 'One Two');
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
		result = gen.general.author.translate({}, 'One Two Three');
		assert.deepEqual(result, expected);
	});
});
