'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'Languages:', function () {

	this.timeout( 20000 );
	const server = new Server();

	describe( 'Using zotero results: ', function () {

		before( () => server.start() );

		after( () => server.stop() );

		it( 'invalid language code', function () {
			return server.query( 'http://www.ncbi.nlm.nih.gov/pubmed/23555203' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkZotCitation( res );
				assert.deepEqual( res.body[ 0 ].language, undefined, 'Should not have a language code, got: ' + res.body[ 0 ].language );
			} );
		} );

		it( 'redirects to french dolphin emulator page', function () {
			return server.query( 'http://dolphin-emu.org', 'mediawiki', 'fr' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkZotCitation( res, 'Dolphin Emulator' );
				assert.deepEqual( res.body[ 0 ].url, 'https://fr.dolphin-emu.org/?cr=fr' );
			} );
		} );

		// Support for language encoding other than those native to Node
		it( 'non-native to node encoding in response', function () {
			return server.query( 'http://corriere.it/esteri/15_marzo_27/aereo-germanwings-indizi-interessanti-casa-copilota-ff5e34f8-d446-11e4-831f-650093316b0e.shtml' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkZotCitation( res, 'Aereo Germanwings, «indizi interessanti» nella casa del copilota' );
				assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			} );
		} );

		// Support for language encoding other than those native to Node
		it( 'content-type header present in body but not in response headers', function () {
			return server.query( 'https://www.insee.fr/fr/statistiques/zones/2021173' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkZotCitation( res, 'Populations légales 2013 − Ces données sont disponibles sur toutes les communes de France | Insee' );
				assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			} );
		} );

	} );

	describe( 'Using native scraper: ', function () {

		before( () => server.start( { zotero: false } ) );

		after( () => server.stop() );

		it( 'open graph locale converted to language code', function () {
			return server.query( 'https://www.pbs.org/newshour/nation/care-peoples-kids/' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkCitation( res );
				assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
				assert.ok( res.body[ 0 ].language === 'en-US' ); // Converts en_US to en-US
			} );
		} );

		// Support for language encoding other than those native to Node
		it( 'non-native to node encoding in response', function () {
			return server.query( 'http://corriere.it/esteri/15_marzo_27/aereo-germanwings-indizi-interessanti-casa-copilota-ff5e34f8-d446-11e4-831f-650093316b0e.shtml' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Aereo Germanwings, «indizi interessanti» nella casa del copilota' );
				assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			} );
		} );

		// Support for language encoding other than those native to Node
		it( 'content-type header present in body but not in response headers', function () {
			return server.query( 'https://www.insee.fr/fr/statistiques/zones/2021173' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Populations légales 2013 − Ces données sont disponibles sur toutes les communes de France | Insee' );
				assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			} );
		} );

		// Scrapes language from html tag - not currently working
		it.skip( 'Language present in html tag', function () {
			return server.query( 'http://mno.hu/migr_1834/tellerlevel-cafolat-es-cafolat-700280' ).then( function ( res ) {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Teller-levél: cáfolat és cáfolat | Magyar Nemzet' );
				assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
				assert.ok( res.body[ 0 ].language === 'hu' ); // Converts en_US to en-US
			} );
		} );
	} );

} );
