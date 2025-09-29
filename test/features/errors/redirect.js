'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );
const nock = require( 'nock' );

describe( 'redirects', () => {

	const server = new Server();

	before( () => server.start( { maxRedirects: 5 } ) );

	after( () => server.stop() );

	describe( 'redirect chains', () => {

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

		before( () => {
			redirector();
		} );

		after( () => {
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

	describe( 'relative redirects', () => {

		const base = 'https://example.com';

		afterEach( () => {
			nock.cleanAll();
		} );

		it( 'Handles relative filename redirects correctly', () => {
			nock( base )
				.head( '/page' )
				.reply( 302, undefined, { Location: 'page.html' } )
				.head( '/page.html' )
				.reply( 200 )
				.get( '/page.html' )
				.reply( 200, '<html><head><title>Test Page</title></head></html>' );

			return server.query( 'https://example.com/page', 'mediawiki', 'en' ).then( ( res ) => {
				assert.checkCitation( res, 'Test Page' );
			} );
		} );

		it( 'Handles ./ relative redirects correctly', () => {
			nock( base )
				.head( '/dir/page' )
				.reply( 302, undefined, { Location: './page.html' } )
				.head( '/dir/page.html' )
				.reply( 200 )
				.get( '/dir/page.html' )
				.reply( 200, '<html><head><title>Same Dir</title></head></html>' );

			return server.query( 'https://example.com/dir/page', 'mediawiki', 'en' ).then( ( res ) => {
				assert.checkCitation( res, 'Same Dir' );
			} );
		} );

		it( 'Handles ../ parent directory redirects correctly', () => {
			nock( base )
				.head( '/dir/subdir/page' )
				.reply( 302, undefined, { Location: '../page.html' } )
				.head( '/dir/page.html' )
				.reply( 200 )
				.get( '/dir/page.html' )
				.reply( 200, '<html><head><title>Parent Dir</title></head></html>' );

			return server.query( 'https://example.com/dir/subdir/page', 'mediawiki', 'en' ).then( ( res ) => {
				assert.checkCitation( res, 'Parent Dir' );
			} );
		} );

		it( 'Handles capital letters in protocol', () => {
			const base = 'HTTPS://example.com';
			nock( base )
				.head( '/dir/subdir/page' )
				.reply( 302, undefined, { Location: '../page.html' } )
				.head( '/dir/page.html' )
				.reply( 200 )
				.get( '/dir/page.html' )
				.reply( 200, '<html><head><title>Parent Dir</title></head></html>' );

			return server.query( 'https://example.com/dir/subdir/page', 'mediawiki', 'en' ).then( ( res ) => {
				assert.checkCitation( res, 'Parent Dir' );
			} );
		} );

		it( 'Handles subdirectory relative redirects correctly', () => {
			nock( base )
				.head( '/dir/page' )
				.reply( 302, undefined, { Location: 'subdir/page.html' } )
				.head( '/dir/subdir/page.html' )
				.reply( 200 )
				.get( '/dir/subdir/page.html' )
				.reply( 200, '<html><head><title>Subdir</title></head></html>' );

			return server.query( 'https://example.com/dir/page', 'mediawiki', 'en' ).then( ( res ) => {
				assert.checkCitation( res, 'Subdir' );
			} );
		} );

		it( 'Handles absolute path redirects correctly', () => {
			nock( base )
				.head( '/dir/page' )
				.reply( 302, undefined, { Location: '/absolute/path.html' } )
				.head( '/absolute/path.html' )
				.reply( 200 )
				.get( '/absolute/path.html' )
				.reply( 200, '<html><head><title>Absolute Path</title></head></html>' );

			return server.query( 'https://example.com/dir/page', 'mediawiki', 'en' ).then( ( res ) => {
				assert.checkCitation( res, 'Absolute Path' );
			} );
		} );

		it( 'Handles protocol-relative redirects correctly', () => {
			nock( base )
				.head( '/page' )
				.reply( 302, undefined, { Location: '//en.wikipedia.com/wiki/Test' } );

			nock( 'https://en.wikipedia.com' )
				.head( '/wiki/Test' )
				.reply( 200 )
				.get( '/wiki/Test' )
				.reply( 200, '<html><head><title>Protocol Relative</title></head></html>' );

			return server.query( 'https://example.com/page', 'mediawiki', 'en' ).then( ( res ) => {
				assert.checkCitation( res, 'Protocol Relative' );
			} );
		} );

	} );

} );
