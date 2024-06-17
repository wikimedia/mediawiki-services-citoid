'use strict';

/**
 * Request and translate HTML
 */

/* Dependencies */
const BBPromise = require( 'bluebird' );
const cheerio = require( 'cheerio' );
const contentType = require( 'content-type' );
const iconv = require( 'iconv-lite' );
const parseAll = require( 'html-metadata' ).parseAll;

/* Local Dependencies */
const CitoidError = require( './CitoidError.js' );
const CrossRefService = require( './external-apis/CrossRefService.js' );
const unshorten = require( './unshorten.js' );

/* Translators */
const cRef = require( './translators/crossRef.js' );
const bp = require( './translators/bePress.js' );
const dc = require( './translators/dublinCore.js' );
const gen = require( './translators/general.js' );
const og = require( './translators/openGraph.js' );

/* Globals */
let defaultTranslator;

/**
 * Get content type from response header with metatags as fall back
 * in a response object with Buffer body
 *
 * @param  {Object} response response object with Buffer body
 * @return {?string}         Content-type string or null
 */
function contentTypeFromResponse( response ) {

	// Try to get content-type from header
	try {
		const obj = contentType.parse( response );// Parsed content-type header
		if ( obj.parameters && obj.parameters.charset ) {
			return obj.parameters.charset;
		}
	} catch ( e ) {} // Throws a TypeError if the Content-Type header is missing or invalid.
	return null;
}

/**
 * Get content type from the metadata tags in a response
 * object with cheerio loaded body with default encoding
 *
 * @param  {Object} chtml    Cheerio object
 * @return {string}          Content-type string or null
 */
function contentTypeFromBody( chtml ) {
	// TODO: Stream and read buffer with regex
	// i.e. <meta charset="iso-8859-1" />
	const charset = chtml( 'meta[charset]' ).first().attr( 'charset' );
	if ( charset ) {
		return charset;
	}

	// Case insensitive since content-type may appear as Content-Type or Content-type
	let contentTypeHeader = chtml( 'meta[http-equiv]' ).filter( function () {
		return ( /content-type/i ).test( chtml( this ).attr( 'http-equiv' ) );
	} );
	if ( contentTypeHeader ) {
		// <meta http-equiv="Content-type" content="text/html; charset=iso-8859-1">
		contentTypeHeader = contentTypeHeader.first().attr( 'content' );
	} else {
		return null;
	}

	if ( contentTypeHeader ) {
		try {
			const obj = contentType.parse( contentTypeHeader );// Parsed content-type header
			if ( obj.parameters && obj.parameters.charset ) {
				return obj.parameters.charset;
			}
		} catch ( e ) { // Throws a TypeError if the Content-Type header is missing or invalid.
			return null;
		}
	}

	return null;
}

/**
 * Create initial citation from empty citationObj
 *
 * @param  {Object}  citationObj CitoidRequest object
 * @param  {Object}  cr           CitoidRequest object
 * @return {Object}         Pointer to citation in cr
 */
function citationFromCR( citationObj, cr ) {
	// Wipe any previous citation in case a partial citation elsewhere has been created
	const content = citationObj.content;

	content.url = citationObj.url; // This field is universally present in all Zotero types

	// This itemType will be overwritten if a crossRef request is successful later on
	// todo:remove cr.
	if ( cr.doi || cr.idType === 'pmid' || cr.idType === 'pmcid' ||
            content.doi || content.idType === 'pmid' || content.idType === 'pmcid' ) {
		content.itemType = 'journalArticle';
	}

	return BBPromise.resolve( content );

}

// Highwire and bepress metadata itemType determination-
// Partially copied from Zotero translators http://github.com/zotero/translators
function itemTypeFromPress( metadataBlock ) {
	let i;
	let itemType = 'journalArticle';
	const keys = Object.keys( metadataBlock );
	for ( i = 0; i < keys.length; i++ ) {
		switch ( keys[ i ] ) {
			case 'journal_title':
				itemType = 'journalArticle';
				return itemType;
			case 'technical_report_institution':
				itemType = 'report';
				return itemType;
			case 'conference_title':
			case 'conference':
				itemType = 'conferencePaper';
				return itemType;
			case 'book_title':
				itemType = 'bookSection';
				return itemType;
			case 'dissertation_institution':
				itemType = 'thesis';
				return itemType;
			case 'title': // fall back to journalArticle, since this is quite common
			case 'series_title': // possibly journal article, though it could be book
				itemType = 'journalArticle';
				return itemType;
			case 'citation_isbn':
				// Unlikely, but other item types may have ISBNs as well (e.g. Reports?)
				itemType = 'book';
				return itemType;
		}
	}
	return itemType;
}

