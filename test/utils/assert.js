'use strict';

const { use } = require( 'chai' );

module.exports = use( ( _chai, _utils ) => {
	const { assert } = _chai;

	/**
	 * Asserts whether the return status was as expected
	 *
	 * @param {Object} res
	 * @param {number} expected
	 */
	assert.status = ( res, expected ) => {
		const msg = `Expected status to be ${ expected }, but was ${ res.status }`;
		new _chai.Assertion( res.status, msg, assert.status, true ).to.eql( expected );
	};

	/**
	 * Asserts whether content type was as expected
	 *
	 * @param {Object} res
	 * @param {string} expectedRegexString
	 */
	assert.contentType = ( res, expectedRegexString ) => {
		const actual = res.headers[ 'content-type' ] || res.headers.get( 'content-type' ); // Headers objects will return undefined without using .get
		const msg = `Expected content-type to match ${ expectedRegexString }, but was ${ actual }`;
		new _chai.Assertion( actual, msg, assert.contentType, true ).to.match( RegExp( expectedRegexString ) );
	};

	assert.fails = ( promise, onRejected ) => {

		let failed = false;

		function trackFailure( e ) {
			failed = true;
			return onRejected( e );
		}

		function check() {
			if ( !failed ) {
				throw new Error( 'expected error was not thrown' );
			}
		}
		return promise.catch( trackFailure ).then( check );

	};

	assert.checkError = ( res, status, message ) => {

		assert.deepEqual( res.status, status,
			'Expected status to be ' + status + ', but was ' + res.status );

		if ( message ) {
			assert.deepEqual( res.body.error, message, 'Wrong error message, expected "' + message + '", got "' + res.body.error + '"' );
		}

		assert.deepEqual( res.body.name, undefined, 'Unexpected parameter "name" in error response' );
	};

	// Assert that expected value is an element of an array.
	assert.isInArray = ( arr, expected, message ) => {
		if ( !Array.isArray( arr ) ) {
			throw new Error( 'Expected array, got ' + typeof arr + ' ' + arr ); // If arr is undefined will throw undefined error instead
		}

		assert.notDeepEqual( arr.indexOf( expected ), -1, message );
	};

	// Assert that expected value is not element of an array.
	assert.isNotInArray = ( arr, expected, message ) => {
		if ( !Array.isArray( arr ) ) {
			throw new Error( 'Expected array, got ' + typeof arr + ' ' + arr ); // If arr is undefined will throw undefined error instead
		}

		assert.deepEqual( arr.indexOf( expected ), -1, message );
	};

	// Used by checkCitation and checkZotCitation
	assert.checkCit = ( res, title ) => {

		assert.status( res, 200 );

		let cit = res.body;

		if ( !Array.isArray( cit ) || cit.length < 1 ) {
			throw new Error( 'Expected to receive an array of at least 1 citation, got: ' + JSON.stringify( cit ) );
		}

		cit = cit[ 0 ];

		// Check presence of all required fields
		assert.deepEqual( !!cit.itemType, true, 'No itemType present' );
		assert.deepEqual( !!cit.title, true, 'No title present' );
		assert.deepEqual( !!cit.url, true, 'No url present' );

		if ( title ) {
			assert.deepEqual( cit.title, title, 'Wrong title, expected "' + title + '", got "' + cit.title + '"' );
		}

	};

	// Checks Zotero citation
	assert.checkZotCitation = ( res, title ) => {

		assert.isInArray( res.body[ 0 ].source, 'Zotero', 'Expected response from Zotero' );

		assert.checkCit( res, title );

		assert.deepEqual( res.body[ 0 ].accessDate.length, 10, 'accessDate length incorrect' );
		assert.notDeepEqual( res.body[ 0 ].accessDate, 'CURRENT_TIMESTAMP', 'Access date uncorrected' );

	};

	// Checks non-Zotero citation
	assert.checkCitation = ( res, title ) => {
		assert.isNotInArray( res.body[ 0 ].source, 'Zotero', 'Expected no response from Zotero' );

		assert.checkCit( res, title );

		assert.deepEqual( !!res.body[ 0 ].accessDate, true, 'No accessDate present' );
		assert.notDeepEqual( res.body[ 0 ].accessDate, 'CURRENT_TIMESTAMP', 'Access date uncorrected' );
	};

	assert.checkBibtex = ( res, beginning ) => {

		assert.deepEqual( Buffer.isBuffer( res.body ), true, 'Expected the body to be a Buffer!' );

		const cit = res.body.toString();
		assert.deepEqual( cit.slice( 0, beginning.length ), beginning, 'Beginning of citation does not match' );

	};

} ).assert;
