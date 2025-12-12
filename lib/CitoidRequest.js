'use strict';

/**
 * An object corresponding to each request to the citoid service
 */

const BBPromise = require( 'bluebird' );
const request = require( 'request' );

const CitoidResponse = require( './CitoidResponse.js' );

class CitoidRequest {

	/**
	 * Constructor for CitoidRequest object
	 *
	 * @param {Object} req          raw request object from express
	 * @param {Object} app
	 */
	constructor( req, app ) {

		this.conf = app.conf;
		this.stats = app.metrics;

		this.request = req;
		this.logger = this.request.logger;
		this.format = this.request.params.format[ 0 ];
		this.search = this.request.params.search[ 0 ].trim();

		this.response = new CitoidResponse(); // Prepare an empty response
		// Array of Promises for cr with Citation objects added in
		// response.citations from different kinds of queries (i.e. from PMC or PMID)
		this.getResults = [];

		// Possible extra ids - not guaranteed to be set
		this.url = null;
		this.doi = null;
		this.oclc = null;

		// Cookie jar
		this.jar = request.jar();

		this.exporter = app.citoid.exporter;

		this.build();

	}

	/**
	 * Modify variables from request object
	 */
	build() {

		this.acceptLanguage = this.request.headers[ 'accept-language' ];
		this.format = encodeURIComponent( this.format );

		const aua = this.request.headers[ 'api-user-agent' ];
		if ( aua && /^MediaWiki-JS/i.test( aua ) ) {
			this.apiUserAgent = 'mediawikijs';
		} else {
			this.apiUserAgent = 'other';
		}

	}

	fillBody() {
		let success = false; // Bool if no citations successfully complete
		const exportPromises = []; // Promises for exported citations

		// Prevent body from accidentally being overwritten
		if ( this.response.body ) {
			return BBPromise.reject( 'Body already filled' );
		}

		if ( !this.exporter ) {
			return BBPromise.reject( 'No exporter registered with citoid service.' );
		}

		// Errors that occur before citations are created, i.e. issues with requests
		if ( !this.response.citations ||
			!Array.isArray( this.response.citations ) ||
			this.response.citations.length < 1
		) {
			if ( !this.response.error && this.req.outgoingRequestError ) {
				this.response.error = this.req.outgoingRequestError;
			}

			this.response.fillError();
			return BBPromise.resolve( this );
		}

		// Create export Promises for each Citation in citations Array
		const addCitation = ( citation ) => {
			// Add Citations' exported content to response body
			if ( !citation.error ) {
				// Assumes citation.format is set- must be set in CitoidService requestTo methods
				if ( citation.format === 'bibtex' ) {
					this.response.body = ( this.response.body ? this.response.body : '' ) +
                        citation.formattedContent;
				} else {
					// Create Array if not already an Array
					this.response.body = this.response.body ? this.response.body : [];
					this.response.body.push( citation.formattedContent );
				}
				success = true;
			}
			return this;
		};

		for ( let i = 0; i < this.response.citations.length; i++ ) {
			if ( !this.response.citations[ i ].error ) {
				exportPromises.push(
					this.exporter.export(
						this.response.citations[ i ], this.request
					).then( addCitation )
				);
			}
		}

		// Wait for all export Promises to complete, then either fill with error or return
		// cr containing successful citations
		return BBPromise.all( exportPromises.map( ( x ) => x.reflect() ) ).then( () => {
			if ( success ) {
				this.response.responseCode = 200;
			} else {
				this.response.fillError();
			}

			// Metrics for success ratio SLO
			this.stats.apiuseragent.increment( 1, [
				this.apiUserAgent,
				this.response.responseCode
			] );

			if ( this.response.responseCode === 500 ) {
				this.logger.log( 'warn/citoidRequest', { msg: '500 internal server error: ', cr: this } );
			} else {
				this.logger.log( 'debug/citoidRequest', { msg: 'Full response complete, sending: ', cr: this } );
			}
			return BBPromise.resolve( this );
		} );
	}

	getResponse() {
		throw new Error( 'Method getResponse should be overridden' );
	}

}

module.exports = CitoidRequest;
