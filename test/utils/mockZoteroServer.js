'use strict';

const express = require( 'express' );
const app = express();

app.post( '/export', function ( req, res ) {
	res.status( 500 );
	res.send( 'Internal server error' );
} );

app.post( '/web', function ( req, res ) {
	res.status( 200 );
	res.send( '[{"url":"http://example.com","itemType":"webpage","title":"Example Domain","accessDate":"2015-10-16","websiteTitle":"example.com"}]' );
} );

module.exports = app;

module.exports.start = function ( port ) {
	app.listen( port );
};
