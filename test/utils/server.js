'use strict';

const extend = require( 'extend' );
const fs = require( 'fs' );
const yaml = require( 'js-yaml' );

const P = require( 'bluebird' );
const TestRunner = require( 'service-runner/test/TestServer' );

class TestCitoidRunner extends TestRunner {
	constructor( configPath = `${ __dirname }/../../config.yaml` ) {
		super( configPath );
		this._spec = null;

		// set up the inital configuration
		this.originalConfig = {
			conf: yaml.safeLoad( fs.readFileSync( `${ __dirname }/../../config.yaml` ) )
		};
		this.originalConfig.conf.num_workers = 0;
		this.originalConfig.conf.logging = {}; // Dummy logger, suppresses logging during tests
	}

	/**
	 * Overwrites super method in order to provide config vars on start
	 *
	 * @param {Object} _options optional config variables
	 * @return {ServiceRunner}
	 */
	start( _options ) {
		const options = _options || {};
		const config = extend( true, {}, this.originalConfig ); // Deep copy original config
		const myServiceIdx = config.conf.services.length - 1;

		config.conf.services[ myServiceIdx ].conf = Object.assign( {}, config.conf.services[ myServiceIdx ].conf, options );

		if ( this._running ) {
			console.log( 'The test server is already running. Skipping start.' );
			return P.resolve( this._services );
		}

		return this._runner.start( config.conf )
			.tap( ( result ) => {
				this._running = true;
				this._services = result;
			} )
			.catch( ( e ) => {
				if ( this._startupRetriesRemaining > 0 && /EADDRINUSE/.test( e.message ) ) {
					console.log( 'Execution of the previous test might have not finished yet. Retry startup' );
					this._startupRetriesRemaining--;
					return P.delay( 1000 ).then( () => this.start() );
				}
				throw e;
			} );
	}

	/**
	 * Copied config function from service-template-node. Only available after service starts.
	 *
	 * @return {Object} config
	 */
	get config() {
		if ( !this._running ) {
			throw new Error( 'Accessing test service config before starting the service' );
		}

		// build the API endpoint URI by supposing the actual service
		// is the last one in the 'services' list in the config file
		const myServiceIdx = this._runner._impl.config.services.length - 1;
		const myService = this._runner._impl.config.services[ myServiceIdx ];
		const uri = `http://127.0.0.1:${ myService.conf.port }/`;
		const qURI = `${ uri }api`;

		if ( !this._spec ) {
			// We only want to load this once.
			// eslint-disable-next-line n/no-unsupported-features/node-builtins
			fetch( `${ uri }?spec` )
				.then( ( res ) => {
					if ( !res.ok ) {
						throw new Error( 'Failed to get spec' );
					}
					return res.json();
				} )
				.then( ( body ) => {
					// save a copy
					this._spec = body;
				} )
				.catch( ( err ) => {
					// this error will be detected later, so ignore it
					this._spec = { paths: {}, 'x-default-params': {} };
				} )
				.then( () => ( {
					uri,
					qURI,
					service: myService,
					conf: this._runner._impl.config,
					spec: this._spec
				} ) );
		}

		return {
			uri,
			qURI,
			service: myService,
			conf: this._runner._impl.config,
			spec: this._spec
		};
	}

	/**
	 * Wrapper to query the test server api using the restful pattern
	 *
	 * @param  {string} search     search input
	 * @param  {string} format     requested format
	 * @param  {string} language   language code
	 * @return {Promise}
	 */
	query( search, format, language ) {

		if ( !format ) {
			format = 'mediawiki';
		}
		if ( !language ) {
			language = 'en';
		}

		search = encodeURIComponent( search );

		const url = `${ this.config.uri }${ format }/${ search }`;

		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		return fetch( url, {
			headers: {
				'accept-language': language
			}
		} ).then( ( res ) => {
			const contentType = res.headers.get( 'content-type' );
			const isJson = contentType && contentType.includes( 'application/json' );

			return ( isJson ? res.json() : res.text() ).then( ( body ) => {
				if ( !res.ok ) {
					const error = new Error( `HTTP ${ res.status }: ${ res.statusText }` );
					error.status = res.status;
					// Try to parse JSON for error responses if it's a string that looks like JSON
					if ( typeof body === 'string' && body.startsWith( '{' ) ) {
						try {
							error.body = JSON.parse( body );
						} catch ( e ) {
							error.body = body;
						}
					} else {
						error.body = body;
					}
					throw error;
				}
				return {
					status: res.status,
					body: isJson ? body : Buffer.from( body )
				};
			} );
		} );

	}

}

module.exports = TestCitoidRunner;
