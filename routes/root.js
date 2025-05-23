'use strict';

const sUtil = require( '../lib/util' );
const swaggerUi = require( '../lib/swagger-ui' );

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET /robots.txt
 * Instructs robots no indexing should occur on this domain.
 */
router.get( '/robots.txt', ( req, res ) => {

	res.type( 'txt' ).send( 'User-agent: *\nDisallow: /\n' );

} );

/**
 * GET /
 * Main entry point. Serves docs if root, ?doc, or any param is requested
 * other than ?spec
 */
router.get( '/', ( req, res, next ) => {

	if ( {}.hasOwnProperty.call( req.query || {}, 'spec' ) ) {
		res.json( app.conf.spec );
	} else {
		return swaggerUi.processRequest( app, req, res );
	}

} );

module.exports = ( appObj ) => {

	app = appObj;

	return {
		path: '/',
		skip_domain: true,
		router
	};

};
