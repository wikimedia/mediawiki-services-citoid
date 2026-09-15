'use strict';

const assert = require( '../../utils/assert.js' );
const PubMedService = require( '../../../lib/external-apis/PubMedService.js' );
const { HTTPError } = require( '../../../lib/utils/util.js' );

describe( 'lib/external-apis/PubMedService.js', () => {

	let logged;
	let service;

	/**
	 * Builds a request stub whose issueRequest rejects or resolves as told.
	 *
	 * @param {Function} issueRequest stub for the outgoing request
	 * @return {Object} request stub
	 */
	function stubRequest( issueRequest ) {
		return {
			issueRequest,
			logger: {
				log: ( level, msg ) => logged.push( { level, msg } )
			}
		};
	}

	beforeEach( () => {
		logged = [];
		service = new PubMedService( { conf: { mailto: 'test@example.com' } } );
	} );

	it( 'passes the error and URL to the logger when the request fails', () => {
		const error = new HTTPError( {
			status: 429,
			type: 'http_error',
			title: 'HTTP 429'
		} );
		const request = stubRequest( () => Promise.reject( error ) );

		return assert.fails( service.convert( 'PMC3605911', request ), ( message ) => {
			assert.deepEqual( message, 'PubMed request failed for ids: PMC3605911' );
			const warning = logged.find( ( entry ) => entry.level === 'warn/pubmed' );
			assert.ok( warning, 'logs a warning' );
			assert.deepEqual( warning.msg.outgoingReqResult.error, error );
			assert.ok( warning.msg.outgoingReqResult.uri, 'passes the request URL' );
		} );
	} );

	it( 'keeps the message when the API reports a bad status', () => {
		const request = stubRequest( () => Promise.resolve( {
			status: 200,
			body: { status: 'error' }
		} ) );

		return assert.fails( service.convert( 'PMC3605911', request ), ( message ) => {
			assert.deepEqual( message, 'Unexpected status from PubMed API: error' );
			const warnings = logged.filter( ( entry ) => entry.level === 'warn/pubmed' );
			assert.deepEqual( warnings.length, 1, 'logs the warning once' );
		} );
	} );

	it( 'keeps the message when the API returns no records', () => {
		const request = stubRequest( () => Promise.resolve( {
			status: 200,
			body: { status: 'ok', records: [] }
		} ) );

		return assert.fails( service.convert( 'PMC3605911', request ), ( message ) => {
			assert.deepEqual( message, 'No records from PubMed API' );
		} );
	} );

	it( 'returns the body when the API answers', () => {
		const body = { status: 'ok', records: [ { pmcid: 'PMC3605911' } ] };
		const request = stubRequest( () => Promise.resolve( { status: 200, body } ) );

		return service.convert( 'PMC3605911', request ).then( ( result ) => {
			assert.deepEqual( result, body );
			assert.deepEqual(
				logged.filter( ( entry ) => entry.level === 'warn/pubmed' ).length,
				0,
				'logs no warning'
			);
		} );
	} );

} );