/**
 * Generate type for citation from metaData - currently uses OpenGraph only
 *
 * @param  {Object} metadata objectGraph metadata obtained from html-metadata
 * @param  {Object} citation citation object
 * @return {Object}          citation object
 */
function addItemType( metadata, citation ) {
	citation = citation || {};
	metadata = metadata || {};
	// Set citation type from metadata
	if ( !citation.itemType ) { // Don't overwrite itemtype
		if ( metadata.bePress ) {
			citation.itemType = itemTypeFromPress( metadata.bePress );
		} else if ( metadata.highwirePress ) {
			citation.itemType = itemTypeFromPress( metadata.highwirePress );
		} else if ( metadata.openGraph && metadata.openGraph.type &&
                og.types[ metadata.openGraph.type ] ) {
			// if there is a type in the results and that type is defined in openGraph.js
			citation.itemType = og.types[ metadata.openGraph.type ];
		} else if ( metadata.dublinCore && metadata.dublinCore.type &&
                dc.types[ metadata.dublinCore.type ] ) {
			// if there is a type in the results and that type is defined in dublinCore.js
			citation.itemType = dc.types[ metadata.dublinCore.type ];
		} else {
			citation.itemType = 'webpage'; // default itemType
		}
	}
	return citation;
}

/**
 * Gets title in other ways if not metadata is available
 *
 * @param  {string} url   url
 * @param  {Object} chtml Cheerio object with html loaded
 * @return {string}       best title available for citation
 */

function getTitle( url, chtml ) {

	// Try to get title from itemprop="heading" // Schema.org microdata
	const title = chtml( '*[itemprop~="headline"]' ).first().text();
	if ( title ) {
		return title;
	}

	// Default
	return url;
}

/**
 * Fallback methods for if metadata from html-metadata library can't be obtained
 *
 * @param  {Object} content  citation content
 * @param  {string} url      user requested url
 * @param  {Object} chtml    cheerio html object
 * @return {Object}          citaiton object
 */
function fallback( content, url, chtml ) {
	let parsedUrl;

	// Required fields: title, itemType

	// itemType
	if ( !content.itemType ) {
		content.itemType = 'webpage';
	}

	// Title
	if ( !content.title ) {
		content.title = getTitle( url, chtml );
	}

	// URL
	if ( !content.url ) {
		content.url = url;
	}

	// Access date - universal - format YYYY-MM-DD
	content.accessDate = ( new Date() ).toISOString().split( 'T' ).shift();

	// Fall back websiteTitle - webpage only
	if ( content.itemType === 'webpage' && !content.websiteTitle ) {
		parsedUrl = new URL( url );
		if ( content.title && parsedUrl && parsedUrl.hostname ) {
			content.websiteTitle = parsedUrl.hostname;
		}
	}

	return content;
}

/**
 * Returns citation object with html metadata for identifiers
 * added to citation object - used by parseHTML fcn inside class Scraper
 *
 * @param  {Object} citationObj the citation object
 * @param  {Object} metadata    metadata from html-metadata's parseAll function
 * @param  {Object} logger      logger instance
 * @return {Object}             the citation object with IDs added
 */
