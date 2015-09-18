/* Unit tests for the translators/util.js functions */

var assert = require('../../../utils/assert.js');
var fixDate = require('../../../../lib/Exporter.js').fixDate;
var fixLang = require('../../../../lib/Exporter.js').fixLang;
var makeTranslator = require('../../../../lib/translators/util/index.js').makeTranslator;

describe('translator utilities', function() {

	var result;
	var expected;
	var input;

	it('makeTranslator function strips leading and trailing whitespace', function() {
		expected = {title: 'Title of the Song'};
		result = makeTranslator('title').translate({}, ['\nTitle of the Song \xa0']);
		assert.deepEqual(result, expected);
	});

	it('makeTranslator function correctly adds date with fixDate validate function', function() {
		expected = {date: '2012-08-01'};
		result = makeTranslator('date', fixDate).translate({}, ['August 2012']);
		assert.deepEqual(result, expected);
	});

	it('makeTranslator function correctly uses fixLang validate function', function() {
		expected = {language: 'en-US'};
		result = makeTranslator('language', fixLang).translate({}, 'en_US');
		assert.deepEqual(result, expected);
	});

});