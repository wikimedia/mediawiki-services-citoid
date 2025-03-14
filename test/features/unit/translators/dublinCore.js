'use strict';

/* Unit tests for the dublinCore translator */

const assert = require( '../../../utils/assert.js' );
const dc = require( '../../../../lib/translators/dublinCore.js' );

describe( 'dublinCore translator unit', () => {

	let result;
	let expected;

	it( 'Creator translate function adds lists of strings', () => {
		expected = {
			creators: [ {
				creatorType: 'author',
				firstName: '',
				lastName: 'One'
			} ]
		};
		result = dc.generalWithAuthor.creator.translate( {}, { author: [ 'One' ] }, 'author' );
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
		result = dc.generalWithAuthor.creator.translate( {}, { author: 'One' }, 'author' );
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
		result = dc.generalWithAuthor.creator.translate( {}, { author: 'One Two' }, 'author' );
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
		result = dc.generalWithAuthor.creator.translate( {}, { author: 'One Two Three' }, 'author' );
		assert.deepEqual( result, expected );
	} );
} );