function matchIDs( citationObj, metadata, logger ) {
	logger.log( 'trace/scraper', 'Adding identifiers from metadata' );

	// Try to get DOI from metadata before doing crossRef request
	if ( !citationObj.doi ) {
		// eslint-disable-next-line security/detect-unsafe-regex
		const reDOI = /\b10\.[0-9]{3,5}\/(?:[^\\s]+)*/;
		// TODO: add eprints.id_number
		try {
			if ( metadata.dublinCore && metadata.dublinCore.identifier ) {
				if ( typeof metadata.dublinCore.identifier === 'string' &&
                    metadata.dublinCore.identifier.match( reDOI ) ) {
					citationObj.doi = metadata.dublinCore.identifier.match( reDOI )[ 0 ];
				} else if ( Array.isArray( metadata.dublinCore.identifier ) ) {
					for ( let i = 0; i < metadata.dublinCore.identifier.length; i++ ) {
						if ( !citationObj.doi &&
                            typeof metadata.dublinCore.identifier[ i ] === 'string' &&
                            metadata.dublinCore.identifier[ i ].match( reDOI ) ) {
							citationObj.doi = metadata.dublinCore.identifier[ i ]
								.match( reDOI )[ 0 ];
						}
					}
				}
			} else if ( !citationObj.doi && metadata.highwirePress && metadata.highwirePress.doi ) {
				if ( typeof metadata.highwirePress.doi === 'string' &&
                    metadata.highwirePress.doi.match( reDOI ) ) {
					citationObj.doi = metadata.highwirePress.doi.match( reDOI )[ 0 ];
				} else if ( Array.isArray( metadata.highwirePress.doi ) ) {
					for ( let i = 0; i < metadata.highwirePress.doi.length; i++ ) {
						if ( !citationObj.doi && typeof metadata.highwirePress.doi[ i ] === 'string' &&
                            metadata.highwirePress.doi[ i ].match( reDOI ) ) {
							citationObj.doi = metadata.highwirePress.doi[ i ].match( reDOI )[ 0 ];
						}
					}
				}
			} else if ( !citationObj.doi && metadata.bePress && metadata.bePress.doi ) {
				if ( typeof metadata.bePress.doi === 'string' &&
                    metadata.bePress.doi.match( reDOI ) ) {
					citationObj.doi = metadata.bePress.doi.match( reDOI )[ 0 ];
				} else if ( Array.isArray( metadata.bePress.doi ) ) {
					for ( let i = 0; i < metadata.bePress.doi.length; i++ ) {
						if ( !citationObj.doi && typeof metadata.bePress.doi[ i ] === 'string' &&
                            metadata.bePress.doi[ i ].match( reDOI ) ) {
							citationObj.doi = metadata.bePress.doi[ i ].match( reDOI )[ 0 ];
						}
					}
				}
			}
		} catch ( e ) {
			logger.log( 'debug/scraper', { msg: 'id match failure', reason: `${ e }` } );
		}
	}
	return citationObj;
}

class Scraper {

	constructor( app, translator, exporter ) {

		this.exporter = exporter;
		this.translator = translator;

		this.userAgent = app.conf.userAgent;
		this.conf = app.conf;
		this.crossRefService = new CrossRefService( app );

		defaultTranslator = this.translator;
	}

