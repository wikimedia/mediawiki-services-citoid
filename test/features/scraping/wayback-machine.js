'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'Wayback fallback scraping tests: ', function () {

	describe( 'Zotero inaccessible', function () {

		this.timeout( 20000 );
		const server = new Server();
		before( () => server.start( { zotero: 1971, wayback: true } ) );
		after( () => server.stop() );

		it( 'Does not find archive url for live page', function () {
			return server.query( 'http://example.com' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Example Domain' );
				assert.deepEqual( !!res.body[ 0 ].archiveDate, false );
				assert.deepEqual( !!res.body[ 0 ].archiveUrl, false );
			} );
		} );

		it( 'Dead url that 404s', function () {
			return server.query( 'http://emlab.berkeley.edu/~dahn/C103/index.html' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkCitation( res, 'David Ahn - Economics/Mathematics C103' );
				assert.deepEqual( !!res.body[ 0 ].archiveDate, true );
				assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			} );
		} );

		it( 'Dead url that 404s but redirects- scrapes redirected page', function () {
			return server.query( 'http://www.vangoghmuseum.nl/vgm/index.jsp?page=2122&lang=en' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Hét museum over Vincent van Gogh in Amsterdam' );
				assert.deepEqual( !!res.body[ 0 ].archiveDate, false );
				assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			} );
		} );

		it( 'Dead PDF url', function () {
			return server.query( 'https://www.foxtel.com.au/content/dam/foxtel/support/pdf/channel-packs.pdf' ).then( function ( res ) {
				assert.status( res, 200 ); // TODO: Ideally should be 415
			} );
		} );

	} );

	describe( 'Zotero disabled', function () {

		this.timeout( 20000 );
		const server = new Server();
		before( () => server.start( { zotero: false, wayback: true } ) );
		after( () => server.stop() );

		it( 'Does not find archive url for live page', function () {
			return server.query( 'http://example.com' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Example Domain' );
				assert.deepEqual( !!res.body[ 0 ].archiveDate, false );
				assert.deepEqual( !!res.body[ 0 ].archiveUrl, false, 'archiveUrl present' );
			} );
		} );

		it( 'Dead url that 404s', function () {
			return server.query( 'http://emlab.berkeley.edu/~dahn/C103/index.html' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkCitation( res, 'David Ahn - Economics/Mathematics C103' );
				assert.deepEqual( !!res.body[ 0 ].archiveDate, true );
				assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			} );
		} );

		it( 'Dead PDF url', function () {
			return server.query( 'https://www.foxtel.com.au/content/dam/foxtel/support/pdf/channel-packs.pdf' ).then( function ( res ) {
				assert.status( res, 200 ); // TODO: Ideally should be 415
			} );
		} );

	} );

	describe( 'Wayback disabled', function () {

		this.timeout( 20000 );
		const server = new Server();
		before( () => server.start( { zotero: false, wayback: false } ) );
		after( () => server.stop() );

		it( 'Does not find archive url for live page', function () {
			return server.query( 'http://example.com' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Example Domain' );
				assert.deepEqual( !!res.body[ 0 ].archiveDate, false );
				assert.deepEqual( !!res.body[ 0 ].archiveUrl, false, 'archiveUrl present' );
			} );
		} );

		it( 'Dead url that 404s', function () {
			return server.query( 'http://emlab.berkeley.edu/~dahn/C103/index.html' ).then( function ( res ) {
				assert.status( res, 404 );
			}, function ( err ) {
				assert.status( err, 404 );
			} );
		} );

		it( 'Dead PDF url', function () {
			return server.query( 'https://www.foxtel.com.au/content/dam/foxtel/support/pdf/channel-packs.pdf' ).then( function ( res ) {
				assert.status( res, 404 ); // TODO: Ideally should be 415
			}, function ( err ) {
				assert.status( err, 404 );
			} );
		} );

	} );
} );
