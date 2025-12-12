'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'Wayback fallback scraping tests: ', () => {

	describe( 'Zotero inaccessible', () => {

		const server = new Server();
		before( () => server.start( { zotero: 1971, wayback: true } ) );
		after( () => server.stop() );

		it( 'Does not find archive url for live page', () => server.query( 'http://example.com' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'Example Domain' );
			assert.deepEqual( !!res.body[ 0 ].archiveDate, false );
			assert.deepEqual( !!res.body[ 0 ].archiveUrl, false );
		} ) );

		it( 'Dead url that 404s', () => server.query( 'http://emlab.berkeley.edu/~dahn/C103/index.html' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'David Ahn - Economics/Mathematics C103' );
			assert.deepEqual( !!res.body[ 0 ].archiveDate, true );
			assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
		} ) );

		it( 'Dead url that 404s but redirects- scrapes redirected page', () => server.query( 'http://www.vangoghmuseum.nl/vgm/index.jsp?page=2122&lang=en' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'Hét museum over Vincent van Gogh in Amsterdam' );
			assert.deepEqual( !!res.body[ 0 ].archiveDate, false );
			assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
		} ) );

		it( 'Dead PDF url', () => server.query( 'https://www.foxtel.com.au/content/dam/foxtel/support/pdf/channel-packs.pdf' ).then( ( res ) => {
			assert.status( res, 200 ); // TODO: Ideally should be 415
		} ) );

		it( 'Doi to PDF', () => server.query( '10.26656/fr.2017.4(s1).s12' ).then( ( res ) => {
			assert.status( res, 200 );
		} ) );

	} );

	describe( 'Zotero disabled', () => {

		const server = new Server();
		before( () => server.start( { zotero: false, wayback: true } ) );
		after( () => server.stop() );

		it( 'Does not find archive url for live page', () => server.query( 'http://example.com' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'Example Domain' );
			assert.deepEqual( !!res.body[ 0 ].archiveDate, false );
			assert.deepEqual( !!res.body[ 0 ].archiveUrl, false, 'archiveUrl present' );
		} ) );

		it( 'Dead url that 404s', () => server.query( 'http://emlab.berkeley.edu/~dahn/C103/index.html' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'David Ahn - Economics/Mathematics C103' );
			assert.deepEqual( !!res.body[ 0 ].archiveDate, true );
			assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
		} ) );

		it( 'Dead PDF url', () => server.query( 'https://www.foxtel.com.au/content/dam/foxtel/support/pdf/channel-packs.pdf' ).then( ( res ) => {
			assert.status( res, 200 ); // TODO: Ideally should be 415
		} ) );

		it( 'Doi to PDF', () => server.query( '10.26656/fr.2017.4(s1).s12' ).then( ( res ) => {
			assert.status( res, 200 );
		} ) );

	} );

	describe( 'Zotero enabled', () => {

		const server = new Server();
		before( () => server.start( { zotero: true, wayback: true } ) );
		after( () => server.stop() );

		it( 'Does not find archive url for live page', () => server.query( 'http://example.com' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'Example Domain' );
			assert.deepEqual( !!res.body[ 0 ].archiveDate, false );
			assert.deepEqual( !!res.body[ 0 ].archiveUrl, false, 'archiveUrl present' );
		} ) );

		it( 'Dead url that 404s', () => server.query( 'http://emlab.berkeley.edu/~dahn/C103/index.html' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'David Ahn - Economics/Mathematics C103' );
			assert.deepEqual( !!res.body[ 0 ].archiveDate, true );
			assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
		} ) );

		it( 'Dead PDF url', () => server.query( 'https://www.foxtel.com.au/content/dam/foxtel/support/pdf/channel-packs.pdf' ).then( ( res ) => {
			assert.status( res, 200 ); // TODO: Ideally should be 415
		} ) );

		it( 'Doi to PDF', () => server.query( '10.26656/fr.2017.4(s1).s12' ).then( ( res ) => {
			assert.status( res, 200 );
		} ) );

	} );

	describe( 'Wayback disabled', () => {

		const server = new Server();
		before( () => server.start( { zotero: false, wayback: false } ) );
		after( () => server.stop() );

		it( 'Does not find archive url for live page', () => server.query( 'http://example.com' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'Example Domain' );
			assert.deepEqual( !!res.body[ 0 ].archiveDate, false );
			assert.deepEqual( !!res.body[ 0 ].archiveUrl, false, 'archiveUrl present' );
		} ) );

		it( 'Dead url that 404s', () => server.query( 'http://emlab.berkeley.edu/~dahn/C103/index.html' ).then( ( res ) => {
			assert.fail();
		}, ( err ) => {
			assert.status( err, 404 );
		} ) );

		it( 'Dead PDF url', () => server.query( 'https://www.foxtel.com.au/content/dam/foxtel/support/pdf/channel-packs.pdf' ).then( ( res ) => {
			assert.fail();
		}, ( err ) => {
			assert.status( err, 404 );
		} ) );

	} );
} );
