'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );
const { setTimeout: wait } = require( 'timers/promises' );

describe( 'Live Crossref open search', () => {

	const server = new Server();

	before( () => server.start( { zotero: false } ) );

	after( () => server.stop() );

	beforeEach( () => wait( 1100 ) );

	it( 'Open search for Schrodinger', () => server.query( 'E. Schrodinger, Proc. Cam. Phil. Soc. 31, 555 (1935)' ).then( ( res ) => {
		assert.checkCitation( res, 'Discussion of Probability Relations between Separated Systems' );
		assert.deepEqual( res.body.length, 2 ); // Two from Crossref
	} ) );

	it( 'Open search with single term', () => server.query( 'Mediawiki' ).then( ( res ) => {
		assert.checkCitation( res );
		assert.deepEqual( res.body.length, 2 ); // Two from Crossref
	} ) );

	it( 'No results returns 404', () => assert.fails( server.query( 'User:L' ), ( err ) => {
		assert.status( err, 404 );
		assert.deepEqual( err.body, { error: 'No results for search term User:L' } );
	} ) );

} );
