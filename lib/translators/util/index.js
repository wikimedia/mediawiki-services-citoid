'use strict';

/* Utility functions used across translators */

const fixPages = require( '../../../lib/Exporter.js' ).fixPages;

/**
 * Utility function to map the keys directly
 *
 * @param  {string}   property Zotero property name to add to citation
 * @param  {Function} validate Function to run on scraped value
 * @return {Object}            citation object
 */
exports.makeTranslator = function ( property, validate ) {
	function translateProp( citation, metadata, key ) {
		let metadataValue = metadata[ key ];
		citation = citation || {};
		// Choose the first value of array if first value is string
		if ( Array.isArray( metadataValue ) ) {
			if ( typeof metadataValue[ 0 ] === 'string' ) {
				metadataValue = metadataValue[ 0 ];
			}
		}
		// Clean strings of whitespace
		if ( typeof metadataValue === 'string' ) {
			// Replaces nonbreaking spaces with regular spaces
			metadataValue = metadataValue.replace( /\xA0/g, ' ' );
			// Remove line feed characters (except for abstractNote field)
			if ( property !== 'abstractNote' ) {
				metadataValue = metadataValue.replace( /[\r\n]/g, ' ' );
			}
			citation[ property ] = metadataValue.trim();
		}
		if ( validate ) {
			return validate( citation, property );
		} else {
			return citation;
		}
	}
	return {
		name: property,
		translate: translateProp
	};
};

/* Adds creators when they're a string or an array */
exports.addCreators = function ( citation, metadataValue, creatorFieldName ) {
	let creatorName;
	let i;

	if ( !citation ) {
		citation = {};
	}
	if ( !metadataValue ) {
		return citation;
	}
	if ( !creatorFieldName ) {
		creatorFieldName = 'author';
	}

	if ( !Array.isArray( metadataValue ) ) {
		// Case: creator is a string, not a list of strings
		if ( typeof metadataValue === 'string' ) {
			creatorName = metadataValue.trim();
			if ( creatorName ) {
				citation.creators = citation.creators || [];
				citation.creators.push(
					exports.generateCreatorObj( creatorName, creatorFieldName )
				);
			}
		}
		// If neither a string nor a list, return citation unchanged
		return citation;
	}
	// Case: creator is a list of strings
	for ( i = 0; i < metadataValue.length; i++ ) {
		creatorName = metadataValue[ i ].trim();
		if ( !creatorName ) {
			return;
		} else {
			citation.creators = citation.creators || [];
		}
		citation.creators.push( exports.generateCreatorObj( creatorName, creatorFieldName ) );
	}
	return citation;
};

/* Generates creator object to add to creators list */
exports.generateCreatorObj = function ( creatorName, creatorFieldName ) {
	const creatorObj = { creatorType: creatorFieldName };

	// Chunk authorText for portioning into first and lastnames
	creatorName = creatorName.trim().split( /\s/m );
	// Single name authors are set to last name
	if ( creatorName.length === 1 ) {
		creatorObj.firstName = '';
		creatorObj.lastName = creatorName[ 0 ];
	}
	// Two or three named authors are set with last word to last name and all others to first
	if ( creatorName.length === 2 || creatorName.length === 3 ) {
		creatorObj.firstName = creatorName.slice( 0, creatorName.length - 1 ).join( ' ' );
		creatorObj.lastName = creatorName[ creatorName.length - 1 ];
	}
	// Weirdly long, might not be just the name, better not to guess
	if ( creatorName.length > 3 ) {
		creatorObj.firstName = '';
		creatorObj.lastName = creatorName.join( ' ' );
	}

	return creatorObj;
};

/* Similar to makeTranslator but for the creators field */
exports.makeCreatorsTranslator = function ( creatorType ) {
	function translateProp( citation, metadata, key ) {
		citation = exports.addCreators( citation, metadata[ key ], creatorType );
		return citation;
	}
	return {
		name: 'creators',
		subname: creatorType,
		translate: translateProp
	};
};

/* Function to add arbitrary creator function to the exports.general obj */
exports.extendGeneral = function ( generalObj, creatorType, key ) {
	if ( !key ) {
		throw new Error( 'a key is required' );
	}
	const extendedType = {};
	Object.assign( extendedType, generalObj );
	extendedType[ key ] = exports.makeCreatorsTranslator( creatorType );
	return extendedType;
};

/* A translate property function that takes the field names as arguments (not values) */
exports.makePagesTranslator = function ( property, spage, epage, pages ) {
	function translateProp( citation, metadata, key ) {
		citation = citation || {};
		// Use pages if available
		if ( metadata[ pages ] && typeof metadata[ pages ] === 'string' ) {
			citation[ property ] = metadata[ pages ].trim();
			return fixPages( citation );
		}
		// Otherwise use start and end page values
		if ( !metadata[ spage ] || !metadata[ epage ] ||
            typeof metadata[ spage ] !== 'string' || typeof metadata[ epage ] !== 'string' ) {
			return citation;
		}
		citation[ property ] = `${ metadata[ spage ].trim() }–${ metadata[ epage ].trim() }`;
		return citation;
	}
	return {
		name: property,
		translate: translateProp
	};
};

exports.makeListTranslator = function ( property, validate, args ) {
	/**
	 * Add parameters in a list to a string
	 *
	 * @param {Object}    citation  citation object
	 * @param {Object}    metadata  object of metadata key/value pairs
	 * @param {string}    key       citation key name
	 * @return {Object}             citation
	 */
	function listToString( citation, metadata, key ) {
		const values = metadata[ key ];
		let valid;

		// Case: single string value
		if ( typeof values === 'string' ) {
			valid = validate ? validate( values, args ) : values;
			if ( valid ) {
				if ( !citation[ property ] ) { // Empty string
					citation[ property ] = valid;
				} else {
					citation[ property ] += `, ${ valid }`;
				}
			}
			return citation;
		}

		// Case: Not a string or an array or is empty array
		if ( !Array.isArray( values ) || !values.length ) {
			return citation;
		}

		// Case: Array of values
		let i;
		for ( i = 0; i < values.length; i++ ) {
			valid = validate ? validate( values[ i ], args ) : values[ i ];
			if ( valid ) {
				if ( !citation[ property ] ) { // Empty string
					citation[ property ] = valid;
				} else {
					citation[ property ] += `, ${ valid }`;
				}
			}
		}
		return citation;
	}
	return {
		name: property,
		translate: listToString
	};
};
