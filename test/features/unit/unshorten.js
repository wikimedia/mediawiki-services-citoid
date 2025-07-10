'use strict';

const fs = require( 'fs' );
const yaml = require( 'js-yaml' );

const assert = require( '../../utils/assert.js' );
const unshorten = require( '../../.././lib/unshorten.js' );

const CitoidRequest = require( '../../.././lib/CitoidRequest.js' );

describe( 'lib/unshorten.js', () => {

	let result;
	let url;
	let app;
	let conf;
	let cr;
	let citation;

	before( () => {
		conf = yaml.safeLoad( fs.readFileSync( __dirname + '/../../../config.yaml' ) );
		app = {
			conf: conf.services[ 0 ].conf,
			citoid: { exporter: {} } // Dummy exporter
		};
		cr = new CitoidRequest( { params: { format: [ 'mediawiki' ], search: [ 'placeholder' ] }, headers: {}, logger: console }, app );
	} );

	it( 'Returns successful Promise if already unshortened', () => {
		url = 'http://www.example.com';
		citation = { resolvedUrl: url };
		result = unshorten( url, cr, citation );
		assert.ok( result.then ); // Check if has then method to detect Promise
	} );

} );
