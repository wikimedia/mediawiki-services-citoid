'use strict';

const assert = require( '../../utils/assert.js' );
const scraper = require( '../../../lib/Scraper.js' );
const Citation = require( '../../../lib/Citation.js' );
const fs = require( 'fs' );
const cheerio = require( 'cheerio' );

describe( 'lib/Scraper.js functions: ', () => {

	let result;
	const logger = { // Dummy logger
		log: function () {}
	};

	describe( 'matchIDs function: ', () => {

		let metadata = {};
		let citationObj = {};

		it( 'gets doi from bePress string', () => {
			citationObj = new Citation();
			metadata = {
				bePress: {
					doi: '10.100/example'
				}
			};
			result = scraper.matchIDs( citationObj, metadata, logger );
			assert.deepEqual( result.doi, '10.100/example' );
		} );

		it( 'gets doi from bePress Array', () => {
			citationObj = new Citation();
			metadata = {
				bePress: {
					doi: [ 'puppies', '10.100/example' ]
				}
			};
			result = scraper.matchIDs( citationObj, metadata, logger );
			assert.deepEqual( result.doi, '10.100/example' );
		} );

		it( 'gets doi from highwirePress string', () => {
			citationObj = new Citation();
			metadata = {
				highwirePress: {
					doi: '10.100/example'
				}
			};
			result = scraper.matchIDs( citationObj, metadata, logger );
			assert.deepEqual( result.doi, '10.100/example' );
		} );

		it( 'gets doi from highwirePress Array', () => {
			citationObj = new Citation();
			metadata = {
				highwirePress: {
					doi: [ 'puppies', '10.100/example' ]
				}
			};
			result = scraper.matchIDs( citationObj, metadata, logger );
			assert.deepEqual( result.doi, '10.100/example' );
		} );

		it( 'gets doi from dublinCore string', () => {
			citationObj = new Citation();
			metadata = {
				dublinCore: {
					identifier: '10.100/example'
				}
			};
			result = scraper.matchIDs( citationObj, metadata, logger );
			assert.deepEqual( result.doi, '10.100/example' );
		} );

		it( 'gets doi from dublinCore Array', () => {
			citationObj = new Citation();
			metadata = {
				dublinCore: {
					identifier: [ 'puppies', '10.100/example' ]
				}
			};
			result = scraper.matchIDs( citationObj, metadata, logger );
			assert.deepEqual( result.doi, '10.100/example' );
		} );

		it( 'Returns empty metadata from empty object', () => {
			citationObj = new Citation();
			metadata = {};
			result = scraper.matchIDs( citationObj, metadata, logger );
			assert.deepEqual( result.doi, null );
		} );

		it( 'Multiple metadata types', () => {
			citationObj = new Citation();
			metadata = {
				dublinCore: {
					identifier: [ 'puppies', '10.100/example' ]
				},
				highwirePress: {
					doi: '10.100/example2'
				},
				bePress: {
					doi: '10.100/example3'
				}
			};
			result = scraper.matchIDs( citationObj, metadata, logger );
			assert.deepEqual( result.doi, '10.100/example' );
		} );
	} );

	describe( 'parsing', () => {

		it( 'should scrape meta tag charset content', ( done ) => {
			const results = scraper.contentTypeFromBody( cheerio.load( fs.readFileSync( 'test/utils/static/metacharset.html' ) ) );
			if ( results !== 'iso-8859-1' ) {
				throw new Error( 'Expected to iso-8859-1; got ' + results );
			}
			done();
		} );

	} );
} );
