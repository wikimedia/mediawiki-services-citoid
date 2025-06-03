'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'correctly gets base fields instead of more specific fields (using zotero)', () => {

	const server = new Server();

	before( () => server.start( { zotero: true } ) );

	it( 'conferencePaper', () => server.query( '10.1007/11926078_68', 'mediawiki-basefields', 'en' ).then( ( res ) => {
		assert.status( res, 200 );
		assert.isInArray( res.body[ 0 ].source, 'Zotero', 'Expected response from Zotero' );
		assert.deepEqual( !!res.body[ 0 ].publicationTitle, true, 'Missing publicationTitle field' );
		assert.deepEqual( !!res.body[ 0 ].proceedingsTitle, false, 'Missing proceedingsTitle field' );
	} ) );

	it( 'encyclopediaArticle', () => server.query( 'http://fr.wikipedia.org/w/index.php?title=Ninja_Turtles_(film)&oldid=115125238',
		'mediawiki-basefields', 'en', 'true' ).then( ( res ) => {
		assert.status( res, 200 );
		assert.isInArray( res.body[ 0 ].source, 'Zotero', 'Expected response from Zotero' );
		assert.deepEqual( !!res.body[ 0 ].publicationTitle, true, 'Missing publicationTitle field' );
		assert.deepEqual( !!res.body[ 0 ].encyclopediaTitle, false, 'Missing encyclopediaTitle field' );
	} ) );

	after( () => server.stop() );
	// TODO: Add test for creator field basefields

} );
