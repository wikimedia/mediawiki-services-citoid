'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'service information', function () {

	this.timeout( 20000 );

	let infoUri = null;

	const server = new Server();

	before( () => server.start()
		.then( () => {
			infoUri = `${ server.config.uri }_info/`;
		} ) );

	after( () => server.stop() );

	// common function used for generating requests
	// and checking their return values
	function checkRet( fieldName ) {
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		return fetch( infoUri + fieldName )
			.then( ( res ) => {
				// check the returned Content-Type header
				assert.contentType( res, 'application/json' );
				// the status as well
				assert.status( res, 200 );
				return res.json().then( ( body ) => {
					// finally, check the body has the specified field
					assert.notDeepEqual( body, undefined, 'No body returned!' );
					assert.notDeepEqual( body[ fieldName ], undefined, `No ${ fieldName } field returned!` );
				} );
			} );
	}

	it( 'should get the service name', () => checkRet( 'name' ) );

	it( 'should get the service version', () => checkRet( 'version' ) );

	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	it( 'should redirect to the service home page', () => fetch( `${ infoUri }home`, { redirect: 'manual' } )
		.then( ( res ) => {
			// check the status
			assert.status( res, 301 );
		} ) );

	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	it( 'should get the service info', () => fetch( infoUri )
		.then( ( res ) => {
			// check the status
			assert.status( res, 200 );
			// check the returned Content-Type header
			assert.contentType( res, 'application/json' );
			return res.json().then( ( body ) => {
				// inspect the body
				assert.notDeepEqual( body, undefined, 'No body returned!' );
				assert.notDeepEqual( body.name, undefined, 'No name field returned!' );
				assert.notDeepEqual( body.version, undefined, 'No version field returned!' );
				assert.notDeepEqual( body.description, undefined, 'No description field returned!' );
				assert.notDeepEqual( body.home, undefined, 'No home field returned!' );
			} );
		} ) );

	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	it( 'should fail to get the service info for invalid endpoint', () => fetch( `${ infoUri }zzz` )
		.then( ( res ) => {
			assert.deepEqual( res.status, 404 );
		} )
	);
} );
