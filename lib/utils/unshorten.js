/* eslint-disable no-use-before-define */

'use strict';

const AddressError = require( './hostIsAllowed' ).AddressError;
const hostIsAllowed = require( './hostIsAllowed' ).hostIsAllowed;

/**
 * Follows redirects in a URL. Promise succeeds even if the url does not redirect anywhere;
 * Fails if any url in the redirect chain is not allowed (via hostIsAllowed)
 *
 * @async
 * @param {string} url
 * @param {CitoidRequest} cr
 * @param {Citation} citation Citation to store the response to requests in
 * @param {number} [timeout] Timeout in ms for each request in the redirect chain
 * @return {Promise<Citation>} Updated citation object with unshortend URL
 */
async function unshorten( url, cr, citation, timeout ) {
	const request = cr.request;
	const jar = cr.jar;
	const conf = cr.conf;
	request.logger.log( 'debug/unshorten', `Unshortening: ${ url }` );

	// Short circuit cases where unshorten is called multiple times
	if ( url === citation.resolvedUrl ) {
		request.logger.log( 'debug/unshorten', `Already unshortened to: ${ citation.resolvedUrl }` );
		return citation;
	}

	const opts = {
		followRedirect: false,
		jar,
		// Some sites reject HEAD or redirect it to an error page, so use GET.
		// Only the status and headers are used, so do not read the body.
		method: 'get',
		skipBody: true,
		uri: url,
		timeout
	};

	let seenRedirects = 0;
	const maxRedirects = conf.maxRedirects || 5;

	/**
	 * @param  {Object}            response Response from issueRequest
	 * @return {Promise<Citation>}
	 */
	const detectRedirect = async ( response ) => {
		request.logger.log( 'debug/unshorten', 'detecting redirect' );
		const redirLocation = response.headers.location || response.headers[ 'content-location' ];
		if ( redirLocation && opts.uri !== redirLocation ) {
			return await followRedirect( redirLocation, opts.uri );
		}

		request.logger.log(
			'debug/unshorten',
			`No more redirects detected after ${ seenRedirects } redirects, returning: ${ opts.uri }`
		);

		citation.resolvedUrl = opts.uri;
		return citation;
	};

	/**
	 * @param  {string}            redirLocation
	 * @param  {string}            prevUrl
	 * @return {Promise<Citation>}
	 */
	const followRedirect = async ( redirLocation, prevUrl ) => {
		request.logger.log( 'debug/unshorten', `Attempting to follow redirect: ${ redirLocation }` );

		if ( seenRedirects === maxRedirects ) {
			throw new AddressError( 'Maximum number of allowed redirects reached' );
		}
		seenRedirects++;

		// If missing protocol, assume it's a relative path and try to assemble url
		if ( !/^https?:\/\//i.test( redirLocation ) ) {
			try {
				const oldURL = new URL( prevUrl );
				redirLocation = ( new URL( redirLocation, oldURL.href ) ).href;
				request.logger.log( 'debug/unshorten', `Assembled relative redirect: ${ redirLocation }` );
			} catch ( error ) {
				request.logger.log( 'debug/unshorten', `Unable to assemble relative redirect: ${ error }` );
				request.outgoingRequestError = error; // Logs at warn level later if request fails
				throw error;
			}
		}

		try {
			opts.uri = await hostIsAllowed( redirLocation, conf, request.logger );
			citation.response = await request.issueRequest( opts );
			return await detectRedirect( citation.response );
		} catch ( error ) {
			request.logger.log( 'debug/unshorten', `Caught at recursion: ${ error }` );
			request.outgoingRequestError = error; // Logs at warn level later if request fails
			throw error;
		}
	};

	try {
		opts.uri = await hostIsAllowed( url, conf, request.logger );
		citation.response = await request.issueRequest( opts );
		return await detectRedirect( citation.response );
	} catch ( error ) {
		request.logger.log( 'debug/unshorten', `Caught at top level: ${ error }` );
		request.outgoingRequestError = error; // Log at warn level later if request fails
		throw error;
	}
}

module.exports = unshorten;
