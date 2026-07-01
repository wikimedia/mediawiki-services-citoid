'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to the CrossRef REST API
 * https://api.crossref.org/swagger-ui/index.html
 */

const url = 'https://api.crossref.org/works/';

// Backoff arbitrarily longer than crossRef 'polite' level requirement (1s)
const backoff = 1024;
// Longest server-requested retry-after we're willing to honor
const maxRetryAfter = 5000;

/**
 * Delay in ms before retrying a rate limited (429) request.
 *
 * Honors the retry-after header (seconds) if crossref sends one,
 * capped at maxRetryAfter + jitter; falls back to backoff otherwise.
 *
 * Min is 1000 ms wait, max 6023 ms depending on header.
 *
 * @param  {Object}    err  HTTPError from issueRequest
 * @return {number}         delay in ms
 */
function retryDelay( err ) {
	const retryAfter = parseInt( err.headers && err.headers[ 'retry-after' ], 10 );
	const base = ( retryAfter > 0 ) ? Math.min( retryAfter * 1000, maxRetryAfter ) : backoff;
	// jitter to avoid colliding if there are multiple pods
	return base + Math.floor( Math.random() * backoff );
}

/**
 * Make request to crossref with retry in some cases.
 *
 * Rate limited requests (429) back off before the second attempt;
 * network and server errors (5xx, including connection failures)
 * retry immediately. Does not retry other failures e.g. 404s.
 *
 * @param  {Object}    request        original request object
 * @param  {Object}    requestOptions options for issueRequest
 * @return {Promise}                  Promise for the response
 */
function attemptRequest( request, requestOptions ) {
	const attempt = () => request.issueRequest( requestOptions );
	return attempt().catch( ( err ) => {
		if ( err && err.status === 429 ) {
			return new Promise( ( resolve ) => {
				setTimeout( resolve, retryDelay( err ) );
			} ).then( attempt );
		}
		if ( err && err.status >= 500 ) {
			return attempt(); // no backoff for connection errors etc.
		}
		return Promise.reject( err );
	} );
}

class CrossRefService {

	/**
	 * Constructor for CrossRefService object
	 *
	 * @param {Object} app   Express app; contains configuration
	 */
	constructor( app ) {

		this.mailto = app.conf.mailto;

	}

	/**
	 * Request crossRef metadata from API via
	 *
	 * @param  {string}    doi     doi
	 * @param  {Object}    request original request object
	 * @return {Promise}           Promise for metadata from CrossRef
	 */
	doi( doi, request ) {
		request.logger.log( 'debug/other', 'Making request to CrossRef REST API works with doi' );

		if ( !doi || typeof doi !== 'string' ) {
			Promise.reject( 'No DOI in argument' );
		}

		const encodedDOI = encodeURIComponent( doi );
		const doiUrl = url + encodedDOI;
		let qs = null;

		// Suppling mailto as a query parameter gets us the "polite" level of service,
		// which has better reliability. See:
		// https://github.com/CrossRef/rest-api-doc#meta
		if ( this.mailto ) {
			qs = { mailto: this.mailto };
		}

		const requestOptions = {
			uri: doiUrl,
			headers: {
				'User-Agent': this.userAgent
			},
			qs,
			qsStringifyOptions: { // Prevent email from being URL encoded
				encode: false
			}
		};

		return attemptRequest( request, requestOptions ).then( ( res ) => {
			if ( res && res.status === 200 && res.body.status && res.body.status === 'ok' ) {
				return res.body.message;
			} else {
				return Promise.reject( `No results for doi ${ doi }` );
			}
		} );

	}

	/**
	 * Request crossRef metadata from API via any input
	 *
	 * @param  {string}    any     any part of a citation, i.e. title or full citation
	 * @param  {Object}    request original request object
	 * @return {Promise}           Promise for metadata from CrossRef
	 */
	search( any, request ) {
		request.logger.log( 'debug/other', 'Making request to CrossRef REST API with search query' );

		any = encodeURIComponent( any );

		const qs = {
			query: any,
			rows: 2 // Request two results
		};

		// Suppling mailto as a query parameter gets us the "polite" level of service,
		// which has better reliability. See:
		// https://github.com/CrossRef/rest-api-doc#meta
		if ( this.mailto ) {
			qs.mailto = this.mailto;
		}

		const requestOptions = {
			uri: url,
			qs,
			qsStringifyOptions: { // Prevent email from being URL encoded
				encode: false
			}
		};

		return attemptRequest( request, requestOptions ).then( ( res ) => {
			if ( res && res.status === 200 && res.body.status && res.body.status === 'ok' &&
                res.body[ 'message-type' ] === 'work-list' && res.body.message &&
                res.body.message.items && Array.isArray( res.body.message.items ) &&
                res.body.message.items.length > 0 ) {
				return res.body.message.items.slice( 0, 2 ); // Return up to two results
			} else {
				return Promise.reject( `No results for search string ${ any }` );
			}
		} );

	}

}

module.exports = CrossRefService;
