'use strict';

const assert = require( '../../utils/assert.js' );
const nock = require( 'nock' );
const { CookieJar } = require( 'tough-cookie' );
const { issueRequest } = require( '../../../lib/util.js' );

describe( 'lib/util.js issueRequest', () => {

	afterEach( () => {
		nock.cleanAll();
	} );

	// Tests adapted from preq library (https://github.com/wikimedia/preq)
	describe( 'preq compatibility', () => {

		it( 'rejects without URI', async () => {
			try {
				await issueRequest( { method: 'get' } );
				assert.fail( 'Should have rejected' );
			} catch ( err ) {
				assert.deepEqual( err.status, 500 );
			}
		} );

		it( 'should get content', async () => {
			const MOCK_BODY = 'Main_Wiki_Page_HTML';
			nock( 'https://en.wikipedia.org' )
				.get( '/wiki/Main_Page' )
				.reply( 200, MOCK_BODY );

			const res = await issueRequest( {
				uri: 'https://en.wikipedia.org/wiki/Main_Page'
			} );
			assert.deepEqual( res.status, 200 );
			assert.ok( res.body );
			assert.deepEqual( res.body, MOCK_BODY );
		} );

		it( 'should wrap 404 in HTTPError', async () => {
			nock( 'https://en.wikipedia.org' )
				.get( '/wiki/Main_Page' )
				.reply( 404, JSON.stringify( { message: 'TEST_MESSAGE' } ), {
					'content-type': 'application/json'
				} );

			try {
				await issueRequest( {
					uri: 'https://en.wikipedia.org/wiki/Main_Page'
				} );
				assert.fail( 'Should have thrown' );
			} catch ( err ) {
				assert.deepEqual( err.name, 'HTTPError' );
				assert.deepEqual( err.status, 404 );
			}
		} );

		it( 'should support query string (qs)', async () => {
			const MOCK_BODY = 'Response_With_Query';
			nock( 'https://en.wikipedia.org' )
				.get( '/wiki/Main_Page' )
				.query( { q: 'foo' } )
				.reply( 200, MOCK_BODY );

			const res = await issueRequest( {
				uri: 'https://en.wikipedia.org/wiki/Main_Page',
				qs: { q: 'foo' }
			} );
			assert.deepEqual( res.status, 200 );
			assert.deepEqual( res.body, MOCK_BODY );
		} );

		it( 'should support simple string URI', async () => {
			const MOCK_BODY = 'Simple_String_Response';
			nock( 'https://en.wikipedia.org' )
				.get( '/wiki/Main_Page' )
				.reply( 200, MOCK_BODY );

			const res = await issueRequest( 'https://en.wikipedia.org/wiki/Main_Page' );
			assert.deepEqual( res.status, 200 );
			assert.deepEqual( res.body, MOCK_BODY );
		} );

		it( 'should follow redirects', async () => {
			const MOCK_BODY = 'Redirected_Content';
			nock( 'https://en.wikipedia.org' )
				.get( '/' )
				.reply( 301, undefined, { location: 'https://en.wikipedia.org/wiki/Main_Page' } )
				.get( '/wiki/Main_Page' )
				.reply( 200, MOCK_BODY );

			const res = await issueRequest( {
				uri: 'https://en.wikipedia.org/'
			} );
			assert.deepEqual( res.status, 200 );
			assert.deepEqual( res.body, MOCK_BODY );
		} );

		it( 'should not follow redirects when followRedirect is false', async () => {
			nock( 'https://en.wikipedia.org' )
				.get( '/' )
				.reply( 301, undefined, { location: 'https://en.wikipedia.org/wiki/Main_Page' } );

			const res = await issueRequest( {
				uri: 'https://en.wikipedia.org/',
				followRedirect: false
			} );
			assert.deepEqual( res.status, 301 );
			assert.deepEqual( res.headers.location, 'https://en.wikipedia.org/wiki/Main_Page' );
		} );

		it( 'should support url property as alias for uri', async () => {
			const MOCK_BODY = 'URL_Alias_Response';
			nock( 'https://en.wikipedia.org' )
				.get( '/wiki/Main_Page' )
				.reply( 200, MOCK_BODY );

			const res = await issueRequest( {
				url: 'https://en.wikipedia.org/wiki/Main_Page'
			} );
			assert.deepEqual( res.status, 200 );
			assert.deepEqual( res.body, MOCK_BODY );
		} );

	} );

	// T373280: Ensure encoding doesn't throw errors
	describe( 'response body encoding', () => {

		describe( 'JSON parsing', () => {

			it( 'parses valid JSON correctly', async () => {
				const base = 'https://example.com';
				const validJson = { title: 'Test', value: 42 };

				nock( base )
					.get( '/valid-json' )
					.reply( 200, JSON.stringify( validJson ), { 'Content-Type': 'application/json' } );

				const response = await issueRequest( {
					uri: `${ base }/valid-json`,
					method: 'get'
				} );

				assert.deepEqual( response.status, 200 );
				assert.deepEqual( typeof response.body, 'object' );
				assert.deepEqual( response.body.title, 'Test' );
				assert.deepEqual( response.body.value, 42 );
			} );

			it( 'returns HTML as string when content-type claims application/json', async () => {
				const base = 'https://example.com';
				const htmlBody = '<html><head><title>Test</title></head><body>Not JSON</body></html>';

				nock( base )
					.get( '/fake-json' )
					.reply( 200, htmlBody, { 'Content-Type': 'application/json' } );

				const response = await issueRequest( {
					uri: `${ base }/fake-json`,
					method: 'get'
				} );

				assert.deepEqual( response.status, 200 );
				assert.deepEqual( typeof response.body, 'string' );
				assert.ok( response.body.includes( '<html>' ), 'Body should contain HTML' );
			} );

			it( 'returns malformed JSON as string instead of throwing SyntaxError', async () => {
				const base = 'https://example.com';
				const malformedJson = '{ "unclosed": "string, "broken": true }';

				nock( base )
					.get( '/malformed-json' )
					.reply( 200, malformedJson, { 'Content-Type': 'application/json' } );

				const response = await issueRequest( {
					uri: `${ base }/malformed-json`,
					method: 'get'
				} );

				assert.deepEqual( response.status, 200 );
				assert.deepEqual( typeof response.body, 'string' );
				assert.deepEqual( response.body, malformedJson );
			} );

			it( 'handles HTML error page with JSON content-type on 500 status', async () => {
				const base = 'https://example.com';
				const errorHtml = '<html><body><h1>500 Server Error</h1></body></html>';

				nock( base )
					.get( '/server-error' )
					.reply( 500, errorHtml, { 'Content-Type': 'application/json' } );

				try {
					await issueRequest( {
						uri: `${ base }/server-error`,
						method: 'get'
					} );
					assert.fail( 'Should have thrown HTTPError' );
				} catch ( err ) {
					assert.deepEqual( err.name, 'HTTPError' );
					assert.deepEqual( err.status, 500 );
				}
			} );

		} );

		describe( 'charset handling', () => {

			it( 'handles application/json with charset parameter', async () => {
				const base = 'https://example.com';
				const htmlBody = '<html><title>Charset Test</title></html>';

				nock( base )
					.get( '/json-charset' )
					.reply( 200, htmlBody, { 'Content-Type': 'application/json; charset=utf-8' } );

				const response = await issueRequest( {
					uri: `${ base }/json-charset`,
					method: 'get'
				} );

				assert.deepEqual( response.status, 200 );
				assert.deepEqual( typeof response.body, 'string' );
			} );

			it( 'decodes non-UTF-8 charset correctly', async () => {
				const base = 'https://example.com';
				const iconv = require( 'iconv-lite' );
				const text = '<html><head><title>Tëst with spëcial chäräctërs</title></head></html>';
				const iso88591Buffer = iconv.encode( text, 'iso-8859-1' );

				nock( base )
					.get( '/iso-8859-1' )
					.reply( 200, iso88591Buffer, { 'Content-Type': 'text/html; charset=iso-8859-1' } );

				const response = await issueRequest( {
					uri: `${ base }/iso-8859-1`,
					method: 'get'
				} );

				assert.deepEqual( response.status, 200 );
				assert.deepEqual( typeof response.body, 'string' );
				assert.ok( response.body.includes( 'spëcial' ), 'Should decode special characters' );
			} );

		} );

		describe( 'encoding: null (raw buffer)', () => {

			it( 'returns raw Buffer when encoding is null', async () => {
				const base = 'https://example.com';
				const iconv = require( 'iconv-lite' );
				const text = '<html><head><title>Tëst with spëcial chäräctërs</title></head></html>';
				const iso88591Buffer = iconv.encode( text, 'iso-8859-1' );

				nock( base )
					.get( '/raw-buffer' )
					.reply( 200, iso88591Buffer, { 'Content-Type': 'text/html; charset=iso-8859-1' } );

				const response = await issueRequest( {
					uri: `${ base }/raw-buffer`,
					method: 'get',
					encoding: null
				} );

				assert.deepEqual( response.status, 200 );
				assert.ok( Buffer.isBuffer( response.body ), 'Body should be a Buffer' );
				const decoded = iconv.decode( response.body, 'iso-8859-1' );
				assert.ok( decoded.includes( 'spëcial' ), 'Should preserve special characters' );
			} );

			it( 'handles error responses with encoding: null', async () => {
				const base = 'https://example.com';
				const errorBody = 'Internal Server Error';

				nock( base )
					.get( '/error-buffer' )
					.reply( 500, errorBody, { 'Content-Type': 'text/plain' } );

				try {
					await issueRequest( {
						uri: `${ base }/error-buffer`,
						method: 'get',
						encoding: null
					} );
					assert.fail( 'Should have thrown HTTPError' );
				} catch ( err ) {
					assert.deepEqual( err.name, 'HTTPError' );
					assert.deepEqual( err.status, 500 );
				}
			} );

		} );

	} );

	describe( 'cookie jar handling', () => {

		it( 'sends cookies from jar in request', async () => {
			const base = 'https://example.com';
			const jar = new CookieJar();

			// Pre-populate jar with a cookie
			jar.setCookieSync( 'session=abc123', `${ base }/` );

			let receivedCookie;
			nock( base )
				.get( '/with-cookie' )
				.reply( function () {
					receivedCookie = this.req.headers.cookie;
					return [ 200, 'OK' ];
				} );

			await issueRequest( {
				uri: `${ base }/with-cookie`,
				method: 'get',
				jar: jar
			} );

			assert.ok( receivedCookie, 'Cookie header should be sent' );
			assert.ok( receivedCookie.includes( 'session=abc123' ), 'Cookie value should match' );
		} );

		it( 'stores Set-Cookie headers in jar', async () => {
			const base = 'https://example.com';
			const jar = new CookieJar();

			nock( base )
				.get( '/set-cookie' )
				.reply( 200, 'OK', {
					'Set-Cookie': 'token=xyz789; Path=/'
				} );

			await issueRequest( {
				uri: `${ base }/set-cookie`,
				method: 'get',
				jar: jar
			} );

			const cookies = jar.getCookieStringSync( `${ base }/` );
			assert.ok( cookies.includes( 'token=xyz789' ), 'Cookie should be stored in jar' );
		} );

		it( 'maintains cookies across multiple requests', async () => {
			const base = 'https://example.com';
			const jar = new CookieJar();

			// First request sets a cookie
			nock( base )
				.get( '/login' )
				.reply( 200, 'OK', {
					'Set-Cookie': 'auth=logged_in; Path=/'
				} );

			await issueRequest( {
				uri: `${ base }/login`,
				method: 'get',
				jar: jar
			} );

			// Second request should send the cookie
			let receivedCookie;
			nock( base )
				.get( '/protected' )
				.reply( function () {
					receivedCookie = this.req.headers.cookie;
					return [ 200, 'Protected content' ];
				} );

			await issueRequest( {
				uri: `${ base }/protected`,
				method: 'get',
				jar: jar
			} );

			assert.ok( receivedCookie, 'Cookie should be sent on second request' );
			assert.ok( receivedCookie.includes( 'auth=logged_in' ), 'Auth cookie should be sent' );
		} );

		it( 'works without jar (no errors)', async () => {
			const base = 'https://example.com';

			nock( base )
				.get( '/no-jar' )
				.reply( 200, 'OK', {
					'Set-Cookie': 'ignored=value; Path=/'
				} );

			const res = await issueRequest( {
				uri: `${ base }/no-jar`,
				method: 'get'
			} );

			assert.deepEqual( res.status, 200 );
		} );

	} );

} );
