'use strict';

const assert = require( '../../utils/assert.js' );
const fs = require( 'fs' );
const logStream = require( '../../utils/logStream' );
const WaybackMachine = require( '../../../lib/external-apis/WaybackMachine.js' );
const yaml = require( 'js-yaml' );
const Logger = require( '../../../node_modules/service-runner/lib/logger.js' );
const { issueRequest } = require( '../../../lib/util.js' );

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
			issueRequest: issueRequest
		};

	} );

	it( 'Gets archived url', () => {
		url = 'http://emlab.berkeley.edu/~dahn/C103/index.html';
		expected = 'http://web.archive.org/web/20050413135927/http://emlab.berkeley.edu:80/~dahn/C103/index.html';
		return wayback.availability( url, request ).then( ( results ) => {
			assert.deepEqual( results.url, expected );
		} );
	} );

	it( 'Doesn\'t get unarchived url', () => {
		url = 'http://www.example.com/noarchive';
		promise = wayback.availability( url, request );
		onreject = function ( e ) {
			return;
		};
		return assert.fails( promise, onreject );
	} );

	it( 'Gets archived url that needs to be encoded', () => {
		url = 'http://www.vangoghmuseum.nl/vgm/index.jsp?page=2122&lang=en';
		expected = 'http://web.archive.org/web/20140323172316/http://www.vangoghmuseum.nl/vgm/index.jsp?page=2122&lang=en';
		return wayback.availability( url, request ).then( ( results ) => {
			assert.deepEqual( results.url, expected );
		} );
	} );
} );
