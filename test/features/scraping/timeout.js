'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'Tests using a very short timeout - all use crossRef - zotero disabled', () => {

	const server = new Server();

	before( () => server.start( {
		zotero: false,
		timeout: 1
	} ) );

	after( () => server.stop() );

	describe( 'DOI  ', () => {
		it( 'DOI- missing PMCID', () => server.query( '10.1098/rspb.2000.1188' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'Moth hearing in response to bat echolocation calls manipulated independently in time and frequency' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		// DOI which points directly to a resource
		it( 'direct DOI', () => server.query( '10.1056/NEJM200106073442306' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'AIDS — The First 20 Years' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].pages, '1764–1772', 'Wrong pages item; expected 1764–1772, got ' + res.body[ 0 ].pages );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		// DOI which points to a link which contains further redirects
		it( 'DOI with redirect', () => server.query( '10.1371/journal.pcbi.1002947' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].pages, 'e1002947', 'Wrong pages item; expected e1002947, got ' + res.body[ 0 ].pages );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		// Ensure DOI is present in zotero scraped page when requested from link containing DOI
		it.skip( 'non-dx.DOI link with DOI pointing to resource in zotero with no DOI', () => server.query( 'http://link.springer.com/chapter/10.1007/11926078_68' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
		} ) );

		// Ensure DOI is present in zotero scraped page when requested from DOI
		it( 'DOI pointing to resource in zotero with no DOI', () => server.query( '10.1007/11926078_68' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
		} ) );

		// Ensure DOI is present in non-zotero scraped page when request from DOI link
		it.skip( 'DOI.org link pointing to resource in zotero with no DOI', () => server.query( 'http://DOI.org/10.1007/11926078_68' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
		} ) );

		// Ensure DOI is present in non-zotero scraped page when request from DOI link
		it( 'DOI which requires cookie to properly follow redirect to Zotero', () => server.query( '10.1642/0004-8038(2005)122[0673:PROAGP]2.0.CO;2' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'Phylogenetic Relationships of Antpitta Genera (Passeriformes: Formicariidae)' );
			assert.deepEqual( res.body[ 0 ].publicationTitle, 'The Auk', 'Incorrect publicationTitle; Expected The Auk, got' + res.body[ 0 ].publicationTitle );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( !!res.body[ 0 ].issue, true, 'Missing issue' );
			assert.deepEqual( !!res.body[ 0 ].volume, true, 'Missing volume' );
		} ) );

		it( 'doi pointing to conferencePaper', () => server.query( '10.1007/11926078_68' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'Semantic MediaWiki' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].itemType, 'bookSection', 'Wrong itemType; expected bookSection, got' + res.body[ 0 ].itemType );
		} ) );

		// Regression: phab:T388517 Fake url but with info in cross ref that can be pulled from doi in url - uses requestFromDOI
		it.skip( 'doi in url with query parameters', () => server.query( 'example.com/10.1086/378695?uid=3739832&uid=2&uid=4&uid=3739256&sid=21105503736473' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'Salaries, Turnover, and Performance in the Federal Criminal Justice System' );
			assert.deepEqual( res.body[ 0 ].DOI, '10.1086/378695' );
		} ) );

		it( 'doi with US style date', () => server.query( '10.1542/peds.2007-2362' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'Management of Children With Autism Spectrum Disorders' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].date, '2007-11-01', 'Incorrect date; expected 2007-11-01, got ' + res.body[ 0 ].date );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );

		} ) );
	} );

} );
