'use strict';

const assert = require( '../../utils/assert.js' );
const http = require( 'http' );
const { getGlobalDispatcher, setGlobalDispatcher } = require( 'undici' );
const Server = require( '../../utils/server.js' );

describe( 'proxy configuration', () => {

	let proxyServer;
	let savedDispatcher;
	let httpForwardSeen;
	let httpConnectSeen;
	let httpsConnectSeen;
	const server = new Server();

	before( () => {
		savedDispatcher = getGlobalDispatcher();

		// Mimics Wikimedia Squid: accepts forwarded HTTP requests, allows
		// CONNECT for port 443 only. Live DNS queries for example.com occur,
		// but not contacted for a response otherwise.
		proxyServer = http.createServer( ( req, res ) => {
			if ( !req.url.startsWith( 'http' ) ) {
				res.writeHead( 400 );
				res.end();
				return;
			}
			httpForwardSeen = true;
			res.writeHead( 502 );
			res.end();
		} );

		proxyServer.on( 'connect', ( req, clientSocket ) => {
			const parts = req.url.split( ':' );
			const targetPort = parseInt( parts[ 1 ] ) || 443;
			if ( targetPort !== 443 ) {
				httpConnectSeen = true;
				clientSocket.write( 'HTTP/1.1 403 Forbidden\r\n\r\n' );
			} else {
				httpsConnectSeen = true;
				clientSocket.write( 'HTTP/1.1 502 Bad Gateway\r\n\r\n' );
			}
			clientSocket.end();
		} );

		return new Promise( ( resolve ) => {
			proxyServer.listen( 0, '127.0.0.1', resolve );
		} ).then( () => server.start( {
			proxy: `http://127.0.0.1:${ proxyServer.address().port }`,
			zotero: false
		} ) );
	} );

	beforeEach( () => {
		httpForwardSeen = false;
		httpConnectSeen = false;
		httpsConnectSeen = false;
	} );

	after( () => {
		proxyServer.close();
		setGlobalDispatcher( savedDispatcher );
		return server.stop();
	} );

	it( 'should forward HTTP targets through the proxy without CONNECT', () => server.query( 'http://example.com' )
		.catch( () => {} )
		.then( () => {
			assert.ok( httpForwardSeen,
				'Proxy should have received a forwarded request for HTTP target' );
			assert.ok( !httpConnectSeen,
				'CONNECT should not have been used for HTTP target; proxy should use HTTP forwarding' );
		} ) );

	it( 'should use CONNECT for HTTPS targets', () => server.query( 'https://example.com' )
		.catch( () => {} )
		.then( () => {
			assert.ok( httpsConnectSeen,
				'CONNECT should have been used for HTTPS target' );
		} ) );

} );
