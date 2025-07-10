'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'citoid routing', () => {

	const server = new Server();

	before( () => server.start() );

	after( () => server.stop() );

	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	it( 'should not get deprecated query style request for uri', () => fetch( `${ server.config.uri }api?format=mediawiki&search=http%3A%2F%2Fwww.example.com` )
		.then( ( res ) => {
			assert.deepEqual( res.status, 400 );
		} ) );

	it( 'should get restbase style request for uri', () => server.query( 'http://example.com' ).then( ( res ) => {
		assert.status( res, 200 );
		assert.deepEqual( res.body[ 0 ].title, 'Example Domain' );
	} ) );

} );
