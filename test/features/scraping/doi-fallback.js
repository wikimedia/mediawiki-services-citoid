'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );
const nock = require( 'nock' );

describe( 'Uses DOI fallback on unsupported content type', () => {

	const testDoi = '10.1146/annurev.py.19.090181.001123';
	const testUrl = `https://www.annualreviews.org/content/journals/${ testDoi }`;

	afterEach( () => {
		nock.cleanAll();
	} );

	function nockDoiFallback() {
		nock( 'https://www.annualreviews.org' )
			.head( `/content/journals/${ testDoi }` )
			.reply( 200, undefined, { 'Content-Type': 'text/x-python' } );

		nock( 'https://doi.org' )
			.head( `/${ testDoi }` )
			.reply( 302, undefined, { Location: 'https://www.annualreviews.org/doi/' + testDoi } );

		nock( 'https://www.annualreviews.org' )
			.head( '/doi/' + testDoi )
			.reply( 200, undefined, { 'Content-Type': 'text/html' } )
			.get( '/doi/' + testDoi )
			.reply( 200, '<!DOCTYPE html><html><head><title>Test Article</title></head></html>',
				{ 'Content-Type': 'text/html' } );

		nock( 'https://api.crossref.org' )
			.get( `/works/${ encodeURIComponent( testDoi ) }` )
			.query( true )
			.reply( 200, {
				status: 'ok',
				message: {
					DOI: testDoi,
					title: [ 'Effects of Reduced Tillage' ],
					type: 'journal-article',
					URL: `https://doi.org/${ testDoi }`
				}
			} );
	}

	describe( 'wayback disabled', () => {

		const server = new Server();

		before( () => server.start( { wayback: false, zotero: false } ) );

		after( () => server.stop() );

		it( 'falls back to DOI when content type is unsupported', () => {
			nockDoiFallback();
			return server.query( testUrl ).then( ( res ) => {
				assert.status( res, 200 );
				assert.deepEqual( res.body[ 0 ].DOI, testDoi, 'Incorrect DOI' );
				assert.isInArray( res.body[ 0 ].source, 'Crossref', 'Expected Crossref source' );
			} );
		} );

	} );

	describe( 'zotero enabled', () => {

		const server = new Server();

		before( () => server.start( { zotero: true, zoteroPort: 1969, wayback: false } ) );

		after( () => server.stop() );

		it( 'falls back to DOI when Zotero returns 415', () => {
			nockDoiFallback();

			nock( 'http://127.0.0.1:1969' )
				.post( '/web' )
				.reply( 400, { detail: 'The remote document is not in a supported format' } )
				.post( '/search' )
				.reply( 501 );

			return server.query( testUrl ).then( ( res ) => {
				assert.status( res, 200 );
				assert.deepEqual( res.body[ 0 ].DOI, testDoi, 'Incorrect DOI' );
				assert.isInArray( res.body[ 0 ].source, 'Crossref', 'Expected Crossref source' );
			} );
		} );

	} );

	describe( 'wayback enabled', () => {

		const server = new Server();

		before( () => server.start( { wayback: true, zotero: false } ) );

		after( () => server.stop() );

		it( 'skips wayback scrape and falls back to DOI on 415', () => {
			nockDoiFallback();

			nock( 'http://archive.org' )
				.get( '/wayback/available' )
				.query( true )
				.reply( 200, {
					archived_snapshots: {
						closest: {
							status: '200',
							available: true,
							url: 'http://web.archive.org/web/20200101000000/https://www.annualreviews.org/content/journals/' + testDoi,
							timestamp: '20200101000000'
						}
					}
				} );

			return server.query( testUrl ).then( ( res ) => {
				assert.status( res, 200 );
				assert.deepEqual( res.body[ 0 ].DOI, testDoi, 'Incorrect DOI' );
				assert.isInArray( res.body[ 0 ].source, 'Crossref', 'Expected Crossref source' );
			} );
		} );

	} );

} );
