'use strict';

const assert = require( '../../utils/assert.js' );
const http = require( 'http' );
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
