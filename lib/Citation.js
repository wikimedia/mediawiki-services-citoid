'use strict';

/**
 * An object representing a single citation
 */

class Citation {

	/**
	 * Constructor for Citation object
	 *
	 * @param {string} [idType] Type of citation ID
	 * @param {string} [idValue] Citation ID value
	 */
	constructor( idType, idValue ) {
		// Valid id types from which to create private variables, setters, and getter
		const validIdTypes = [ 'doi', 'isbn', 'oclc', 'pmcid', 'pmid', 'qid', 'any', 'url' ];

		// Initialize all possible ID types to null and create getters/setters dynamically
		validIdTypes.forEach( ( type ) => {
			// Initialize private property
			Object.defineProperty( this, `_${ type }`, {
				value: null,
				writable: true,
				enumerable: false,
				configurable: true
			} );

			// Create getters and setters for each id type
			Object.defineProperty( this, type, {
				get() {
					return this[ `_${ type }` ];
				},
				// Converts falsey values to null and all others to string
				set( value ) {
					if ( typeof value === 'boolean' ) { // This should never happen, but just in case
						value = value ? '' : null;
					}
					if ( value === undefined ) {
						value = null;
					}
					this[ `_${ type }` ] = ( value === null ) ? value : String( value );
				},
				enumerable: true,
				configurable: true
			} );
		} );

		// Initialize base properties
		this.idType = null;
		this.idValue = null;

		// Throw errors if idType is invalid, but fail gracefully for idValue
		if ( idType && idValue ) {
			if ( typeof idType !== 'string' ) {
				throw new Error( 'idType must be a string' );
			}
			if ( !validIdTypes.includes( idType ) ) {
				throw new Error( `Invalid idType: ${ idType }. Must be one of: ${ validIdTypes.join( ', ' ) }` );
			}

			this.idType = idType;

			if ( typeof idValue === 'boolean' ) {
				this.idValue = ''; // Mimic set() behaviour above; guaranteed to be true if this block is reached
			}

			this.idValue = String( idValue ); // Mimic set() behaviour above
			this[ idType ] = idValue; // Uses set() func for the given property initialised above
		}

		// For resolved urls different from original url, i.e. redirects followed
		this.resolvedUrl = null;
		// HTTP response object for head query to resolved url
		this.response = null;

		// Wayback machine parameters
		this.archiveUrl = null;
		this.archiveDate = null;

		// Whether or not PubMed data has been requested yet.
		// Either false or a Promise
		this.hasRequestedPubMed = false;

		this.content = {}; // Initialise empty object for fields
		this.format = null; // Target format
		this.formattedContent = {}; // Content translated into targeted format
		this.source = []; // Array of sources for the content

		this.error = null; // CitoidError; also contains responseCode
	}

	setWaybackParams( waybackResults ) {
		if ( waybackResults.status === '200' ) {
			this.archiveUrl = waybackResults.url;
			this.archiveDate = waybackResults.timestamp;
		}
	}
}

module.exports = Citation;
