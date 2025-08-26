'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

const url = 'https://en.wikipedia.org/404';
const doi = '10.1000/thisdoidoesntexist';
const localhost = 'http://localhost:1970';

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

		it( '404', () => server.query( url, 'bibtex' ).then( ( res ) => {
			assert.status( res, 404 );
		}, ( err ) => {
			assert.status( err, 404 );
		} ) );

		it( 'invalid DOI', () => server.query( doi, 'bibtex' ).then( ( res ) => {
			assert.status( res, 404 );
		}, ( err ) => {
			assert.status( err, 404 );
		} ) );

		it( 'invalid address', () => server.query( localhost, 'bibtex', 'en' )
			.then( ( res ) => {
				assert.status( res, 400 );
			}, ( err, res ) => {
				assert.status( err, 400 );
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
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
		} ) );

		it( '404', () => server.query( url, 'zotero' ).then( ( res ) => {
			assert.status( res, 404 );
		}, ( err ) => {
			assert.status( err, 404 );
		} ) );

		it( 'invalid DOI ', () => server.query( doi, 'zotero' ).then( ( res ) => {
			assert.status( res, 404 );
		}, ( err ) => {
			assert.status( err, 404 );
		} ) );

		it( 'invalid address', () => server.query( localhost, 'zotero', 'en' )
			.then( ( res ) => {
				assert.status( res, 400 );
			}, ( err, res ) => {
				assert.status( err, 400 );
			} ) );
	} );

	describe( 'Exporting to wikibase:', () => {
		it( 'valid ISBN', () => server.query( '978-0-596-51979-7', 'wikibase' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.deepEqual( res.body[ 0 ].title, 'MediaWiki' );
			assert.deepEqual( !!res.body[ 0 ].oclc, false, 'Unexpected oclc ' + res.body[ 0 ].oclc );
			assert.deepEqual( res.body[ 0 ].date, '2009' );
			assert.isInArray( res.body[ 0 ].identifiers.isbn13, '978-0-596-51979-7' );
			assert.deepEqual( res.body[ 0 ].itemType, 'book' );
		} ) );

		it( 'doi with ISSN', () => server.query( 'doi:10.1039/b309952k', 'wikibase' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			assert.notDeepEqual( res.body[ 0 ].accessDate, 'CURRENT_TIMESTAMP', 'Access date uncorrected' );
			assert.ok( res.body[ 0 ].creators );
			assert.ok( res.body[ 0 ].identifiers.doi );
			assert.deepEqual( res.body[ 0 ].ISSN, [ '1463-9076', '1463-9084' ] );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
		} ) );

		it( '404', () => server.query( url, 'bibtex' ).then( ( res ) => {
			assert.status( res, 404 );
		}, ( err ) => {
			assert.status( err, 404 );
		} ) );

		it( 'invalid DOI', () => server.query( doi, 'wikibase' ).then( ( res ) => {
			assert.status( res, 404 );
		}, ( err ) => {
			assert.status( err, 404 );
		} ) );

		it( 'invalid address', () => server.query( localhost, 'wikibase', 'en' )
			.then( ( res ) => {
				assert.status( res, 400 );
			}, ( err, res ) => {
				assert.status( err, 400 );
			} ) );
	} );

} );
