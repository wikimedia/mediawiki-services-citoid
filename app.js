'use strict';

const http = require( 'http' );
const BBPromise = require( 'bluebird' );
const express = require( 'express' );
const compression = require( 'compression' );
const bodyParser = require( 'body-parser' );
const fs = BBPromise.promisifyAll( require( 'fs' ) );
const sUtil = require( './lib/util' );
const apiUtil = require( './lib/api-util' );
const packageInfo = require( './package.json' );
const yaml = require( 'js-yaml' );
const addShutdown = require( 'http-shutdown' );
const path = require( 'path' );

/**
 * Creates an express app and initialises it
 *
 * @param {Object} options the options to initialise the app with
 * @return {bluebird} the promise resolving to the app object
 */
function initApp( options ) {

	// the main application object
	const app = express();

	// get the options and make them available in the app
	// the logging device
	app.logger = options.logger;
	// Add custom serialisers to the native bunyan logger
	app.logger._logger.addSerializers( {
		err: sUtil.errForLog,
		outgoingReqResult: sUtil.outgoingReqResult,
		uri: sUtil.uriForLog,
		cr: sUtil.crForLog
	} );

	// the metrics
	app.metrics = options.metrics;
	// this app's config options
	app.conf = options.config;
	// this app's package info
	app.info = packageInfo;

	app.conf.userAgent = app.conf.user_agent || app.conf.userAgent || `Citoid/${ app.info.version }`;

	// backwards compatibility for configurations which predate use of 'zotero' keyword in conf
	if ( app.conf.zotero === undefined ) {
		app.conf.zotero = true;
	}
	// backwards compatibility for configurations which predate use of 'pubmed' keyword in conf
	if ( app.conf.pubmed === undefined ) {
		app.conf.pubmed = true;
	}

	// ensure some reasonable defaults
	if ( !app.conf.port ) {
		app.conf.port = 1970;
	}
	if ( !app.conf.interface ) {
		app.conf.interface = '0.0.0.0';
	}
	if ( app.conf.compression_level === undefined ) {
		app.conf.compression_level = 3;
	}
	if ( app.conf.cors === undefined ) {
		app.conf.cors = '*';
	}
	if ( app.conf.csp === undefined ) {
		app.conf.csp = "default-src 'self'; object-src 'none'; media-src *; img-src *; style-src *; frame-ancestors 'self'";
	}

	// check the zotero configuration
	if ( app.conf.zotero && !( app.conf.zoteroInterface && app.conf.zoteroPort ) ) {
		throw new Error( 'Zotero IP/host or port not set' );
	}

	// set outgoing proxy
	if ( app.conf.proxy ) {
		process.env.HTTP_PROXY = app.conf.proxy;
		// if there is a list of domains which should
		// not be proxied, set it
		if ( app.conf.no_proxy_list ) {
			if ( Array.isArray( app.conf.no_proxy_list ) ) {
				process.env.NO_PROXY = app.conf.no_proxy_list.join( ',' );
			} else {
				process.env.NO_PROXY = app.conf.no_proxy_list;
			}
		}
		if ( !app.conf.zoteroUseProxy ) {
			// don't use proxy for accessing Zotero unless specified in settings
			if ( process.env.NO_PROXY ) {
				process.env.NO_PROXY += ',';
			} else {
				process.env.NO_PROXY = '';
			}
			process.env.NO_PROXY += app.conf.zoteroInterface;
		}
	}

	// set up header whitelisting for logging
	if ( !app.conf.log_header_whitelist ) {
		app.conf.log_header_whitelist = [
			'cache-control', 'content-type', 'content-length', 'if-match',
			'user-agent', 'x-request-id'
		];
	}
	// eslint-disable-next-line security/detect-non-literal-regexp
	app.conf.log_header_whitelist = new RegExp( `^(?:${ app.conf.log_header_whitelist.map( ( item ) => item.trim() ).join( '|' ) })$`, 'i' );

	// set up the request templates for the APIs
	apiUtil.setupApiTemplates( app );

	// set up the spec
	if ( !app.conf.spec ) {
		app.conf.spec = `${ __dirname }/spec.yaml`;
	}
	if ( app.conf.spec.constructor !== Object ) {
		try {
			app.conf.spec = yaml.safeLoad( fs.readFileSync( app.conf.spec ) );
		} catch ( e ) {
			app.logger.log( 'warn/spec', `Could not load the spec: ${ e }` );
			app.conf.spec = {};
		}
	}
	if ( !app.conf.spec.openapi ) {
		app.conf.spec.openapi = '3.0.0';
	}
	if ( !app.conf.spec.info ) {
		app.conf.spec.info = {
			version: app.info.version,
			title: app.info.name,
			description: app.info.description
		};
	}
	app.conf.spec.info.version = app.info.version;
	if ( !app.conf.spec.paths ) {
		app.conf.spec.paths = {};
	}

	// set the CORS and CSP headers
	app.all( '*', ( req, res, next ) => {
		if ( app.conf.cors !== false ) {
			res.header( 'access-control-allow-origin', app.conf.cors );
			res.header( 'access-control-allow-headers', 'accept, x-requested-with, content-type' );
			res.header( 'access-control-expose-headers', 'etag' );
		}
		if ( app.conf.csp !== false ) {
			res.header( 'x-xss-protection', '1; mode=block' );
			res.header( 'x-content-type-options', 'nosniff' );
			res.header( 'x-frame-options', 'SAMEORIGIN' );
			res.header( 'content-security-policy', app.conf.csp );
			res.header( 'x-content-security-policy', app.conf.csp );
			res.header( 'x-webkit-csp', app.conf.csp );
		}
		// Required by api gateway
		res.header( 'cache-control', 'private, max-age=0, s-maxage=0, must-revalidate' );
		app.set( 'etag', true );

		sUtil.initAndLogRequest( req, app );
		next();
	} );

	// set up the user agent header string to use for requests
	app.conf.user_agent = app.conf.user_agent || app.info.name;

	// disable the X-Powered-By header
	app.set( 'x-powered-by', false );
	// disable the ETag header - users should provide them!
	app.set( 'etag', false );
	// enable compression
	app.use( compression( { level: app.conf.compression_level } ) );
	// use the JSON body parser
	app.use( bodyParser.json( { limit: app.conf.max_body_size || '100kb' } ) );
	// use the application/x-www-form-urlencoded parser
	app.use( bodyParser.urlencoded( { extended: true } ) );

	return BBPromise.resolve( app );

}

