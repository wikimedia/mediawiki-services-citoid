'use strict';

const sUtil = require( '../lib/util' );
const CitoidRequest = require( '../lib/CitoidRequest.js' );
const CitoidService = require( '../lib/CitoidService' );

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

// Coerces 'false'-> false, '0'-> false, 'True' ->true, '1'->true, etc
function getBool( val ) {
	if ( !val ) {
		return false;
	}
	return !!JSON.parse( String( val ).toLowerCase() );
}

/**
 * Endpoint for retrieving citations based on search term or url.
 */

router.get( '/*format/*search', ( req, res, next ) => {
	const cr = new CitoidRequest( req, app );

	if ( !req.params.format || !req.params.format[ 0 ] ) {
		res.status( 400 ).type( 'application/json' );
		res.send( { error: "No 'format' value specified" } );
		return;
	} else if ( req.params.format[ 0 ] === '_info' ) {
		next();
		return;
	} else if ( !req.params.search || !req.params.search[ 0 ].trim() ) {
		res.status( 400 ).type( 'application/json' );
		res.send( { error: "No 'search' value specified" } );
		return;
	} else if ( !app.formats[ cr.format ] ) { // Use encoded format
		res.status( 400 ).type( 'application/json' );
		// eslint-disable-next-line no-constant-binary-expression
		res.send( { error: `Invalid format requested ${ cr.format }` || '' } );
		return;
	} else if ( getBool( cr.baseFields ) && !( getBool( cr.baseFields ) &&
		// Ensure format supports baseFields - mediawiki & mediawiki-basefields formats only
		( cr.format === 'mediawiki' || cr.format === 'mediawiki-basefields' ) ) ) {
		res.status( 400 ).type( 'application/json' );
		// eslint-disable-next-line no-constant-binary-expression
		res.send( { error: `Base fields are not supported for format ${ cr.format }` || '' } );
		return;
	}

	return app.citoid.request( cr ).then( ( cReq ) => {
		res.status( cReq.response.responseCode ).type( app.formats[ cReq.format ] );
		res.send( cReq.response.body );
	}, ( cReq ) => {
		res.status( cReq.response.responseCode ).type( app.formats[ cReq.format ] );
		res.send( cReq.response.body );
	} );
} );

/**
 * Endpoint removal notification for api endpoint
 */

router.get( '/api', ( req, res, next ) => {
	res.status( 400 ).type( 'application/json' );
	res.send( { error: 'Api endpoint unavailable as of 2.0.0.; use path parameters instead.' } );
	next();
} );

module.exports = function ( appObj ) {

	app = appObj;

	// set allowed export formats and expected response type
	app.nativeFormats = {
		mediawiki: 'application/json',
		zotero: 'application/json',
		'mediawiki-basefields': 'application/json',
		wikibase: 'application/json'
	};
	app.zoteroFormats = {
		bibtex: 'application/x-bibtex'
	};
	app.formats = Object.assign( {}, app.nativeFormats, app.zoteroFormats );

	// init the Citoid service object
	app.citoid = new CitoidService( app );

	return {
		path: '/',
		skip_domain: true,
		router
	};

};
