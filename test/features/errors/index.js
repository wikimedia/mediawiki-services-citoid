'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'errors', () => {

	const server = new Server();

	before( () => server.start() );

	after( () => server.stop() );

	describe( 'deprecated api: ', () => {
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		it( 'format only', () => fetch( `${ server.config.uri }api?format=mediawiki` )
			.then( ( res ) => {
				assert.status( res, 400 );
				return res.json().then( ( body ) => {
					assert.deepEqual( body.error, 'Api endpoint unavailable as of 2.0.0.; use path parameters instead.' );
				} );
			} ) );

		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		it( 'search only', () => fetch( `${ server.config.uri }api?search=123456` )
			.then( ( res ) => {
				assert.status( res, 400 );
				return res.json().then( ( body ) => {
					assert.deepEqual( body.error, 'Api endpoint unavailable as of 2.0.0.; use path parameters instead.' );
				} );
			} ) );

		it( 'valid search and format', () => {
			const format = 'badformat';
			// eslint-disable-next-line n/no-unsupported-features/node-builtins
			return fetch( `${ server.config.uri }api?search=123456&format=${ format }` )
				.then( ( res ) => {
					assert.status( res, 400 );
					return res.json().then( ( body ) => {
						assert.deepEqual( body.error, 'Api endpoint unavailable as of 2.0.0.; use path parameters instead.' );
					} );
				} );
		} );
	} );

	it( 'bad domain', () => server.query( 'example./com', 'mediawiki', 'en' )
		.then( ( res ) => {
			assert.status( res, 400 );
		}, ( err ) => {
			assert.status( err, 400 );
			assert.deepEqual( err.body.error, 'Invalid host supplied' );
		} ) );

	it( 'resource has http errors', () => {
		const url = 'https://en.wikipedia.org/404';
		return server.query( url, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.status( err, 404 );
				assert.deepEqual( err.body.error, 'Unable to load URL ' + url );
			} );
	} );

	it( 'unknown doi', () => {
		const doi = '10.1000/thisdoidoesntexist';
		return server.query( doi, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.checkError( err, 404, 'Unable to resolve DOI ' + doi,
					'Unexpected error message ' + err.body.error );
			} );
	} );

	it( 'doi url with single quote', () => {
		const doi = 'http://DOI.org/10.1007/11926078_68\'';
		return server.query( doi, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.checkError( err, 404, 'Unable to load URL https://doi.org/10.1007/11926078_68%27',
					'Unexpected error message ' + err.body.error );
			} );
	} );

	it( 'doi url with double quote', () => {
		const doi = 'http://DOI.org/10.1007/11926078_68"';
		return server.query( doi, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.checkError( err, 404, 'Unable to load URL https://doi.org/10.1007/11926078_68%22',
					'Unexpected error message ' + err.body.error );
			} );
	} );

	it( 'doi with single quote', () => {
		const doi = '10.1007/11926078_68\'';
		return server.query( doi, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 404 );
			}, ( err ) => {
				assert.checkError( err, 404, "Unable to resolve DOI 10.1007/11926078_68'",
					'Unexpected error message ' + err.body.error );
			} );
	} );

	it( 'PDF contentType unsupported', () => {
		const url = 'https://upload.wikimedia.org/wikipedia/commons/9/98/Coloring_page_for_Wikipedia_Day_2019_in_NYC.pdf';
		return server.query( url, 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 415 );
			}, ( err ) => {
				assert.status( err, 415 );
				assert.deepEqual( err.body.error, 'The remote document is not in a supported format' );
				assert.deepEqual( err.body.contentType, 'application/pdf' );
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
					'Unexpected error message ' + err.body.error );
			} );
	} );

} );
