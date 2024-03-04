'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'encoding', function () {

	this.timeout( 20000 );
	const server = new Server();

	before( () => server.start() );

	after( () => server.stop() );

	it( 'javascript in format', function () {
		return server.query( 'http://www.example.com', 'f<script>alert(1);</script>', 'en' )
			.then( function ( res ) {
				assert.status( res, 400 );
			}, function ( err ) {
				assert.status( err, 400 );
				assert.deepEqual( err.body.Error,
					'Invalid format requested f%3Cscript%3Ealert(1)%3B%3C%2Fscript%3E' );
			} );
	} );

	it( 'javascript in doi', function () {
		return server.query( '10.1000/f<script>alert(1);</script>', 'mediawiki', 'en' )
			.then( function ( res ) {
				assert.status( res, 404 );
			}, function ( err ) {
				assert.status( err, 404 );
				assert.deepEqual( err.body.Error,
					'Unable to resolve DOI 10.1000/f%3Cscript%3Ealert(1);%3C/script%3E',
					'Unexpected error message ' + err.body.Error );
			} );
	} );

	it( 'json in format', function () {
		return server.query( 'http://www.example.com/', '{"json":"object"}', 'en' )
			.then( function ( res ) {
				assert.status( res, 400 );
			}, function ( err ) {
				assert.status( err, 400 );
				assert.deepEqual( err.body.Error,
					'Invalid format requested %7B%22json%22%3A%22object%22%7D' );
			} );
	} );

	it( 'spaces in fully qualified url', function () {
		const url = 'http://www.example.com/spaces in url';
		return server.query( url, 'mediawiki', 'en' )
			.then( function ( res ) {
				assert.status( res, 404 );
			}, function ( err ) {
				assert.status( err, 404 );
				assert.deepEqual( err.body.Error, 'Unable to load URL ' + encodeURI( url ) );
			} );
	} );

	it( 'spaces in url missing http://', function () {
		const url = 'www.example.com/spaces in url';
		return server.query( url, 'mediawiki', 'en' )
			.then( function ( res ) {
				assert.status( res, 404 );
			}, function ( err ) {
				assert.status( err, 404 );
				assert.deepEqual( err.body.Error, 'Unable to load URL http://' + encodeURI( url ) );
			} );
	} );

} );
