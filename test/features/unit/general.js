var assert = require('../../utils/assert.js');
var gen = require('../../../lib/translators/general.js');


describe('general translator unit', function() {

	var result;
	var expected;
	var input;

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
