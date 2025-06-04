'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'correctly gets base fields instead of more specific fields (no zotero)', () => {

	const server = new Server();

	before( () => server.start( { zotero: false } ) );

	after( () => server.stop() );

	it( 'webpage', () => server.query( 'http://example.com',
		'mediawiki-basefields', 'en', 'false' ).then( ( res ) => {
		assert.status( res, 200 );
		assert.isNotInArray( res.body[ 0 ].source, 'Zotero', 'Unexpected response from Zotero' );
		assert.deepEqual( !!res.body[ 0 ].publicationTitle, true, 'Missing publicationTitle field' );
		assert.deepEqual( !!res.body[ 0 ].websiteTitle, false, 'Missing websiteTitle field' );
	} ) );

} );
