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

	it( 'PDF contentType returns webpage citation with pdf-support flag', () => {
		const url = 'https://upload.wikimedia.org/wikipedia/commons/9/98/Coloring_page_for_Wikipedia_Day_2019_in_NYC.pdf';
		return server.query( url, 'mediawiki', 'en', { 'pdf-support': true } )
			.then( ( res ) => {
				assert.status( res, 200 );
				const citation = res.body[ 0 ];
				assert.strictEqual( citation.itemType, 'webpage' );
				assert.strictEqual( citation.url, url );
				assert.strictEqual( citation.websiteTitle, 'upload.wikimedia.org' );
				assert.strictEqual( citation.title, 'upload.wikimedia.org' );
				assert.ok( citation.accessDate );
				assert.deepEqual( citation.source, [ 'pdf-mvp' ] );
			} );
	} );

} );
