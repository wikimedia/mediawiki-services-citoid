'use strict';

const assert = require( '../../utils/assert.js' );
const http = require( 'http' );
const net = require( 'net' );
const { getGlobalDispatcher, setGlobalDispatcher } = require( 'undici' );
const Server = require( '../../utils/server.js' );

describe( 'proxy configuration', () => {

	let proxyServer;
	let proxyContacted;
	let savedDispatcher;
	const server = new Server();

	before( () => {
		savedDispatcher = getGlobalDispatcher();
		proxyContacted = false;
		proxyServer = http.createServer();
		proxyServer.on( 'connect', ( req, clientSocket ) => {
			proxyContacted = true;
			clientSocket.write( 'HTTP/1.1 502 Bad Gateway\r\n\r\n' );
			clientSocket.end();
		} );
		return new Promise( ( resolve ) => {
			proxyServer.listen( 0, '127.0.0.1', resolve );
		} ).then( () => server.start( {
			proxy: `http://127.0.0.1:${ proxyServer.address().port }`,
			zotero: false
		} ) );
	} );

	after( () => {
		proxyServer.close();
		setGlobalDispatcher( savedDispatcher );
		return server.stop();
	} );

	it( 'should route outgoing requests through the configured proxy', () => server.query( 'https://example.com' )
		.catch( () => {} )
		.then( () => {
			assert.ok( proxyContacted, 'Proxy should have been contacted for outgoing request' );
		} ) );

} );

describe( 'proxy with HTTPS-only CONNECT', () => {

	let proxyServer;
	let savedDispatcher;
	let httpConnectSeen;
	const openSockets = [];
	const server = new Server();

	before( () => {
		savedDispatcher = getGlobalDispatcher();
		httpConnectSeen = false;

		// Mimics Wikimedia Squid: forwards HTTP requests, allows CONNECT for port 443 only
		proxyServer = http.createServer( ( req, res ) => {
			if ( !req.url.startsWith( 'http' ) ) {
				res.writeHead( 400 );
				res.end();
				return;
			}
			const url = new URL( req.url );
			const proxyReq = http.request( {
				hostname: url.hostname,
				port: url.port || 80,
				path: url.pathname + url.search,
				method: req.method,
				headers: Object.assign( {}, req.headers, { host: url.host } )
			}, ( proxyRes ) => {
				res.writeHead( proxyRes.statusCode, proxyRes.headers );
				proxyRes.pipe( res );
			} );
			proxyReq.on( 'error', () => {
				res.writeHead( 502 );
				res.end();
			} );
			req.pipe( proxyReq );
		} );

		proxyServer.on( 'connect', ( req, clientSocket, head ) => {
			const parts = req.url.split( ':' );
			const targetPort = parseInt( parts[ 1 ] ) || 443;
			if ( targetPort !== 443 ) {
				httpConnectSeen = true;
				clientSocket.write( 'HTTP/1.1 403 Forbidden\r\n\r\n' );
				clientSocket.end();
				return;
			}
			const serverSocket = net.connect( targetPort, parts[ 0 ], () => {
				clientSocket.write( 'HTTP/1.1 200 Connection Established\r\n\r\n' );
				serverSocket.write( head );
				serverSocket.pipe( clientSocket );
				clientSocket.pipe( serverSocket );
			} );
			serverSocket.on( 'error', () => {
				clientSocket.end();
			} );
			openSockets.push( clientSocket, serverSocket );
		} );

		return new Promise( ( resolve ) => {
			proxyServer.listen( 0, '127.0.0.1', resolve );
		} ).then( () => server.start( {
			proxy: `http://127.0.0.1:${ proxyServer.address().port }`,
			zotero: false
		} ) );
	} );

	after( () => {
		openSockets.forEach( ( s ) => s.destroy() );
		proxyServer.close();
		setGlobalDispatcher( savedDispatcher );
		return server.stop();
	} );

	it( 'should not use CONNECT for HTTP targets', () => {
		httpConnectSeen = false;
		return server.query(
			'http://wayback.archive.org/web/20050316221324/http://www.thewbalchannel.com/politics/4281055/detail.html'
		).catch( () => {} ).then( () => {
			assert.ok( !httpConnectSeen,
				'CONNECT should not have been used for HTTP target; proxy should use HTTP forwarding' );
		} );
	} );

	it( 'should use CONNECT for HTTPS targets', () => {
		let httpsConnectSeen = false;
		const origConnect = proxyServer.listeners( 'connect' )[ 0 ];
		const connectTracker = ( req, clientSocket, head ) => {
			const parts = req.url.split( ':' );
			const targetPort = parseInt( parts[ 1 ] ) || 443;
			if ( targetPort === 443 ) {
				httpsConnectSeen = true;
			}
			origConnect( req, clientSocket, head );
		};
		proxyServer.removeListener( 'connect', origConnect );
		proxyServer.on( 'connect', connectTracker );

		return server.query( 'https://example.com' )
			.catch( () => {} )
			.then( () => {
				proxyServer.removeListener( 'connect', connectTracker );
				proxyServer.on( 'connect', origConnect );
				assert.ok( httpsConnectSeen,
					'CONNECT should have been used for HTTPS target' );
			} );
	} );

} );
