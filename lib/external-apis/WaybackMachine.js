'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to the Wayback Machine APIs
 */

/* Import Modules */
const BBPromise = require( 'bluebird' );

/**
 * Constructor for CitoidService object
 *
 * @param {Object} app   Express app; contains logger, metrics, and configuration
 */
class WaybackMachine {

	/**
	 * Constructor for CitoidService object
	 *
	 * @param {Object} app   Express app; contains logger, metrics, and configuration
	 */
	constructor( app ) {}

	/**
	 * Replaces timestamp (i.e. 20210618033109) with ISO date (i.e. 2021-06-18)
	 *
	 * @param  {Object} snapshot Metadata about archived url
	 * @return {Object}          Mutated snapshot object with fixed date
	 */

	cleanResults( snapshot ) {
		const year = snapshot.timestamp.slice( 0, 4 );
		const month = snapshot.timestamp.slice( 4, 6 );
		const day = snapshot.timestamp.slice( 6, 8 );
		snapshot.timestamp = `${ year }-${ month }-${ day }`;
		return snapshot;
	}

	/**
	 * Requests to Wayback Availability JSON API at https://archive.org/help/wayback_api.php
	 *
	 * @param  {string} url            requested url
	 * @param  {Object} request        request object for entire citoid request - has utilities
	 * @return {Object}                metadata about most recent snapshot
	 */
	availability( url, request ) {

		if ( !url ) {
			return BBPromise.reject( 'No url in request' );
		}

		if ( !request ) {
			return BBPromise.reject( 'Missing request argument' );
		}

		request.logger.log( 'debug/other', 'Making request to Wayback Machine availability API' );

		const endpoint = 'http://archive.org/wayback/available';

		const qs = { // Basic query parameters
			url: url // Encodes url
		};

		return request.issueRequest(
			{
				uri: endpoint,
				headers: {
					'User-Agent': this.userAgent
				},
				qs: qs
			} )
			.then( ( res ) => {
				if ( res && res.status === 200 && res.body.archived_snapshots && res.body.archived_snapshots.closest && res.body.archived_snapshots.closest.status === '200' ) {
					request.logger.log( 'debug/wayback', 'Archived copy of ' + url + ' available' );
					return this.cleanResults( res.body.archived_snapshots.closest );
				} else {
					request.logger.log( 'debug/wayback', 'No acceptable results from WaybackMachine availability service for url ' + url );
					return BBPromise.reject( 'No acceptable results from WaybackMachine availability service' );
				}
			} ).catch( ( e ) => {
				request.logger.log( 'debug/wayback', e );
				return BBPromise.reject( 'WaybackMachine availability service unavailable' );
			} );

	}

}

/* Exports */
module.exports = WaybackMachine;