	/**
	 * Promise that always returns a citoidRequest object,
	 * with a citation and a response code added to the citationObj
	 * citoidResponse object
	 *
	 * @param  {Object} inputCitation
	 * @param  {Object} cr
	 * @return {Object}          CitoidRequest object
	 */
	scrape( inputCitation, cr ) {
		const citationObj = inputCitation;
		let chtml;
		const logger = cr.logger;
		let url = inputCitation.url;
		const citationPromise = citationFromCR( citationObj, cr ); // Promise for citation
		return unshorten( url, cr.request, cr.jar, this.conf )
			.then( ( expandedURL ) => {
				url = expandedURL;
				logger.log( 'debug/scraper', `Using native scraper on ${ url }` );
				return cr.request.issueRequest( {
					uri: url,
					// For security reasons, we use unshorten to follow redirects:
					followRedirect: false,
					// Set cookie jar for request
					jar: cr.jar,
					// returns page in Buffer object
					encoding: null
				} ).then( ( response ) => {
					if ( !response || response.status !== 200 ) {
						if ( !response ) {
							logger.log( 'debug/scraper', `No response from resource server at ${ url }` );
						} else {
							logger.log( 'debug/scraper', `Status from resource server at ${ url
							}: ${ response.status }` );
						}
						return citationPromise.then( ( citation ) => {
							return this.build4xx( citationObj, cr );
						} );
					} else {
						let str; // String from decoded Buffer object
						const defaultCT = 'utf-8'; // Default content-type
						let contentTypeInRes = contentTypeFromResponse( response );

						// Load html into cheerio object; if necessary, determine
						// content type from html loaded with default content-type, and
						// then reload again if non-default content-type is obtained.
						if ( contentTypeInRes ) {
							// Content Type detected in response
							try {
								str = iconv.decode( response.body, contentTypeInRes );
								chtml = cheerio.load( str );
							} catch ( e ) {
								logger.log( 'debug/scraper', e );
							}
						} else {
							str = iconv.decode( response.body, defaultCT );
							try {
								chtml = cheerio.load( str );
								contentTypeInRes = contentTypeFromBody( chtml );
								// If contentType is scraped from body and is NOT the default
								// CT already loaded, re-decode and reload into cheerio.
								if ( contentTypeInRes && contentTypeInRes !== defaultCT ) {
									try {
										str = iconv.decode( response.body, contentTypeInRes );
										chtml = cheerio.load( str );
									} catch ( e ) {
										// On failure, defaults to loaded body with default CT.
										logger.log( 'debug/scraper', e );
									}
								}
							} catch ( e ) {
								logger.log( 'debug/scraper', e );
							}
						}

						// If the html has been successfully loaded into cheerio, proceed.
						if ( chtml ) {
							// Create initial citation, which returns citation
							return citationPromise.then( ( citation ) => {
								return this.parseHTML( citationObj, cr, chtml ).then(
									// Success handler for parseHTML
									() => {
										logger.log( 'info/scraper', {
											msg: `Sucessfully scraped resource at ${ url }`,
											outgoingReqResult: { status: 200, uri: url }
										} );
										citationObj.source.push( 'citoid' );
										return cr;
									},
									// Rejection handler for parseHTML
									( e ) => {
										logger.log( 'debug/scraper', {
											msg: `Failed to parse HTML of resource at ${ url }`,
											error: `${ e }`
										} );
										return this.build4xx( citationObj, cr );
									}
								);
							} );
						} else {
							logger.log( 'debug/scraper', `Failed to scrape resource at ${ url }` );
							return citationPromise.then( ( citation ) => {
								return this.build4xx( citationObj, cr );
							} );
						}
					}
				},
				// Rejection handler for issueRequest
				( response ) => {
					logger.log( 'debug/scraper', {
						msg: `Failed to scrape resource at ${ url }`,
						error: `${ response }`
					} );
					return citationPromise.then( ( citation ) => {
						return this.build4xx( citationObj, cr );
					} );
				} )
				// Error handling for issueRequest
					.catch( ( error ) => {
						logger.log( 'debug/scraper', error );
						return citationPromise.then( ( citation ) => {
							return this.build4xx( citationObj, cr );
						} );
					} );
			} )
		// Error handling for unshorten
			.catch( ( error ) => {
				logger.log( 'debug/scraper', error );
				return citationPromise.then( ( citation ) => {
					return this.build4xx( citationObj, cr );
				} );
			} );
	}

	/**
	 * Promise for citation object with html metadata added to default
	 * citation object
	 *
	 * @param  {Object} citationObj the citation object
	 * @param  {string} cr          CitoidRequest object
	 * @param  {Object} chtml       Cheerio object with html loaded
	 * @return {Object}             Bluebird promise for citation object
	 */
	parseHTML( citationObj, cr, chtml ) {
		const logger = cr.logger;
		let content = citationObj.content;

		const addMetadata = ( metadata ) => {
			logger.log( 'trace/scraper', 'Adding metadata using translators' );

			content = addItemType( metadata, content );

			// Use bePress.js translator for highwirePress metadata
			content = this.translator.translate( content, metadata.highwirePress,
				bp[ content.itemType ] );

			// Use bePress.js translator for bepress metadata
			content = this.translator.translate( content, metadata.bePress,
				bp[ content.itemType ] );

			// openGraph.js translator properties
			content = this.translator.translate( content, metadata.openGraph,
				og[ content.itemType ] );

			// dublinCore.js translator properties
			content = this.translator.translate( content, metadata.dublinCore,
				dc[ content.itemType ] );

			// general.js translator properties
			content = this.translator.translate( content, metadata.general,
				gen[ content.itemType ] );

			// Fall back on direct scraping methods
			content = fallback( content, content.url, chtml );

			// DOI is only a valid field in Zotero for journalArticle and conferencePaper types
			if ( citationObj.doi && ( content.itemType === 'journalArticle' ||
                    content.itemType === 'conferencePaper' ) ) {
				content.DOI = citationObj.doi;
			}
			return BBPromise.resolve( content );
		};

		return parseAll( chtml )
			.then( ( metadata ) => {
				// Try to get DOI from metadata before doing crossRef request
				citationObj = matchIDs( citationObj, metadata, logger );
				return this.crossRef( citationObj, cr ).then( ( citoidRequest ) => {
					return addMetadata( metadata );
				},
				// Rejection handler for crossRef
				( e ) => {
					logger.log( 'debug/scraper', { msg: 'crossRef failure', reason: `${ e }` } );
					return addMetadata( metadata );
				} );
			},
			// Rejection handler for parseAll
			( e ) => {
				logger.log( 'debug/scraper', { msg: 'ParseAll failure', reason: `${ e }` } );
				return fallback( content );
			} );

	}

