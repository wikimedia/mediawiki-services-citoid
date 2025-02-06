'use strict';

/* Unit tests for the general translator */

const assert = require( '../../../utils/assert.js' );
const gen = require( '../../../../lib/translators/general.js' );

describe( 'general translator unit', () => {

	let result;
	let expected;

	it( 'Author function adds lists of strings', () => {
		expected = {
			creators: [ {
				creatorType: 'author',
				firstName: '',
				lastName: 'One'
			} ]
		};
		result = gen.generalWithAuthor.author.translate( {}, { author: [ 'One' ] }, 'author' );
		assert.deepEqual( result, expected );
	} );

	it( 'Correctly adds an author string with one word', () => {
		expected = {
			creators: [ {
				creatorType: 'author',
				firstName: '',
				lastName: 'One'
			} ]
		};
		result = gen.generalWithAuthor.author.translate( {}, { author: 'One' }, 'author' );
		assert.deepEqual( result, expected );
	} );

	it( 'Correctly adds an author string with two words', () => {
		expected = {
			creators: [ {
				creatorType: 'author',
				firstName: 'One',
				lastName: 'Two'
			} ]
		};
		result = gen.generalWithAuthor.author.translate( {}, { author: 'One Two' }, 'author' );
		assert.deepEqual( result, expected );
	} );

	it( 'Correctly adds an author string with three words', () => {
		expected = {
			creators: [ {
				creatorType: 'author',
				firstName: 'One Two',
				lastName: 'Three'
			} ]
		};
		result = gen.generalWithAuthor.author.translate( {}, { author: 'One Two Three' }, 'author' );
		assert.deepEqual( result, expected );
	} );

	it( 'Does not try to split Harry Potter author field from worldcat', () => {
		expected = {
			creators: [ {
				creatorType: 'author',
				firstName: '',
				lastName: 'J.K. Rowling ; illustrations by Mary GrandPré.'
			} ]
		};
		result = gen.generalWithAuthor.author.translate( {}, { author: 'J.K. Rowling ; illustrations by Mary GrandPré.' }, 'author' );
		assert.deepEqual( result, expected );
	} );
} );
