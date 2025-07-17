'use strict';

const assert = require( '../../utils/assert.js' );
const Citation = require( '../../../lib/Citation.js' );

describe( 'lib/Citation.js', () => {

	let citation;

	describe( 'Constructor: ', () => {

		it( 'creates citation with initial ID', () => {
			citation = new Citation( 'doi', '10.1000/example' );
			assert.strictEqual( citation.doi, '10.1000/example' );
			assert.strictEqual( citation.idType, 'doi' );
			assert.strictEqual( citation.idValue, '10.1000/example' );
		} );

		it( 'creates citation with numeric id', () => {
			citation = new Citation( 'pmid', 12345 );
			assert.strictEqual( citation.pmid, '12345' );
			assert.strictEqual( citation.idType, 'pmid' );
			assert.strictEqual( citation.idValue, '12345' );
		} );

		it( 'throws error for non-string idType', () => {
			assert.throws( () => {
				citation = new Citation( 123, 'some value' );
				return citation;
			}, /idType must be a string/ );
		} );

		it( 'throws error for invalid idType', () => {
			assert.throws( () => {
				citation = new Citation( 'invalid-type', 'some value' );
				return citation;
			}, /Invalid idType: invalid-type/ );
		} );

		it( 'ignores idValue and creates empty citation when idType is null', () => {
			citation = new Citation( null, 'some value' );
			assert.strictEqual( citation.idType, null );
			assert.strictEqual( citation.idValue, null );
		} );

	} );

	describe( 'Setters: ', () => {

		beforeEach( () => {
			citation = new Citation();
		} );

		it( 'converts number to string', () => {
			citation.pmid = 123456;
			assert.strictEqual( citation.pmid, '123456' );
			assert.strictEqual( typeof citation.pmid, 'string' );
		} );

		it( 'keeps string values as strings', () => {
			citation.pmid = '123456';
			assert.strictEqual( citation.pmid, '123456' );
			assert.strictEqual( typeof citation.pmid, 'string' );
		} );

		it( 'handles empty string', () => {
			citation.doi = '';
			assert.strictEqual( citation.doi, '' );
			assert.strictEqual( typeof citation.doi, 'string' );
		} );

		describe( 'Special values', () => {

			it( 'keeps null as null', () => {
				citation.pmid = null;
				assert.strictEqual( citation.pmid, null );
			} );

			it( 'changes undefined to null', () => {
				citation.pmid = undefined;
				assert.strictEqual( citation.pmid, null );
			} );

			it( 'converts true to empty string', () => {
				citation.pmid = true;
				assert.strictEqual( citation.pmid, '' );
			} );

			it( 'converts false to null', () => {
				citation.pmid = false;
				assert.strictEqual( citation.pmid, null );
			} );

		} );

	} );

} );
