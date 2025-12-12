'use strict';

/**
 * Tests for when Zotero can translate but not export
 */

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );
const zotero = require( '../../utils/mockZoteroServer.js' );

describe( 'mock Zotero service that cannot export', () => {

	const server = new Server();

	// Give Zotero port which is it is not running from-
	// Mimics Zotero being down.
	before( () => {
		zotero.start( 1968 ); // Start mock zotero server
		return server.start( { zoteroPort: 1968 } );
	} );

	after( () => server.stop() );

	it( 'Get error for bibtex export', () => server.query( 'http://www.example.com', 'bibtex', 'en' )
		.then( ( res ) => {
			assert.fail();
		}, ( err ) => {
			assert.deepEqual( err.body.error, 'Unable to serve bibtex format at this time' );
			assert.status( err, 404 );
			// assert.checkError(err, 404, 'Unable to serve bibtex at this time');
		} ) );

	it( 'Success with mediawiki export', () => server.query( 'http://www.example.com' ).then( ( res ) => {
		assert.status( res, 200 );
		assert.checkCitation( res, 'Example Domain' );
	} ) );

} );
