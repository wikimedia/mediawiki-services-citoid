'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'Freetext or ambiguous search, classified as "any" input type, i.e. title or citation', () => {

	describe( 'Default config', () => {

		const server = new Server();

		before( () => server.start( { zotero: false } ) );

		after( () => server.stop() );

		it( 'spaces in url missing http:// and www', () => {
			const url = 'example.com/spaces in url';
			return server.query( url, 'mediawiki', 'en' )
				.then( ( res ) => {
					assert.status( res, 200 );
					assert.deepEqual( res.body.length, 1 ); // One from Crossref as url 404s
				} );
		} );

		// Uses json as plain text search term; previously gave error
		it( 'json in search', () => server.query( '{"json":"object"}', 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 200 );
			} ) );

		// Uses search; previously gave error
		it( 'javascript in search', () => server.query( 'f<script>alert(1);</script>', 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 200 );
			} ) );

		// Uses search; previously gave error
		it( 'localhost:1970', () => server.query( 'localhost:1970', 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 200 );
			}, ( err, res ) => {
				assert.status( err, 200 );
			} ) );

		it( 'Open search for Schrodinger', () => server.query( 'E. Schrodinger, Proc. Cam. Phil. Soc. 31, 555 (1935)' ).then( ( res ) => {
			assert.checkCitation( res, 'Discussion of Probability Relations between Separated Systems' );
			assert.deepEqual( res.body.length, 1 ); // One from Crossref
		} ) );

		it( 'Open search containing <> works; but gets wrong results from crossRef', () => server.query( 'Title. Available at: <http://www.example.com>. Accessed on May 19, 1998.' ).then( ( res ) => {
			assert.checkCitation( res );
			assert.deepEqual( res.body.length, 2 ); // One from url, one from Crossref
		} ) );

		it( 'Open search with www but no protocol', () => server.query( 'Title. Available at: <www.example.com>. Accessed on May 19, 1998.' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.deepEqual( res.body.length, 2 ); // One from url, one from Crossref
		} ) );

		// 403 from url, but was previously able to get metadatafrom DOI - no longer in crossref
		it.skip( 'Open search with doi', () => server.query( 'Kingsolver JG, Hoekstra HE, Hoekstra JM, Berrigan D, Vignieri SN, Hill CE, Hoang A, Gibert P, Beerli P (2001) Data from: The strength of phenotypic selection in natural populations. Dryad Digital Repository. doi:10.5061/dryad.166' ).then( ( res ) => {
			assert.checkCitation( res, 'Dryad | Data -- The strength of phenotypic selection in natural populations' );
			assert.deepEqual( res.body.length, 1 ); // One citation from detected DOI
		} ) );

		// Gets correct data from url, incorrect data from crossRef
		it( 'Open search with url', () => server.query( 'Frederico Girosi; Gary King, 2006, ‘Cause of Death Data’, http://hdl.handle.net/1902.1/UOVMCPSWOL UNF:3:9JU+SmVyHgwRhAKclQ85Cg== IQSS Dataverse Network [Distributor] V3 [Version].' ).then( ( res ) => {
			assert.checkCitation( res );
			assert.deepEqual( res.body.length, 1 ); // One from from Crossref
		} ) );

		// Gets item from single search term
		it( 'Open search with single term', () => server.query( 'Mediawiki' ).then( ( res ) => {
			assert.checkCitation( res );
			assert.deepEqual( res.body.length, 1 ); // One from Crossref
		} ) );

		// Gets item from single search term
		it( 'Harry Potter', () => server.query( 'Mediawiki' ).then( ( res ) => {
			assert.checkCitation( res );
			assert.deepEqual( res.body.length, 1 ); // One from Crossref
		} ) );

		// Test that empty results from crossRef returns 404
		it( 'No results returns 404', () => server.query( 'User:L' ).then( ( res ) => {
			assert.status( res, 404 );
			assert.deepEqual( res.body, { error: 'No results for search term User:L' } );
		}, ( err ) => {
			assert.status( err, 404 );
			assert.deepEqual( err.body, { error: 'No results for search term User:L' } );
		} ) );

		it( 'should fail for whitespace-only query', () => server.query( ' ' ).then( ( res ) => {
			assert.status( res, 400 );
			assert.deepEqual( res.body, { error: "No 'search' value specified" } );
		}, ( err ) => {
			assert.status( err, 400 );
			assert.deepEqual( err.body, { error: "No 'search' value specified" } );
		} ) );

		it( 'should extract URL from citation template with pipes', () => {
			const citationTemplate = '<ref>{{cite web |url=http://www.example.com |access-date=January 22, 2022}}</ref>';
			return server.query( citationTemplate, 'mediawiki', 'en' ).then( ( res ) => {
				assert.status( res, 200 );
				assert.deepEqual( res.body.length, 2 );
			} );
		} );

		it( 'should only get open search results as url cannot be extracted', () => {
			const citationTemplate = '<ref>{{cite+web+|url=http://www.example.com+|access-date=January+22,+2022}}</ref>';
			return server.query( citationTemplate, 'mediawiki', 'en' ).then( ( res ) => {
				assert.status( res, 200 );
				assert.deepEqual( res.body.length, 1 );
			} );
		} );
	} );

} );
