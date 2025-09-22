'use strict';

const BBPromise = require( 'bluebird' );
const express = require( 'express' );
const { v1: uuidv1 } = require( 'uuid' );
const bunyan = require( 'bunyan' );
const preq = require( 'preq' );

/**
 * Error instance wrapping HTTP error responses
 */
class HTTPError extends Error {

	constructor( response ) {
		super();
		Error.captureStackTrace( this, HTTPError );

		if ( response.constructor !== Object ) {
			// just assume this is just the error message
			response = {
				status: 500,
				type: 'internal_error',
				title: 'InternalError',
				detail: response
			};
		}

		this.name = this.constructor.name;
		this.message = `${ response.status }`;
		if ( response.type ) {
			this.message += `: ${ response.type }`;
		}

		Object.assign( this, response );
	}
}

/**
 * Generates an object suitable for logging out of a request object
 *
 * @param {!Request} req          the request
 * @param {?RegExp}  whitelistRE  the RegExp used to filter headers
 * @return {!Object} an object containing the key components of the request
 */
function reqForLog( req, whitelistRE ) {

	const params = {};

	// Though not actually a query parameter, backwards compatibility with older logs
	if ( req.params && req.params.catchall && req.params.catchall[ 0 ] ) {
		params.format = req.params.catchall[ 0 ];
	}

	const ret = {
		url: req.originalUrl,
		headers: {},
		method: req.method,
		params: params,
		query: req.query,
		body: req.body,
		remoteAddress: req.connection.remoteAddress,
		remotePort: req.connection.remotePort
	};

	if ( req.headers && whitelistRE ) {
		Object.keys( req.headers ).forEach( ( hdr ) => {
			if ( whitelistRE.test( hdr ) ) {
				ret.headers[ hdr ] = req.headers[ hdr ];
			}
		} );
	}

	return ret;

}

/**
 * serializes an uri in a form suitable for logging.
 *
 * @param {string} uri in string form to serialize
 * @return {!Object} the serialized version of the uri
 */
function uriForLog( uri ) {
	const serializedURI = {
		uri: null,
		hostname: null
	};

	if ( !uri || typeof uri !== 'string' ) {
		return serializedURI;
	}

	serializedURI.uri = uri;

	try {
		const url = new URL( uri );
		serializedURI.hostname = url.hostname;
	} catch ( e ) {
		return serializedURI;
	}

	return serializedURI;
}

/**
 * Serializes an error object in a form suitable for logging.
 *
 * @param {!Error} err error to serialize
 * @return {!Object} the serialized version of the error
 */
function errForLog( err ) {

	const ret = bunyan.stdSerializers.err( err );

	ret.status = err.status;
	ret.type = err.type;
	ret.detail = err.detail;

	// Now supplanted by outgoingReqResult
	if ( err.body && err.body.internalMethod ) {
		ret.method = err.body.internalMethod;
	}

	// Now supplanted by outgoingReqResult
	if ( err.body && err.body.internalURI ) {
		ret.uri = uriForLog( err.body.internalURI );
	}

	// remove the stack trace only for 500 errors and if enabled
	if ( Number.parseInt( ret.status, 10 ) !== 500 ) {
		ret.stack = undefined;
	}

	return ret;

}

/**
 * Serializes an response object in a form suitable for logging
 * from outgoing requests. Since these are HTTP errors from
 * other sites, we don't need the stack trace.
 *
 * @param {!Object} res  custom obj with status, uri, or error
 * @return {!Object} the serialized version of the error
 */
function outgoingReqResult( res ) {
	const ret = {};
	if ( !res ) {
		return ret;
	}
	if ( res.status && typeof res.status === 'number' ) {
		ret.status = res.status;
	}

	// Log archived urls
	if ( res.archive && typeof res.archive === 'string' ) {
		ret.archive = res.archive;
	}

	// Don't include full error to avoid logging json from error.msg
	if ( res.error && res.error instanceof Error ) {
		const error = errForLog( res.error );
		ret.status = error.status;
		ret.error = error.name;
		if ( error.uri ) {
			ret.hostname = error.uri.hostname;
			ret.uri = error.uri.uri;
		}
	}
	if ( res.uri ) {
		const uri = uriForLog( res.uri );
		if ( uri.hostname ) {
			ret.hostname = uri.hostname;
		}
		if ( uri.uri ) {
			ret.uri = uri.uri;
		}
	}
	return ret;
}

/**
 * Serializes an CitoidResponse object in a form suitable for logging,
 * but requires the full CitoidRequest object as input
 *
 * @param {!Object} cReq CitoidRequest to serialize
 * @return {!Object} the serialized version of the error
 */
function crForLog( cReq ) {

	const ret = {};
	if ( !cReq ) {
		return ret;
	}

	// ResponseCode we send to users
	if ( cReq.response ) {
		ret.responseCode = cReq.response.responseCode;
		ret.body = cReq.response.body;

		// Gets HTTPError from CitoidError object
		if ( cReq.response.error && cReq.response.error.error ) {
			ret.error = errForLog( cReq.response.error.error, true ); // Don't log stacktrace
		}
	}

	return ret;

}

/**
 * Wraps all of the given router's handler functions with
 * promised try blocks so as to allow catching all errors,
 * regardless of whether a handler returns/uses promises
 * or not.
 *
 * @param {!Object} route the object containing the router and path to bind it to
 * @param {!Application} app the application object
 */
