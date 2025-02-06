/**
 * Tests ISBN which uses zotero ISBN lookup service
 */

'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'ISBN tests:', function () {

	this.timeout( 40000 );
	const server = new Server();

	// Use zotero search endpoint for isbn
	describe( 'zotero isbn:', () => {

		before( () => server.start() );

		after( () => server.stop() );

		it( 'valid ISBN', () => server.query( '978-0-596-51979-7' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkZotCitation( res, 'MediaWiki' );
			assert.deepEqual( !!res.body[ 0 ].oclc, true, 'Missing OCLC' );
			assert.deepEqual( res.body[ 0 ].author, [ [ 'Daniel J.', 'Barrett' ] ], 'Unexpected value; expected [[\'Daniel J.\'], [\'Barrett.\']] ' + res.body[ 0 ].author );
			assert.deepEqual( res.body[ 0 ].publisher, 'O\'Reilly Media', 'Unexpected value; expected O\'Reilly Media, got ' + res.body[ 0 ].publisher );
			assert.deepEqual( res.body[ 0 ].place, 'Sebastapool, Calif', 'Unexpected value; expected Sebastapool, Calif., got ' + res.body[ 0 ].place );
			assert.deepEqual( res.body[ 0 ].edition, '1st ed', 'Unexpected value; expected 1st ed., got ' + res.body[ 0 ].edition );
			assert.deepEqual( res.body[ 0 ].date, '2009', 'Unexpected value; expected 2009, got ' + res.body[ 0 ].date );
			assert.isInArray( res.body[ 0 ].ISBN, '978-0-596-51979-7' );
			assert.deepEqual( res.body[ 0 ].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[ 0 ].itemType );
		} ) );

		it( 'valid ISBN with funky author field', () => server.query( '978043-9784542' ).then( ( res ) => {
			assert.status( res, 200 );
			// assert.checkZotCitation(res, 'Harry Potter and the half-blood prince'); // No url
			assert.deepEqual( res.body[ 0 ].title, 'Harry Potter and the Half-Blood Prince', 'Unexpected value; expected "Harry Potter and the Half-blood Prince," got ' + res.body[ 0 ].title );
			// assert.deepEqual(!!res.body[0].oclc, true, 'Missing OCLC');
			assert.deepEqual( res.body[ 0 ].author, [ [ 'J. K.', 'Rowling' ], [ 'Mary', 'GrandPré' ] ] );
			assert.deepEqual( res.body[ 0 ].place, 'New York, NY', 'Unexpected value; expected New York, NY, got ' + res.body[ 0 ].place );
			assert.deepEqual( res.body[ 0 ].edition, '1st American ed', 'Unexpected value; expected 1st ed., got ' + res.body[ 0 ].edition );
			assert.isInArray( res.body[ 0 ].ISBN, '978-0-439-78454-2' );
			assert.deepEqual( res.body[ 0 ].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[ 0 ].itemType );
		} ) );

		// Skip as requires worldcat
		it.skip( 'valid DVD ISBN - type Image', () => server.query( '978-0756662967' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkZotCitation( res, 'Eyewitness DVD.' ); // Not great
			assert.deepEqual( !!res.body[ 0 ].oclc, true, 'Missing OCLC' );
			// assert.deepEqual(!!res.body[0].author, true, 'Missing author');
			assert.deepEqual( res.body[ 0 ].publisher, 'DK Publishing', 'Unexpected value; expected DK Pub., got ' + res.body[ 0 ].publisher );
			// assert.deepEqual(res.body[0].place, 'New York', 'Unexpected value; expected New York, got ' + res.body[0].place);
			assert.deepEqual( res.body[ 0 ].date, '2010', 'Unexpected value; expected 2010, got ' + res.body[ 0 ].date );
			assert.isInArray( res.body[ 0 ].ISBN, '978-0-7566-6296-7' );
			assert.deepEqual( res.body[ 0 ].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[ 0 ].itemType );
		} ) );

		it( 'invalid ISBN', () => {
			const isbn = '9780596519798';
			return server.query( isbn, 'mediawiki', 'en' )
				.then( ( res ) => {
					assert.status( res, 404 );
				}, ( err ) => {
					assert.checkError( err, 404, 'Unable to retrieve data from ISBN ' + isbn,
						'Unexpected error message ' + err.body.Error );
				} );
		} );
	} );

} );
