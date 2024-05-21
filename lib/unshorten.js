/* eslint-disable no-prototype-builtins,no-use-before-define */

'use strict';

const AddressError = require( './hostIsAllowed' ).AddressError;
const hostIsAllowed = require( './hostIsAllowed' ).hostIsAllowed;

/**
 * Follows redirects in a URL. Promise succeeds even if the url does not redirect anywhere;
 * Fails if any url in the redirect chain is not allowed (via hostIsAllowed)
 *
 * @param  {string}  url        url trying to be unshortened
 * @param  {Object}  request    request object
 * @param  {Object}  jar        the cookie jar to use for requests
 * @param  {Object}  conf       app config object
 * @return {Object}             BBPromise for url
 */
function unshorten( url, request, jar, conf ) {
	request.logger.log( 'debug/unshorten', `Unshortening: ${ url }` );
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

	const detectRedirect = ( response ) => {
		request.logger.log( 'debug/unshorten', 'detecting redirect' );
		if ( response.headers.hasOwnProperty( 'location' ) &&
                ( opts.uri !== response.headers.location ) ) {
			return followRedirect( response.headers.location, opts.uri );
		}
		if ( response.headers.hasOwnProperty( 'content-location' ) &&
                ( opts.uri !== response.headers[ 'content-location' ] ) ) {
			return followRedirect( response.headers[ 'content-location' ], opts.uri );
		}
		request.logger.log( 'debug/unshorten',
			`No more redirects detected after ${ seenRedirects } redirects, returning: ${ opts.uri }` );
		return opts.uri;
	};

	const followRedirect = ( redirLocation, prevUrl ) => {
		request.logger.log( 'debug/unshorten', `Attempting to follow redirect: ${ redirLocation }` );
		if ( seenRedirects === maxRedirects ) {
			throw new AddressError( 'Maximum number of allowed redirects reached' );
		}
		seenRedirects++;

		// Allow relative redirects
		if ( /^\/*/.exec( redirLocation )[ 0 ] ) {
			try {
				const oldURL = new URL( prevUrl );
				redirLocation = new URL( redirLocation, oldURL.origin );
				redirLocation = redirLocation.href;
				request.logger.log( 'debug/unshorten', `Assembled relative redirect: ${ redirLocation }` );
			} catch ( e ) {
				request.logger.log( 'debug/unshorten', 'Unabled to assemble relative redirect' );
			}
		}

		return hostIsAllowed( redirLocation, conf, request.logger )
			.then( ( allowedUrl ) => {
				opts.uri = allowedUrl;
				return request.issueRequest( opts ).then( detectRedirect );
			} ).catch( ( error ) => {
				request.logger.log( 'debug/unshorten', `Caught at recursion: ${ error }` );
				request.outgoingRequestError = error; // Log at warn level later if request fails
				throw error;
			} );
	};

	return hostIsAllowed( url, conf, request.logger )
		.then( ( allowedUrl ) => {
			opts.uri = allowedUrl;
			return request.issueRequest( opts )
				.then( detectRedirect )
				.catch( ( error ) => {
					request.logger.log( 'debug/unshorten', `Caught at recursion: ${ error }` );
					throw error;
				} );
		} )
		.catch( ( error ) => {
			request.logger.log( 'debug/unshorten', `Caught at top level${ error }` );
			request.outgoingRequestError = error; // Log at warn level later if request fails
			throw error;
		} );
}

module.exports = unshorten;