function wrapRouteHandlers( route, app ) {

	route.router.stack.forEach( ( routerLayer ) => {
		const path = ( route.path + routerLayer.route.path.slice( 1 ) )
			.replace( /\/:/g, '/--' )
			.replace( /^\//, '' )
			.replace( /[/?]+$/, '' );
		routerLayer.route.stack.forEach( ( layer ) => {
			const origHandler = layer.handle;
			const metric = app.metrics.makeMetric( {
				type: 'Histogram',
				name: 'router',
				prometheus: {
					name: 'citoid_router_request_duration_seconds',
					help: 'request duration handled by router in seconds',
					staticLabels: app.metrics.getServiceLabel(),
					buckets: [ 0.01, 0.05, 0.1, 0.3, 1, 30, 120 ]
				},
				labels: {
					names: [ 'path', 'method', 'status' ],
					omitLabelNames: true
				}
			} );
			layer.handle = ( req, res, next ) => {
				const startTime = Date.now();
				BBPromise.try( () => origHandler( req, res, next ) )
					.catch( next )
					.finally( () => {
						let statusCode = parseInt( res.statusCode, 10 ) || 500;
						if ( statusCode < 100 || statusCode > 599 ) {
							statusCode = 500;
						}
						metric.endTiming( startTime, [ path || 'root', req.method, statusCode ] );
					} );
			};
		} );
	} );

}

/**
 * Generates an error handler for the given applications and installs it.
 *
 * @param {!Application} app the application object to add the handler to
 */
function setErrorHandler( app ) {

	app.use( ( err, req, res, next ) => {
		let errObj;
		// ensure this is an HTTPError object
		if ( err.constructor === HTTPError ) {
			errObj = err;
		} else if ( err instanceof Error ) {
			// is this an HTTPError defined elsewhere? (preq)
			if ( err.constructor.name === 'HTTPError' ) {
				const o = { status: err.status };
				if ( err.body && err.body.constructor === Object ) {
					Object.keys( err.body ).forEach( ( key ) => {
						o[ key ] = err.body[ key ];
					} );
				} else {
					o.detail = err.body;
				}
				o.message = err.message;
				errObj = new HTTPError( o );
			} else {
				// this is a standard error, convert it
				errObj = new HTTPError( {
					status: 500,
					type: 'internal_error',
					title: err.name,
					detail: err.detail || err.message,
					stack: err.stack
				} );
			}
		} else if ( err.constructor === Object ) {
			// this is a regular object, suppose it's a response
			errObj = new HTTPError( err );
		} else {
			// just assume this is just the error message
			errObj = new HTTPError( {
				status: 500,
				type: 'internal_error',
				title: 'InternalError',
				detail: err
			} );
		}
		// ensure some important error fields are present
		errObj.status = errObj.status || 500;
		errObj.type = errObj.type || 'internal_error';
		// add the offending URI and method as well
		errObj.method = errObj.method || req.method;
		errObj.uri = errObj.uri || req.url;
		// some set 'message' or 'description' instead of 'detail'
		errObj.detail = errObj.detail || errObj.message || errObj.description || '';
		// adjust the log level based on the status code
		let level = 'error';
		if ( Number.parseInt( errObj.status, 10 ) < 400 ) {
			level = 'trace';
		} else if ( Number.parseInt( errObj.status, 10 ) < 500 ) {
			level = 'info';
		}
		// log the error
		const component = ( errObj.component ? errObj.component : errObj.status );
		( req.logger || app.logger ).log( `${ level }/${ component }`, errForLog( errObj ) );
		// let through only non-sensitive info
		const respBody = {
			status: errObj.status,
			type: errObj.type,
			title: errObj.title,
			detail: errObj.detail,
			method: errObj.method,
			uri: errObj.uri
		};
		res.status( errObj.status ).json( respBody );
	} );

}

/**
 * Creates a new router with some default options.
 *
 * @param {?Object} [opts] additional options to pass to express.Router()
 * @return {!Router} a new router object
 */
function createRouter( opts ) {

	const options = {
		mergeParams: true
	};

	if ( opts && opts.constructor === Object ) {
		Object.assign( options, opts );
	}

	return new express.Router( options );

}

/**
 * Adds logger to the request and logs it.
 *
 * @param {!*} req request object
 * @param {!Application} app application object
 */
function initAndLogRequest( req, app ) {
	req.headers = req.headers || {};
	req.headers[ 'x-request-id' ] = req.headers[ 'x-request-id' ] || uuidv1();
	req.logger = app.logger.child( {
		request_id: req.headers[ 'x-request-id' ],
		request: reqForLog( req, app.conf.log_header_whitelist )
	} );
	req.context = { reqId: req.headers[ 'x-request-id' ] };
	req.issueRequest = ( request ) => {
		if ( !( request.constructor === Object ) ) {
			request = { uri: request };
		}
		if ( request.url ) {
			request.uri = request.url;
			delete request.url;
		}
		if ( !request.uri ) {
			return BBPromise.reject( new HTTPError( {
				status: 500,
				type: 'internal_error',
				title: 'No request to issue',
				detail: 'No request has been specified'
			} ) );
		}
		request.method = request.method || 'get';
		request.headers = request.headers || {};
		Object.assign( request.headers, {
			'accept-language': req.headers[ 'accept-language' ], // modification from service-template-node - pass through accept-language header
			'user-agent': app.conf.user_agent,
			'x-request-id': req.context.reqId
		} );
		req.logger.log( 'trace/req', { msg: 'Outgoing request', out_request: request } );
		return preq( request );
	};
	req.logger.log( 'trace/req', { msg: 'Incoming request' } );
}

module.exports = {
	HTTPError,
	crForLog,
	errForLog,
	outgoingReqResult,
	uriForLog,
	initAndLogRequest,
	wrapRouteHandlers,
	setErrorHandler,
	router: createRouter
};