/**
 * Loads all routes declared in routes/ into the app
 *
 * @param {Application} app the application object to load routes into
 * @param {string} dir routes folder
 * @return {bluebird} a promise resolving to the app object
 */
function loadRoutes( app, dir ) {

	// recursively load routes from .js files under routes/
	return fs.readdirAsync( dir ).map( ( fname ) => BBPromise.try( () => {
		let route;
		const resolvedPath = path.resolve( dir, fname );
		const isDirectory = fs.statSync( resolvedPath ).isDirectory();
		if ( isDirectory ) {
			loadRoutes( app, resolvedPath );
		} else if ( /\.js$/.test( fname ) ) {
			// import the route file
			// eslint-disable-next-line security/detect-non-literal-require
			route = require( `${ dir }/${ fname }` );
			return route( app );
		}
		// import the route file
		// eslint-disable-next-line security/detect-non-literal-require
		route = require( `${ __dirname }/routes/${ fname }` );
		return route( app );
	} ).then( ( route ) => {
		if ( route === undefined ) {
			return undefined;
		}
		// check that the route exports the object we need
		if ( route.constructor !== Object || !route.path || !route.router ||
                !( route.api_version || route.skip_domain ) ) {
			throw new TypeError( `routes/${ fname } does not export the correct object!` );
		}
		// normalise the path to be used as the mount point
		if ( route.path[ 0 ] !== '/' ) {
			route.path = `/${ route.path }`;
		}
		if ( route.path[ route.path.length - 1 ] !== '/' ) {
			route.path = `${ route.path }/`;
		}
		if ( !route.skip_domain ) {
			route.path = `/:domain/v${ route.api_version }${ route.path }`;
		}
		// wrap the route handlers with Promise.try() blocks
		sUtil.wrapRouteHandlers( route, app );
		// all good, use that route
		app.use( route.path, route.router );
	} ) ).then( () => {
		// catch errors
		sUtil.setErrorHandler( app );
		// route loading is now complete, return the app object
		return BBPromise.resolve( app );
	} );

}

/**
 * Creates and start the service's web server
 *
 * @param {Application} app the app object to use in the service
 * @return {bluebird} a promise creating the web server
 */
function createServer( app ) {

	// return a promise which creates an HTTP server,
	// attaches the app to it, and starts accepting
	// incoming client requests
	let server;
	return new BBPromise( ( resolve ) => {
		server = http.createServer( app ).listen(
			app.conf.port,
			app.conf.interface,
			resolve
		);
		server = addShutdown( server );
	} ).then( () => {
		app.logger.log( 'info',
			`Worker ${ process.pid } listening on ${ app.conf.interface || '*' }:${ app.conf.port }` );

		// Don't delay incomplete packets for 40ms (Linux default) on
		// pipelined HTTP sockets. We write in large chunks or buffers, so
		// lack of coalescing should not be an issue here.
		server.on( 'connection', ( socket ) => {
			socket.setNoDelay( true );
		} );

		return server;
	} );

}

/**
 * The service's entry point. It takes over the configuration
 * options and the logger- and metrics-reporting objects from
 * service-runner and starts an HTTP server, attaching the application
 * object to it.
 *
 * @param {Object} options
 * @return {bluebird}
 */
module.exports = ( options ) => initApp( options )
	.then( ( app ) => loadRoutes( app, `${ __dirname }/routes` ) )
	.then( ( app ) => {
		// serve static files from static/
		app.use( '/static', express.static( `${ __dirname }/static` ) );
		return app;
	} ).then( createServer );
