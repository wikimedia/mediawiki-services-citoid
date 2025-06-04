'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );
const nock = require( 'nock' );

describe( 'redirects', () => {

	const server = new Server();

	before( () => server.start( { maxRedirects: 5 } ) );

	after( () => server.stop() );

	// httpbin no longer live, so just mock its behaviour since all it does here is redirect anyway.
	const redirector = () => {
		const base = 'https://httpbin.org';
		nock( base )
			.head( '/redirect-to' )
			.query( true )
			.reply( ( uri ) => {
				redirector(); // call again to enable the recursive behaviour below
				const parsed = new URL( uri, base );
				return [ 302, undefined, { Location: parsed.searchParams.get( 'url' ) } ];
			} );
	};

	beforeEach( () => {
		redirector();
	} );

	afterEach( () => {
		nock.cleanAll();
	} );

	it( 'redirect supported', () => server.query( 'https://httpbin.org/redirect-to?url=http://www.example.com', 'mediawiki', 'en' )
		.then( ( res ) => {
			assert.status( res, 200 );
		} ) );

	it( 'redir-to-private', () => server.query( 'https://httpbin.org/redirect-to?url=http://192.168.1.2', 'mediawiki', 'en' )
		.then( ( res ) => {
			assert.status( res, 400 );
		}, ( err ) => {
			assert.status( err, 400 );
		} ) );

	it( 'redir-to-redir-private', () => server.query( 'https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=http://192.168.1.2', 'mediawiki', 'en' )
		.then( ( res ) => {
			assert.status( res, 400 );
		}, ( err ) => {
			assert.status( err, 400 );
		} ) );

	it( 'follows relative redirects', () => server.query( 'https://httpbin.org/redirect-to?url=/redirect-to?url=http://example.com', 'mediawiki', 'en' )
		.then( ( res ) => {
			assert.status( res, 200 );
		}, ( err ) => {
			assert.status( err, 200 );
		} ) );

	it( 'redir-to-redir-to-redir-to-private', () => server.query( 'https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=http://192.168.1.2', 'mediawiki', 'en' )
		.then( ( res ) => {
			assert.status( res, 400 );
		}, ( err ) => {
			assert.status( err, 400 );
		} ) );

	it( 'five-redirect-max-by-default-under', () => {
		const url = 'https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://en.wikipedia.org/wiki/Zotero';
		return server.query( url, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 200 );
			}, ( err ) => {
				assert.status( err, 200 );
			} );
	} );

	it( 'five-redirect-max-by-default-equal', () => {
		const url = 'https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://en.wikipedia.org/wiki/Zotero';
		return server.query( url, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 200 );
			}, ( err ) => {
				assert.status( err, 200 );
				assert.deepEqual( err.body.error, 'Unable to load URL ' + url );
			} );
	} );

	it( 'five-redirect-max-by-default-over', () => server.query( 'https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://httpbin.org/redirect-to?url=https://en.wikipedia.org/wiki/Zotero', 'mediawiki', 'en' )
		.then( ( res ) => {
			assert.status( res, 400 );
		}, ( err ) => {
			assert.status( err, 400 );
		} ) );

} );
