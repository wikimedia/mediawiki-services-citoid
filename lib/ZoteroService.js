'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to a Zotero server
 */

/* Import Modules */
const BBPromise = require( 'bluebird' );
const util = require( 'util' );

const CitoidError = require( './CitoidError.js' );
const validateZotero = require( './Exporter.js' ).validateZotero;

class ZoteroService {

	/**
	 * Constructor for CitoidService object
	 *
	 * @param {Object} app   Express app; contains logger, metrics, and configuration
	 */
	constructor( app ) {

		this.stats = app.metrics;

		this.exporter = null;

		const baseURL = util.format( 'http://%s:%s/',
			app.conf.zoteroInterface, app.conf.zoteroPort.toString() );
		this.exportURL = `${ baseURL }export`;
		this.searchURL = `${ baseURL }search`;
		this.webURL = `${ baseURL }web`;
	}

	/**
	 * Request to Zotero server endpoint /export
	 *
	 * @param   {Object}   citation     Zotero JSON citation to be converted
	 * @param   {Object}   format       requested format
	 * @return {Object}                 BBPromise for a response
	 */
	zoteroExportRequest( citation, format ) {
		const url = new URL( this.exportURL );
		url.searchParams.set( 'format', format );

		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		return fetch( url.toString(), {
			method: 'POST',
			body: JSON.stringify( citation ),
			headers: {
				'content-type': 'application/json'
			}
		} ).then( ( res ) => res.text().then( ( body ) => {
			if ( !res.ok ) {
				const error = new Error( `HTTP ${ res.status }: ${ res.statusText }` );
				error.status = res.status;
				error.body = body;
				throw error;
			}
			return {
				status: res.status,
				body: body
			};
		} ) );
	}

	/**
	 * Promise for requests to Zotero server endpoint /search
	 *
	 * @param  {string}   id       identifier i.e. doi, isbn
	 * @param  {Object}   cr       CitoidRequest object
	 * @param  {Object}   citation Citation object
	 * @return {Object}            BBPromise for response
	 */
	zoteroSearchRequest( id, cr, citation ) {

		if ( !id ) {
			return BBPromise.reject( 'No id provided' );
		}

		const options = {
			uri: this.searchURL,
			method: 'post',
			headers: {
				'content-type': 'text/plain'
			},
			body: id
		};

		return cr.request.issueRequest( options ).then( ( response ) => {
			cr.logger.log( 'debug/zotero', `Zotero search request made for: ${ id }` );
			this.stats.zotero.req.increment( 1, [ `${ Math.floor( ( response && response.status / 100 ) || 1 ) }xx` ] );
			if ( response && response.status === 200 ) {

				// Zotero ideally should return 501 if there are no citations in the page,
				// but occasionally returns empty arrays if it successfully locates a
				// translator but the translator returns no metadata.
				if ( response.body && Array.isArray( response.body ) && response.body[ 0 ] ) {

					// Case where response is an Array inside of an Array;
					if ( Array.isArray( response.body[ 0 ] ) ) {
						if ( response.body[ 0 ][ 0 ] ) {
							// Rewrites response.body to be an Array of objects
							response.body = response.body[ 0 ];
						} else { // Case where body is [[]]
							return BBPromise.reject( 'No citation in body' );
						}
					}

					// Case where body is an empty object, i.e. [{}] or [[{}]]
					if ( !Object.keys( response.body[ 0 ] ).length ) {
						return BBPromise.reject( 'No citation in body' );
					}

					citation.content = response.body[ 0 ];

					// Validate citation
					citation.content = validateZotero( null, citation.content );
					citation.source.push( 'Zotero' );

					return cr;
				} else {
					return BBPromise.reject( 'No citation in body' );
				}
			} else { // I.e. 300 response codes
				return BBPromise.reject( 'Non 200 response from Zotero' );
			}
		}, ( response ) => {
			cr.logger.log( 'debug/zotero', `Zotero request made for: ${ id }` );
			this.stats.zotero.req.increment( 1, [ `${ Math.floor( ( response && response.status / 100 ) || 1 ) }xx` ] );
			return BBPromise.reject( response );
		} );
	}

	/**
	 * Promise for requests to Zotero server endpoint /web
	 *
	 * @param  {Object}   cr       CitoidRequest object
	 * @param  {Object}   citation Citation object
	 * @return {Object}            BBPromise for response
	 */
	zoteroWebRequest( cr, citation ) {

		const requestedURL = citation.resolvedUrl || citation.url; // Prefer resolved

		if ( !requestedURL ) {
			return BBPromise.reject( 'No url in Citation object' );
		}

		const options = {
			uri: this.webURL,
			method: 'post',
			headers: {
				'content-type': 'text/plain'
			},
			body: requestedURL
		};

		return cr.request.issueRequest( options ).then( ( response ) => {
			cr.logger.log( 'debug/zotero', `Zotero web request made for: ${ requestedURL }` );
			this.stats.zotero.req.increment( 1, [ `${ Math.floor( ( response && response.status / 100 ) || 1 ) }xx` ] );

			if ( response && response.status === 200 ) {

				// Zotero ideally should return 501 if there are no citations in the page,
				// but occasionally returns empty arrays if it successfully locates a
				// translator but the translator returns no metadata.
				if ( response.body && Array.isArray( response.body ) && response.body[ 0 ] ) {

					// Case where response is an Array inside of an Array;
					if ( Array.isArray( response.body[ 0 ] ) ) {
						if ( response.body[ 0 ][ 0 ] ) {
							// Rewrites response.body to be an Array of objects
							response.body = response.body[ 0 ];
						} else { // Case where body is [[]]
							return BBPromise.reject( 'No citation in body' );
						}
					}

					// Case where body is an empty object, i.e. [{}] or [[{}]]
					if ( !Object.keys( response.body[ 0 ] ).length ) {
						return BBPromise.reject( 'No citation in body' );
					}

					citation.content = response.body[ 0 ];

					// Validate citation
					citation.content = validateZotero( requestedURL, citation.content );
					citation.source.push( 'Zotero' );

					return cr;
				} else {
					return BBPromise.reject( 'No citation in body' );
				}
			} else { // I.e. 300 response codes
				return BBPromise.reject( 'Non 200 response from Zotero' );
			}
		}, ( response ) => {
			cr.logger.log( 'debug/zotero', `Zotero web request failed for ${ requestedURL }` );
			if ( response.status === 400 && response.body && response.body.detail === 'The remote document is not in a supported format' ) {
				cr.error = new CitoidError( null, response.body.detail, 415 );
			}
			this.stats.zotero.req.increment( 1, [ `${ Math.floor( ( response && response.status / 100 ) || 1 ) }xx` ] );
			return BBPromise.reject( response );
		} );
	}

}

/* Exports */
module.exports = ZoteroService;
