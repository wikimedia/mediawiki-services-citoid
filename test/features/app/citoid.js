'use strict';

const preq = require( 'preq' );
const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'citoid routing', function () {

	this.timeout( 20000 );
	const server = new Server();

	before( () => server.start() );

	after( () => server.stop() );

	it( 'should get restbase style shim request for uri', () => preq.get( {
		uri: `${ server.config.uri }mediawiki/http%3A%2F%2Fwww.example.com`
	} ).then( ( res ) => {
		assert.deepEqual( res.status, 200 );
		assert.deepEqual( res.body[ 0 ].title, 'Example Domain' );
	} ) );

	it( 'should error for missing search param', () => preq.get( {
		uri: `${ server.config.uri }mediawiki/`
	} ).then( ( res ) => {
		assert.deepEqual( res.status, 400 );
	}, ( err ) => {
		assert.checkError( err, 400, "No 'search' value specified" );
	} ) );

	it( 'should get restbase style shim request for doi', () => preq.get( {
		uri: `${ server.config.uri }mediawiki/10.1371%2Fjournal.pcbi.1002947`
	} ).then( ( res ) => {
		assert.deepEqual( res.status, 200 );
		assert.deepEqual( res.body[ 0 ].title, 'Viral Phylodynamics' );
	} ) );

	it( 'should get non-restbase style request for uri', () => server.query( 'http://example.com' ).then( ( res ) => {
		assert.status( res, 200 );
		assert.deepEqual( res.body[ 0 ].title, 'Example Domain' );
	} ) );

} );
