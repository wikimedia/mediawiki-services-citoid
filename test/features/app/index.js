'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'express app', () => {

	const server = new Server();

	before( () => server.start() );

	after( () => server.stop() );

	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	it( 'should get robots.txt', () => fetch( `${ server.config.uri }robots.txt` )
		.then( ( res ) => {
			assert.deepEqual( res.status, 200 );
			return res.text().then( ( body ) => {
				assert.deepEqual( body, 'User-agent: *\nDisallow: /\n' );
			} );
		} ) );

	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	it( 'get landing page', () => fetch( server.config.uri )
		.then( ( res ) => {
			// check that the response is present
			assert.status( res, 200 );
			assert.contentType( res, 'text/html' );
			return res.text().then( ( body ) => {
				assert.notDeepEqual( body.length, 0, 'Empty response' );
			} );
		} ) );

	it( 'should set CORS headers', () => {
		if ( server.config.service.conf.cors === false ) {
			return true;
		}
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		return fetch( `${ server.config.uri }robots.txt` )
			.then( ( res ) => {
				assert.deepEqual( res.status, 200 );
				assert.deepEqual( res.headers.get( 'access-control-allow-origin' ), '*' );
				assert.deepEqual( !!res.headers.get( 'access-control-allow-headers' ), true );
				assert.deepEqual( !!res.headers.get( 'access-control-expose-headers' ), true );
			} );
	} );

	it( 'should set CSP headers', () => {
		if ( server.config.service.conf.csp === false ) {
			return true;
		}
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		return fetch( `${ server.config.uri }robots.txt` )
			.then( ( res ) => {
				assert.deepEqual( res.status, 200 );
				assert.deepEqual( res.headers.get( 'x-xss-protection' ), '1; mode=block' );
				assert.deepEqual( res.headers.get( 'x-content-type-options' ), 'nosniff' );
				assert.deepEqual( res.headers.get( 'x-frame-options' ), 'SAMEORIGIN' );
				assert.deepEqual( res.headers.get( 'content-security-policy' ), 'default-src \'self\'; object-src \'none\'; media-src *; img-src *; style-src *; frame-ancestors \'self\'' );
				assert.deepEqual( res.headers.get( 'x-content-security-policy' ), 'default-src \'self\'; object-src \'none\'; media-src *; img-src *; style-src *; frame-ancestors \'self\'' );
				assert.deepEqual( res.headers.get( 'x-webkit-csp' ), 'default-src \'self\'; object-src \'none\'; media-src *; img-src *; style-src *; frame-ancestors \'self\'' );
			} );
	} );

} );
