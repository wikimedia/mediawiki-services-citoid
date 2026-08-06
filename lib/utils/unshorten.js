/* eslint-disable no-use-before-define */

'use strict';

const AddressError = require( './hostIsAllowed' ).AddressError;
const hostIsAllowed = require( './hostIsAllowed' ).hostIsAllowed;

/**
 * Follows redirects in a URL. Promise succeeds even if the url does not redirect anywhere;
 * Fails if any url in the redirect chain is not allowed (via hostIsAllowed)
 *
 * @param  {string}            url
 * @param  {CitoidRequest}     cr
 * @param  {Citation}          citation citation to store the response to head requests in
 * @return {Promise<Citation>}
 */
function unshorten( url, cr, citation ) {
	const request = cr.request;
	const jar = cr.jar;
	const conf = cr.conf;
	request.logger.log( 'debug/unshorten', `Unshortening: ${ url }` );

	// Short circuit cases where unshorten is called multiple times
	if ( url === citation.resolvedUrl ) {
		request.logger.log( 'debug/unshorten', `Already unshortened to: ${ citation.resolvedUrl }` );
		return Promise.resolve( citation );
	}

	const opts = {
		followRedirect: false,
		jar,
		// Use HEAD to avoid wasting bandwidth in the response. We can't be *sure* a
		// HEAD request will be handled in the same manner as a GET request; but then
		// again, we wouldn't be sure any subsequent GET request would be handled in the
		// same manner as a current one either, so we don't lose anything by using HEAD.
		method: 'head',
		uri: url
	};

	let seenRedirects = 0;
	const maxRedirects = conf.maxRedirects || 5;

	/**
	 * @param  {Object}    response response from issueRequest
	 * @return {Citation}
	 */
	const detectRedirect = ( response ) => {
		request.logger.log( 'debug/unshorten', 'detecting redirect' );
		const redirLocation = response.headers.location || response.headers[ 'content-location' ];
		if ( redirLocation && opts.uri !== redirLocation ) {
			return followRedirect( redirLocation, opts.uri );
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
	const followRedirect = ( redirLocation, prevUrl ) => {
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

		return hostIsAllowed( redirLocation, conf, request.logger )
			.then( ( allowedUrl ) => {
				opts.uri = allowedUrl;
				return request.issueRequest( opts )
					.then( ( response ) => {
						citation.response = response;
						return detectRedirect( response );
					} );
			} ).catch( ( error ) => {
				request.logger.log( 'debug/unshorten', `Caught at recursion: ${ error }` );
				request.outgoingRequestError = error; // Logs at warn level later if request fails
				throw error;
			} );
	};

	return hostIsAllowed( url, conf, request.logger )
		.then( ( allowedUrl ) => {
			opts.uri = allowedUrl;
			return request.issueRequest( opts )
				.then( ( response ) => {
					citation.response = response;
					return detectRedirect( response );
				} )
				.catch( ( error ) => {
					request.logger.log( 'debug/unshorten', `Caught at recursion: ${ error }` );
					throw error;
				} );
		} )
		.catch( ( error ) => {
			request.logger.log( 'debug/unshorten', `Caught at top level: ${ error }` );
			request.outgoingRequestError = error; // Log at warn level later if request fails
			throw error;
		} );
}

module.exports = unshorten;
