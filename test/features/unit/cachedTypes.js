'use strict';

const assert = require( '../../utils/assert.js' );
const CachedTypes = require( '../../../lib/zotero/cachedTypes.js' );

describe( 'cachedTypes', () => {

	const types = new CachedTypes();
	let result;
	let expected;

	describe( 'zotero methods', () => {

		it( 'returns false if no base types exist', () => {
			result = types.getBaseFields( 'note' );
			expected = false;
			assert.deepEqual( result, expected );
		} );

		it( 'gets base types - no creators', () => {
			result = types.getBaseFields( 'webpage' );
			expected = {
				websiteType: 'type',
				websiteTitle: 'publicationTitle'
			};
			assert.deepEqual( result, expected );
		} );

		it( 'gets base types - with creators', () => {
			result = types.getBaseFields( 'computerProgram' );
			expected = {
				company: 'publisher',
				programmer: 'author'
			};
			assert.deepEqual( result, expected );
		} );

	} );

	describe( 'creator types methods', () => {
		it( 'gets creator type ids', () => {
			result = types.creatorTypesMethods.getTypesForItemType( 2 );
			expected = [
				{
					id: 1,
					name: 'author'
				},
				{
					id: 2,
					name: 'contributor'
				},
				{
					id: 3,
					name: 'editor'
				},
				{
					id: 5,
					name: 'seriesEditor'
				},
				{
					id: 4,
					name: 'translator'
				}
			];
			assert.deepEqual( result, expected );
		} );

		it( 'returns empty list if no create type ids exist', () => {
			result = types.creatorTypesMethods.getTypesForItemType( 1 );
			expected = [];
			assert.deepEqual( result, expected );
		} );

		it( 'gets primary creator id from type', () => {
			result = types.creatorTypesMethods.getPrimaryIDForType( 'webpage' );
			expected = 1;
			assert.deepEqual( result, expected );
		} );

		it( 'gets creator name from id', () => {
			result = types.creatorTypesMethods.cachedTypeMethods.getName( 1 );
			expected = 'author';
			assert.deepEqual( result, expected );
		} );

		it( 'gets primary creator id from name', () => {
			result = types.creatorTypesMethods.cachedTypeMethods.getID( 'author' );
			expected = 1;
			assert.deepEqual( result, expected );
		} );

		it( 'determines if creatorType valid for type- true', () => {
			result = types.creatorTypesMethods.isValidForType( 'programmer', 'computerProgram' );
			expected = true;
			assert.deepEqual( result, expected );
		} );

		it( 'determines if creatorType valid for type- false', () => {
			result = types.creatorTypesMethods.isValidForType( 'elephant', 'computerProgram' );
			expected = false;
			assert.deepEqual( result, expected );
		} );

	} );

	describe( 'item fields methods', () => {
		it( 'determines if id is valid for type- false', () => {
			result = types.itemFieldsMethods.isValidForType( 'publicationTitle', 'webpage' );
			expected = false;
			assert.deepEqual( result, expected );
		} );

		it( 'determines if id is valid for type- true', () => {
			result = types.itemFieldsMethods.isValidForType( 'websiteTitle', 'webpage' );
			expected = true;
			assert.deepEqual( result, expected );
		} );

		it( 'determines if creator field is valid for type- true', () => {
			result = types.itemFieldsMethods.isValidForType( 'creators', 'webpage' );
			expected = true;
			assert.deepEqual( result, expected );
		} );

		it( 'determines if creator field is valid for type- false', () => {
			result = types.itemFieldsMethods.isValidForType( 'creators', 'note' );
			expected = true;
			assert.deepEqual( result, expected );
		} );

		it( 'get field id from type and base', () => {
			result = types.itemFieldsMethods.getFieldIDFromTypeAndBase( 'webpage', 'publicationTitle' );
			expected = 91;
			assert.deepEqual( result, expected );
		} );

		it( 'get base id from type and field', () => {
			result = types.itemFieldsMethods.getBaseIDFromTypeAndField( 'webpage', 'websiteTitle' );
			expected = 12;
			assert.deepEqual( result, expected );
		} );

		it( 'get item type fields', () => {
			result = types.itemFieldsMethods.getItemTypeFields( 'webpage' );
			expected = [
				110,
				90,
				91,
				70,
				14,
				116,
				1,
				27,
				87,
				2,
				22
			];

			assert.deepEqual( result, expected );
		} );

		it( 'gets field name from id', () => {
			result = types.itemFieldsMethods.cachedTypeMethods.getName( 1 );
			expected = 'url';
			assert.deepEqual( result, expected );
		} );

		it( 'gets id from field name', () => {
			result = types.itemFieldsMethods.cachedTypeMethods.getID( 'url' );
			expected = 1;
			assert.deepEqual( result, expected );
		} );

	} );

} );
