var assert = require('../../utils/assert.js');
var coins = require('../../../lib/translators/coins.js');


describe('coins unit', function() {

	var result;
	var expected;
	var input;

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

	describe('general.addAuthors function', function() {

		it('Doesn\'t add empty creators field', function() {
			expected = {
			};
			input = {
			};
			result = coins.general.addAuthors({}, input);
			assert.deepEqual(result, expected);
		});

		it('Doesn\'t add duplicate author names', function() {
			expected = {
				creators: [{
					creatorType: 'author',
					firstName: 'Firstname',
					lastName: 'Lastname, Jr.'
				}]
			};
			input = {
				aulast: 'Lastname',
				aufirst: 'Firstname',
				ausuffix: 'Jr.',
				au: ['Firstname Lastname, Jr.']
			};
			result = coins.general.addAuthors({}, input);
			assert.deepEqual(result, expected);
		});

		it('Doesn\'t add duplicate author names with nbsp present', function() {
			expected = {
				creators: [{
					creatorType: 'author',
					firstName: 'Firstname',
					lastName: 'Lastname, Jr.'
				}]
			};
			input = {
				aulast: 'Lastname',
				aufirst: 'Firstname',
				ausuffix: 'Jr.',
				au: ['Firstname\xa0Lastname,\xa0Jr.'] // Contains nbsp instead of traditional space
			};
			result = coins.general.addAuthors({}, input);
			assert.deepEqual(result, expected);
		});

		it('Correctly adds name with missing firstname', function() {
			expected = {
				creators: [{
					creatorType: 'author',
					firstName: '',
					lastName: 'Lastname'
				}]
			};
			input = {
				aulast: 'Lastname',
			};
			result = coins.general.addAuthors({}, input);
			assert.deepEqual(result, expected);
		});

		it('Correctly adds name with missing lastname', function() {
			expected = {
				creators: [{
					creatorType: 'author',
					firstName: 'Firstname',
					lastName: ''
				}]
			};
			input = {
				aufirst: 'Firstname',
			};
			result = coins.general.addAuthors({}, input);
			assert.deepEqual(result, expected);
		});

		it('Correctly uses auinit1 and auinitm', function() {
			expected = {
				creators: [{
					creatorType: 'author',
					firstName: 'F. M.',
					lastName: 'Lastname'
				}]
			};
			input = {
				aulast: 'Lastname',
				auinit1: 'F.',
				auinitm: 'M.'
			};
			result = coins.general.addAuthors({}, input);
			assert.deepEqual(result, expected);
		});

		it('Correctly uses auinit1 and auinitm', function() {
			expected = {
				creators: [{
					creatorType: 'author',
					firstName: 'F. M.',
					lastName: 'Lastname'
				}]
			};
			input = {
				aulast: 'Lastname',
				auinit: 'F. M.',
			};
			result = coins.general.addAuthors({}, input);
			assert.deepEqual(result, expected);
		});

		it('Correctly adds corporation names', function() {
			expected = {
				creators: [{
					creatorType: 'author',
					firstName: '',
					lastName: 'Name of corporation'
				}]
			};
			input = {
				aucorp: [
					'Name of corporation'
				]
			};
			result = coins.general.addAuthors({}, input);
			assert.deepEqual(result, expected);
		});

		it('Correctly adds 3 word names', function() {
			expected = {
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
			input = {
				au: [
					'A. B. Cdefg',
					'H. I. Jklmno'
				]
			};
			result = coins.general.addAuthors({}, input);
			assert.deepEqual(result, expected);
		});
	});

});
