'use strict';

/* Unit tests for the crossRef translator */

const assert = require( '../../../utils/assert.js' );
const cr = require( '../../../../lib/translators/crossRef.js' );

describe( 'crossRef translator unit', () => {

	let result;
	let expected;
	let input;

	it( 'Creator translate function adds lists of strings', () => {
		input = {
			author: [ {
				given: 'Rachel C.',
				family: 'Glade',
				affiliation: []
			} ]
		};
		expected = {
			creators: [ {
				creatorType: 'author',
				firstName: 'Rachel C.',
				lastName: 'Glade'
			} ]
		};
		result = cr.journalArticle.author.translate( {}, input, 'author' );
		assert.deepEqual( result, expected );
	} );

	describe( 'dateParts function', () => {

		it( 'Translates full date', () => {
			input = {
				issued: {
					'date-parts': [
						[
							2017,
							1,
							23
						]
					]
				}
			};
			expected = {
				date: '2017-01-23'
			};
			result = cr.journalArticle.issued.translate( {}, input, 'issued' );
			assert.deepEqual( result, expected );
		} );

		it( 'Translates year and day', () => {
			input = {
				issued: {
					'date-parts': [
						[
							2017,
							1
						]
					]
				}
			};
			expected = {
				date: '2017-01'
			};
			result = cr.journalArticle.issued.translate( {}, input, 'issued' );
			assert.deepEqual( result, expected );
		} );

		it( 'Translates year only', () => {
			input = {
				issued: { 'date-parts': [ [ 2017 ] ] }
			};
			expected = {
				date: '2017'
			};
			result = cr.journalArticle.issued.translate( {}, input, 'issued' );
			assert.deepEqual( result, expected );
		} );

		it( 'Fails with object', () => {
			input = {
				issued: { 'date-parts': [ [ { elephant: 'elephant' } ] ] }
			};
			expected = {};
			result = cr.journalArticle.issued.translate( {}, input, 'issued' );
			assert.deepEqual( result, expected );
		} );

		it( 'Fails with list not nested', () => {
			input = {
				issued: { 'date-parts': [ '2017', '04', '1' ] }
			};
			expected = {};
			result = cr.journalArticle.issued.translate( {}, input, 'issued' );
			assert.deepEqual( result, expected );
		} );

		it( 'Works with strings date', () => {
			input = {
				issued: {
					'date-parts': [
						[
							'2017',
							'01',
							'23'
						]
					]
				}
			};
			expected = {
				date: '2017-01-23'
			};
			result = cr.journalArticle.issued.translate( {}, input, 'issued' );
			assert.deepEqual( result, expected );
		} );

		it.skip( 'Does not work with unexpected input', () => { // chrono-node no longer validates at this level
			input = {
				issued: {
					'date-parts': [
						[
							'2017',
							'elephant',
							'23'
						]
					]
				}
			};
			expected = {};
			result = cr.journalArticle.issued.translate( {}, input, 'issued' );
			assert.deepEqual( result, expected );
		} );

	} );
} );
