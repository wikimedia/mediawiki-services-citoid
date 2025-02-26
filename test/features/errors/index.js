'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'errors', function () {

	this.timeout( 20000 );
	const server = new Server();

	before( () => server.start() );

	after( () => server.stop() );

	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	it( 'missing search in query', () => fetch( `${ server.config.qURI }?format=mediawiki` )
		.then( ( res ) => {
			assert.status( res, 400 );
		}, ( err ) => {
			assert.checkError( err, 400, "No 'search' value specified" );
		} ) );

	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	it( 'missing format in query', () => fetch( `${ server.config.qURI }?search=123456` )
		.then( ( res ) => {
			assert.status( res, 400 );
		}, ( err ) => {
			assert.checkError( err, 400, "No 'format' value specified" );
		} ) );

	it( 'bad format in query', () => {
		const format = 'badformat';
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		return fetch( `${ server.config.qURI }?search=123456&format=${ format }` )
			.then( ( res ) => {
				assert.status( res, 400 );
			}, ( err ) => {
				assert.checkError( err, 400, 'Invalid format requested ' + format );
			} );
	} );

	it( 'bad domain', () => server.query( 'example./com', 'mediawiki', 'en' )
		.then( ( res ) => {
			assert.status( res, 400 );
		}, ( err ) => {
			assert.status( err, 400 );
			assert.deepEqual( err.body.Error, 'Invalid host supplied' );
		} ) );

	it( 'resource has http errors', () => {
		const url = 'https://en.wikipedia.org/404';
		return server.query( url, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.status( err, 404 );
				assert.deepEqual( err.body.Error, 'Unable to load URL ' + url );
			} );
	} );

	it( 'unknown doi', () => {
		const doi = '10.1000/thisdoidoesntexist';
		return server.query( doi, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.checkError( err, 404, 'Unable to resolve DOI ' + doi,
					'Unexpected error message ' + err.body.Error );
			} );
	} );

	it( 'doi url with single quote', () => {
		const doi = 'http://DOI.org/10.1007/11926078_68\'';
		return server.query( doi, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.checkError( err, 404, 'Unable to load URL https://doi.org/10.1007/11926078_68%27',
					'Unexpected error message ' + err.body.Error );
			} );
	} );

	it( 'doi url with double quote', () => {
		const doi = 'http://DOI.org/10.1007/11926078_68"';
		return server.query( doi, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.checkError( err, 404, 'Unable to load URL https://doi.org/10.1007/11926078_68%22',
					'Unexpected error message ' + err.body.Error );
			} );
	} );

	it( 'doi with single quote', () => {
		const doi = '10.1007/11926078_68\'';
		return server.query( doi, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.checkError( err, 404, "Unable to resolve DOI 10.1007/11926078_68'",
					'Unexpected error message ' + err.body.Error );
			} );
	} );

	it.skip( 'bad pmid', () => {
		const pmid = '99999999';
		return server.query( pmid, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.checkError( err, 404 ); // May be interpreted as PMID or PMCID
			} );
	} );

	it.skip( 'bad pmcid', () => {
		const pmcid = 'PMC9999999';
		return server.query( pmcid, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.checkError( err, 404, 'Unable to locate resource with pmcid ' + pmcid,
					'Unexpected error message ' + err.body.Error );
			} );
	} );

} );
