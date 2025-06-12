'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'Exports into non mediawiki formats:', () => {

	const server = new Server();

	before( () => server.start( { zotero: true } ) );

	after( () => server.stop() );

	describe( 'Exporting to bibtex: ', () => {
		it( 'bibtex from scraper', () => server.query( 'http://example.com', 'bibtex' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkBibtex( res, '\n@misc{noauthor_exa' );
		} ) );

		it( 'bibtex from pubmed', () => server.query( 'http://www.ncbi.nlm.nih.gov/pubmed/14656957', 'bibtex' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkBibtex( res, '\n@article{chobanian_seventh_20' );
		} ) );

		it( 'bibtex from pmid', () => server.query( '14656957', 'bibtex' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkBibtex( res, '\n@article{chobanian_seventh_20' );
		} ) );

	} );

	describe( 'Exporting to zotero: ', () => {
		// May or may not come from zotero depending on version, but asking for it in Zotero format.
		it( 'doi', () => server.query( '10.1007/11926078_68', 'zotero' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.deepEqual( res.body[ 0 ].title, 'Semantic MediaWiki' );
			assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			assert.notDeepEqual( res.body[ 0 ].accessDate, 'CURRENT_TIMESTAMP', 'Access date uncorrected' );
			assert.ok( res.body[ 0 ].creators );
		} ) );

		it( 'doi with ISSN', () => server.query( 'doi:10.1039/b309952k', 'zotero' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			assert.notDeepEqual( res.body[ 0 ].accessDate, 'CURRENT_TIMESTAMP', 'Access date uncorrected' );
			assert.ok( res.body[ 0 ].creators );
			assert.ok( res.body[ 0 ].DOI );
			assert.deepEqual( res.body[ 0 ].ISSN, '1463-9076, 1463-9084' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );
	} );

	describe( 'Exporting to wikibase:', () => {
		it( 'valid ISBN', () => server.query( '978-0-596-51979-7', 'wikibase' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.deepEqual( !!res.body[ 0 ].oclc, false, 'Unexpected oclc ' + res.body[ 0 ].oclc );
			assert.deepEqual( res.body[ 0 ].publisher, 'O\'Reilly', 'Unexpected value; expected O\'Reilly Media, got ' + res.body[ 0 ].publisher );
			assert.deepEqual( res.body[ 0 ].place, 'Beijing Köln', 'Unexpected value; expected Beijing Köln, got ' + res.body[ 0 ].place );
			assert.deepEqual( res.body[ 0 ].edition, '1. ed', 'Unexpected value; expected 1. ed, got ' + res.body[ 0 ].edition );
			assert.deepEqual( res.body[ 0 ].date, '2009', 'Unexpected value; expected 2009, got ' + res.body[ 0 ].date );
			assert.isInArray( res.body[ 0 ].identifiers.isbn13, '978-0-596-51979-7' );
			assert.deepEqual( res.body[ 0 ].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[ 0 ].itemType );
		} ) );

		it( 'doi with ISSN', () => server.query( 'doi:10.1039/b309952k', 'wikibase' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			assert.notDeepEqual( res.body[ 0 ].accessDate, 'CURRENT_TIMESTAMP', 'Access date uncorrected' );
			assert.ok( res.body[ 0 ].creators );
			assert.ok( res.body[ 0 ].identifiers.doi );
			assert.deepEqual( res.body[ 0 ].ISSN, [ '1463-9076', '1463-9084' ] );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );
	} );

	describe( 'Exporting to mwDeprecated no longer functioning : ', () => {
		it( 'Uses formerly correct parameter', () => server.query( '10.1007/11926078_68', 'mwDeprecated' ).then( ( res ) => {
			assert.status( res, 400 );
		}, ( err ) => {
			assert.checkError( err, 400, 'Invalid format requested mwDeprecated' );
		} ) );

	} );
} );
