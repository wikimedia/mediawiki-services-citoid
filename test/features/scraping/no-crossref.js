'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );
const nock = require( 'nock' );

describe( 'Mock crossref and doi.org failures', () => {

	const server = new Server();
	const testDoi = '10.1234/test';

	before( () => server.start( { zotero: false } ) );

	after( () => server.stop() );

	afterEach( () => {
		nock.cleanAll();
	} );

	it( 'Falls back on doi.org resolver when api is not available', () => {

		// Mock CrossRef API to return 503
		nock( 'https://api.crossref.org' )
			.get( `/works/${ encodeURIComponent( testDoi ) }` )
			.query( true )
			.reply( 503 );

		// Mock the DOI resolver to redirect to a working website
		nock( 'https://doi.org' )
			.head( `/${ testDoi }` )
			.reply( 302, undefined, { Location: 'https://example.org/article.html' } );

		// Mock the target website returning HTML with metadata
		nock( 'https://example.org' )
			.head( '/article.html' )
			.reply( 200, undefined, { 'Content-Type': 'text/html' } )
			.get( '/article.html' )
			.reply( 200, `<!DOCTYPE html>
				<html>
				<head>
					<title>Test</title>
					<meta name="citation_journal_title" content="Test Journal">
				</head>
				</html>`, { 'Content-Type': 'text/html' }
			);

		// Query the DOI
		return server.query( testDoi ).then(
			( res ) => {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Test' );
				assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
				assert.isNotInArray( res.body[ 0 ].source, 'Crossref' );
			},
			( err ) => {
				throw new Error( `Expected successful fallback to scraping, but got error: ${ err.message }` );
			}
		);
	} );

	it( 'falls back to CrossRef when DOI.org resolver is unavailable', () => {

		// Mock the DOI resolver failing
		nock( 'https://doi.org' )
			.head( `/${ testDoi }` )
			.reply( 503 );

		// Mock CrossRef API to return valid metadata
		nock( 'https://api.crossref.org' )
			.get( `/works/${ encodeURIComponent( testDoi ) }` )
			.query( true )
			.reply( 200, {
				status: 'ok',
				message: {
					DOI: testDoi,
					title: [ 'Test' ],
					type: 'journal-article',
					URL: `https://doi.org/${ testDoi }`
				}
			} );

		// Query the DOI
		return server.query( testDoi ).then(
			( res ) => {
				// Should get a 200 response with CrossRef data
				assert.status( res, 200 );
				assert.checkCitation( res, 'Test' );
				assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
				assert.isInArray( res.body[ 0 ].source, 'Crossref' );
			},
			( err ) => {
				// Should NOT throw an unhandled error
				throw new Error( `Expected successful fallback to CrossRef, but got error: ${ err.message }` );
			}
		);
	} );

} );
