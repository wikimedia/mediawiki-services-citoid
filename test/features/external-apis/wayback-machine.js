'use strict';

const assert = require( '../../utils/assert.js' );
const fs = require( 'fs' );
const logStream = require( '../../utils/logStream' );
const preq = require( 'preq' );
const WaybackMachine = require( '../../../lib/external-apis/WaybackMachine.js' );
const yaml = require( 'js-yaml' );
const Logger = require( '../../../node_modules/service-runner/lib/logger.js' );

describe( 'availability API :', function () {

	this.timeout( 10000 );

	let app;
	let url;
	let promise;
	let expected;
	let onreject;
	let request;
	let wayback;
	let logConf;

	before( () => {

		app = {
			conf: yaml.safeLoad( fs.readFileSync( __dirname + '/../../../config.yaml' ) )
		};

		// Dummy logger
		logConf = {
			name: 'test-log',
			level: 'trace',
			stream: logStream()
		};

		wayback = new WaybackMachine( app );

		request = {
			logger: new Logger( logConf ),
			issueRequest: preq // use preq as standin for issueRequest, as they're the same except some headers will be missing, i.e. user-agent
		};

	} );

	it( 'Gets archived url', function () {
		url = 'http://www.vangoghmuseum.nl/vgm/index.jsp?page=2122&lang=en';
		return wayback.availability( url, request ).then( function ( results ) {
			console.log( results.url );
			assert.deepEqual( !!results.url, true );
		} );
	} );

	it( 'Doesn\'t get unarchived url', function () {
		url = 'http://www.example.com/noarchive';
		promise = wayback.availability( url, request );
		onreject = function ( e ) {
			return;
		};
		return assert.fails( promise, onreject );
	} );

	it( 'Gets archived url that needs to be encoded', function () {
		url = 'http://www.vangoghmuseum.nl/vgm/index.jsp?page=2122&lang=en';
		expected = 'http://web.archive.org/web/20140323172316/http://www.vangoghmuseum.nl/vgm/index.jsp?page=2122&lang=en';
		return wayback.availability( url, request ).then( function ( results ) {
			console.log( results.url );
			assert.deepEqual( results.url, expected );
		} );
	} );
} );
