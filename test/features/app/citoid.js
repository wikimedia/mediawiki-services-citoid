'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'citoid routing', () => {

	const server = new Server();

	before( () => server.start() );

	after( () => server.stop() );

	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	it( 'should get query style request for uri', () => fetch( `${ server.config.qURI }?format=mediawiki&search=http%3A%2F%2Fwww.example.com` )
		.then( ( res ) => {
			assert.deepEqual( res.status, 200 );
			return res.json().then( ( body ) => {
				assert.deepEqual( body[ 0 ].title, 'Example Domain' );
			} );
		} ) );

	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	it( 'should error for missing search param query style request', () => fetch( `${ server.config.qURI }?format=mediawiki` )
		.then( ( res ) => {
			assert.deepEqual( res.status, 400 );
		} )
		.catch( ( err ) => {
			assert.checkError( err, 400, "No 'search' value specified" );
		} ) );

	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	it( 'should get query style request for doi', () => fetch( `${ server.config.qURI }?format=mediawiki&search=10.1371%2Fjournal.pcbi.1002947` )
		.then( ( res ) => {
			assert.deepEqual( res.status, 200 );
			return res.json().then( ( body ) => {
				assert.deepEqual( body[ 0 ].title, 'Viral Phylodynamics' );
			} );
		} ) );

	it( 'should get restbase style request for uri', () => server.query( 'http://example.com' ).then( ( res ) => {
		assert.status( res, 200 );
		assert.deepEqual( res.body[ 0 ].title, 'Example Domain' );
	} ) );

} );