	/**
	 * Adds crossref REST API properties to content
	 *
	 * @param  {Object} citationObj    Citation instance
	 * @param  {Object} cr             CitoidRequest instance
	 * @return {Object}                BBPromise for citation object
	 */
	crossRef( citationObj, cr ) {
		let citation = citationObj.content;
		const doi = citationObj.doi || cr.doi;
		if ( !doi ) {
			return BBPromise.reject( 'No DOI supplied' );
		}
		return this.crossRefService.doi( doi, cr.request ).then( ( metadata ) => {
			// Set citation type from crossRef type
			// This will *not* overwrite previously set itemType i.e. from citationFromCR
			if ( metadata.type && cRef.types[ metadata.type ] ) {
				citation.itemType = cRef.types[ metadata.type ];
			} else {
				citation.itemType = 'journalArticle'; // Default itemType
			}

			const typeTranslator = cRef[ citation.itemType ];
			// If there are no appropriate translators, return.
			if ( !typeTranslator ) {
				return citation;
			}
			// Rely on crossRef to be the better source for creator names
			delete citation.creators;
			// The translator for crossRef merges creators
			citation = defaultTranslator.translate( citation, metadata, typeTranslator );
			citationObj.source.push( 'Crossref' );
			return BBPromise.resolve( cr );
			// Rejection handler
		}, () => {
			cr.logger.log( 'debug/scraper', 'Failed to get crossRef data' );
			return BBPromise.reject( cr );
		} );
	}

	/**
	 * Create 4xx citation- defaults to creates 200 if crossRef succeeds
	 *
	 * @param  {Object} citationObj    Citation object
	 * @param  {Object} cr             CitoidRequest object
	 * @return {Object}                BBPromise for CitoidRequest object
	 */
	build4xx( citationObj, cr ) {
		// Try to use DOI before returning 404
		return this.crossRef( citationObj, cr ).then( ( citoidRequest ) => {
			cr.logger.log( 'debug/scraper',
				`Successfully got metadata from doi ${ citationObj.doi }` );
			return BBPromise.resolve( citoidRequest );
			// Rejection
		}, ( e ) => {
			cr.logger.log( 'debug/scraper', {
				msg: `Unable to get any metadata from doi ${ citationObj.doi };
					returning 404 response.`,
				reason: `${ e }`
			} );

			// Use original url errors to fill error, if possible
			if ( !citationObj.error ) {
				if ( cr.request.outgoingRequestError ) {
					citationObj.error = new CitoidError( cr.request.outgoingRequestError );
				} else {
					citationObj.error = new CitoidError( null, `Unable to get any metadata from url ${ citationObj.url } for unknown reasons`, 404 );
				}
			}

			cr.logger.log( 'warn/scraper', {
				msg: `Unable to get any metadata from url ${ citationObj.url };
					returning 404 response.`,
				outgoingReqResult: { error: citationObj.error.error, uri: citationObj.url }
			} );

			return BBPromise.resolve( cr );
		} );
	}

}

module.exports = {
	contentTypeFromResponse,
	contentTypeFromBody,
	itemTypeFromPress,
	addItemType,
	matchIDs,
	Scraper
};
