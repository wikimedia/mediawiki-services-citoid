'use strict';

const fs = require( 'fs' );
const yaml = require( 'js-yaml' );

const assert = require( '../../utils/assert.js' );
const unshorten = require( '../../../lib/utils/unshorten.js' );

const CitoidRequest = require( '../../.././lib/CitoidRequest.js' );

describe( 'lib/unshorten.js', () => {

	let result;
	let url;
	let app;
	let conf;
	let cr;
	let citation;

	before( () => {
		conf = yaml.load( fs.readFileSync( __dirname + '/../../../config.yaml' ) );
		app = {
			conf: conf.services[ 0 ].conf,
			citoid: { exporter: {} } // Dummy exporter
		};
		cr = new CitoidRequest( { params: { format: [ 'mediawiki' ], search: [ 'placeholder' ] }, headers: {}, logger: console }, app );
	} );

	describe( 'request timeout', () => {

		let captured;
		let stubCr;

		beforeEach( () => {
			captured = [];
			stubCr = {
				conf: { allowPrivateAddresses: true },
				request: {
					logger: { log: () => {} },
					issueRequest: ( opts ) => {
						captured.push( { uri: opts.uri, timeout: opts.timeout } );
						const headers = ( captured.length === 1 ) ?
							{ location: 'http://www.example.com/redirected' } : {};
						return Promise.resolve( { status: 301, headers } );
					}
				}
			};
		} );

		it( 'passes timeout to each request in the redirect chain', async () => {
			const citation = {};
			await unshorten( 'http://www.example.com', stubCr, citation, 1234 );
			assert.deepEqual( captured.length, 2 );
			assert.deepEqual( captured[ 0 ].timeout, 1234 );
			assert.deepEqual( captured[ 1 ].timeout, 1234 );
			assert.deepEqual( captured[ 1 ].uri, 'http://www.example.com/redirected' );
			assert.deepEqual( citation.resolvedUrl, 'http://www.example.com/redirected' );
		} );

		it( 'leaves timeout undefined when not given', async () => {
			await unshorten( 'http://www.example.com', stubCr, {} );
			assert.deepEqual( captured.length, 2 );
			assert.deepEqual( captured[ 0 ].timeout, undefined );
			assert.deepEqual( captured[ 1 ].timeout, undefined );
		} );

	} );

	it( 'Returns successful Promise if already unshortened', () => {
		url = 'http://www.example.com';
		citation = { resolvedUrl: url };
		result = unshorten( url, cr, citation );
		assert.ok( result.then ); // Check if has then method to detect Promise
	} );

} );
