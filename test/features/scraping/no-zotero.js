'use strict';

/**
 * Tests for when Zotero is down/inaccessible
 */

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );
const nock = require( 'nock' );

describe( 'Zotero service down or disabled:', () => {

	describe( 'unreachable', () => {

		const server = new Server();

		// Give Zotero port which is it is not running from-
		// Mimics Zotero being down.
		before( () => server.start( { zoteroPort: 1971 } ) );

		after( () => server.stop() );

		// PMID on NIH website that is not found in the id converter api
		// This will fail when Zotero is disabled because we no longer directly scrape pubMed central URLs,
		// as they have blocked our UA in the past.
		it( 'PMID not in doi id converter api', () => {
			const pmid = '14656957';
			return server.query( pmid )
				.then( ( res ) => {
					assert.fail();
				}, ( err ) => {
					assert.checkError( err, 404 ); // Exact error may differ as may be interpreted as pmcid or pmid
				} );
		} );

		it.skip( 'requires JS to be enabled', () => server.query( 'http://www.sciencemag.org/content/303/5656/387.short' ).then( ( res ) => {
			assert.fail();
		}, ( err ) => {
			assert.status( err, 404 );
		} ) );

		it( 'successfully uses bepress press metadata alone', () => server.query( 'http://uknowledge.uky.edu/upk_african_history/1/' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'South Africa and the World: The Foreign Policy of Apartheid' );
			assert.deepEqual( res.body[ 0 ].author.length, 1, 'Should have 1 author' );
			assert.deepEqual( res.body[ 0 ].date, '1970', 'Incorrect or missing date' ); // Comes from highwire
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType ); // Actually is a book but no way to tell from metadata :(

		} ) );

		it( 'Get error for bibtex export', () => server.query( 'http://www.example.com', 'bibtex', 'en' )
			.then( ( res ) => {
				assert.fail();
			}, ( err ) => {
				assert.deepEqual( err.body.error, 'Unable to serve bibtex format at this time' );
				assert.status( err, 404 );
				// assert.checkError(err, 404, 'Unable to serve bibtex format at this time');
			} ) );

		// Prefer original url for using native scraper
		it( 'uses original url', () => {
			const url = 'http://www.google.com';
			return server.query( url ).then( ( res ) => {
				assert.checkCitation( res, 'Google' );
				assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
				assert.deepEqual( res.body[ 0 ].url, url );
			} );
		} );

		it( 'websiteTitle but no publicationTitle', () => server.query( 'http://blog.woorank.com/2013/04/dublin-core-metadata-for-seo-and-usability/' ).then( ( res ) => {
			assert.checkCitation( res );
			assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
			assert.deepEqual( !!res.body[ 0 ].websiteTitle, true, 'Missing websiteTitle field' );
			assert.deepEqual( res.body[ 0 ].publicationTitle, undefined, 'Invalid field publicationTitle' );
		} ) );

		it.skip( 'dublinCore data with multiple identifiers in array', () => server.query( 'http://apps.who.int/iris/handle/10665/70863' ).then( ( res ) => {
			assert.checkCitation( res, 'Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
			assert.deepEqual( res.body[ 0 ].publisher, undefined ); // TODO: Investigate why this is undefined
			assert.deepEqual( res.body[ 0 ].publicationTitle, undefined ); // TODO: Investigate why this is undefined
		} ) );

		it( 'Only PMCID but no PMID or DOI; does not scrape', () => server.query( 'PMC2096233',
			'mediawiki', 'en', 'true' ).then( ( res ) => {
			assert.fail();
		}, ( err ) => {
			assert.checkError( err, 404 );
		} ) );
	} );

	describe( 'disabled in conf', function () {

		const server = new Server();
		this.timeout( 40000 );

		before( () => server.start( { zotero: false } ) );

		after( () => server.stop() );

		afterEach( () => nock.cleanAll() );

		function mockUnscrapableDoi( doi, message ) {
			nock( 'https://doi.org' )
				.get( `/${ doi }` )
				.reply( 302, undefined, { Location: 'https://example.org/article.html' } );
			nock( 'https://example.org' )
				.get( '/article.html' )
				.reply( 403 );
			nock( 'https://api.crossref.org' )
				.get( `/works/${ encodeURIComponent( doi ) }` )
				.query( true )
				.reply( 200, { status: 'ok', message: Object.assign( { DOI: doi, title: [ 'Test' ], URL: `https://doi.org/${ doi }` }, message ) } );
		}

		// PMID on NIH website that is not found in the id converter api
		// This will fail when Zotero is disabled because we no longer directly scrape pubMed central URLs,
		// as they have blocked our UA in the past.
		it( 'PMID not in doi id converter api', () => {
			const pmid = '14656957';
			return server.query( pmid )
				.then( ( res ) => {
					assert.status( res, 404 );
				}, ( err ) => {
					assert.checkError( err, 404 ); // Error may be for pmcid or pmid
				} );
		} );

		it.skip( 'requires JS to be enabled', () => server.query( 'http://www.sciencemag.org/content/303/5656/387.short' ).then( ( res ) => {
			assert.fail();
		}, ( err ) => {
			assert.status( err, 404 );
		} ) );

		it( 'Crossref page field converted to en dash range', () => {
			nock( 'http://dx.doi.org' )
				.get( '/10.1234/test' )
				.reply( 302, undefined, { Location: 'https://example.org/article.html' } );
			nock( 'https://example.org' )
				.get( '/article.html' )
				.twice()
				.reply( 200, '<title>Test</title>', { 'Content-Type': 'text/html' } );
			nock( 'https://api.crossref.org' )
				.get( `/works/${ encodeURIComponent( '10.1234/test' ) }` )
				.query( true )
				.reply( 200, { status: 'ok', message: { type: 'journal-article', title: [ 'Test' ], DOI: '10.1234/test', page: '90-93' } } );
			return server.query( 'http://dx.doi.org/10.1234/test' ).then( ( res ) => {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Test' );
				assert.isInArray( res.body[ 0 ].source, 'Crossref' );
				assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
				assert.deepEqual( res.body[ 0 ].pages, '90–93', 'Missing pages' ); // Uses en dash
				assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
			} );
		} );

		it( 'DOI pointing to resource that can\'t be scraped - uses crossRef', () => {
			mockUnscrapableDoi( '10.1234/unscrapable', {
				type: 'journal-article',
				author: [ { given: 'Jane', family: 'Doe' } ],
				issue: '2',
				volume: '282'
			} );
			return server.query( '10.1234/unscrapable' ).then( ( res ) => {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Test' );
				assert.isInArray( res.body[ 0 ].source, 'Crossref' );
				assert.deepEqual( !!res.body[ 0 ].author, true, 'Missing authors' );
				assert.deepEqual( res.body[ 0 ].issue, '2' );
				assert.deepEqual( res.body[ 0 ].volume, '282' );
				assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
				assert.deepEqual( res.body[ 0 ].websiteTitle, undefined, 'Unexpected field websiteTitle' );
				assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
			} );
		} );

		it( 'dx.DOI link - uses crossRef', () => {
			nock( 'http://dx.doi.org' )
				.get( '/10.1234/dx' )
				.reply( 302, undefined, { Location: 'https://example.org/article.html' } );
			nock( 'https://example.org' )
				.get( '/article.html' )
				.twice()
				.reply( 200, '<title>Test</title>', { 'Content-Type': 'text/html' } );
			nock( 'https://api.crossref.org' )
				.get( `/works/${ encodeURIComponent( '10.1234/dx' ) }` )
				.query( true )
				.reply( 200, { status: 'ok', message: { type: 'journal-article', title: [ 'Test' ], DOI: '10.1234/dx', author: [ { given: 'Jane', family: 'Doe' } ], issue: '2', volume: '282' } } );
			return server.query( 'http://dx.DOI.org/10.1234/dx' ).then( ( res ) => {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Test' );
				assert.isInArray( res.body[ 0 ].source, 'Crossref' );
				assert.deepEqual( !!res.body[ 0 ].author, true, 'Missing authors' );
				assert.deepEqual( res.body[ 0 ].issue, '2' );
				assert.deepEqual( res.body[ 0 ].volume, '282' );
				assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
				assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
			} );
		} );

		it( 'DOI with 5 digit registrant code and unknown type in crossRef', () => {
			mockUnscrapableDoi( '10.14344/ioc.ml.4.4', { type: 'unknown-type' } );
			return server.query( '10.14344/IOC.ML.4.4' ).then( ( res ) => {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Test' );
				assert.isInArray( res.body[ 0 ].source, 'Crossref' );
				assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
				assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
			} );
		} );

		it( 'gets date from crossRef REST API', () => {
			mockUnscrapableDoi( '10.1234/date', { type: 'journal-article', issued: { 'date-parts': [ [ 1998, 5 ] ] } } );
			return server.query( '10.1234/date' ).then( ( res ) => {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Test' );
				assert.deepEqual( res.body[ 0 ].date, '1998-05' );
				assert.isInArray( res.body[ 0 ].source, 'Crossref' );
				assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
			} );
		} );

		it( 'gets editors from crossRef REST API for book-track type', () => {
			mockUnscrapableDoi( '10.1234/booktrack', { type: 'book-track', editor: [ { given: 'Jane', family: 'Doe' } ] } );
			return server.query( '10.1234/booktrack' ).then( ( res ) => {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Test' );
				assert.deepEqual( !!res.body[ 0 ].date, false );
				assert.deepEqual( !!res.body[ 0 ].editor, true );
				assert.isInArray( res.body[ 0 ].source, 'Crossref' );
				assert.deepEqual( res.body[ 0 ].itemType, 'bookSection' );
			} );
		} );

		it( 'gets proceedings from crossRef REST API', () => {
			mockUnscrapableDoi( '10.1234/proceedings', {
				type: 'proceedings-article',
				author: [ { given: 'Jane', family: 'Doe' } ],
				issued: { 'date-parts': [ [ 2015, 4, 14 ] ] }
			} );
			return server.query( '10.1234/proceedings' ).then( ( res ) => {
				assert.status( res, 200 );
				assert.checkCitation( res, 'Test' );
				assert.deepEqual( res.body[ 0 ].date, '2015-04-14' );
				assert.deepEqual( !!res.body[ 0 ].author, true );
				assert.isInArray( res.body[ 0 ].source, 'Crossref' );
				assert.deepEqual( res.body[ 0 ].itemType, 'conferencePaper' );
			} );
		} );

		it( 'successfully uses bepress press metadata alone', () => server.query( 'http://uknowledge.uky.edu/upk_african_history/1/' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkCitation( res, 'South Africa and the World: The Foreign Policy of Apartheid' );
			assert.deepEqual( res.body[ 0 ].author.length, 1, 'Should have 1 author' );
			assert.deepEqual( res.body[ 0 ].date, '1970', 'Incorrect or missing date' ); // Comes from highwire
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType ); // Actually is a book but no way to tell from metadata :(

		} ) );

		it( 'Get error for bibtex export', () => server.query( 'http://www.example.com', 'bibtex', 'en' )
			.then( ( res ) => {
				assert.fail();
			}, ( err ) => {
				assert.deepEqual( err.body.error, 'Unable to serve bibtex format at this time' );
				assert.status( err, 404 );
				// assert.checkError(err, 404, 'Unable to serve bibtex format at this time');
			} ) );

		it( 'No PMID or DOI; does not scrape', () => server.query( 'PMC2096233',
			'mediawiki', 'en', 'true' ).then( ( res ) => {
			assert.fail();
		}, ( err ) => {
			assert.checkError( err, 404 );
		} ) );
	} );

} );
