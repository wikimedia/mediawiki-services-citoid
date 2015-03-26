'use strict';


var assert = require('assert');


/**
 * Asserts whether the return status was as expected
 */
function status(res, expected) {

	deepEqual(res.status, expected,
		'Expected status to be ' + expected + ', but was ' + res.status);

}


/**
 * Asserts whether content type was as expected
 */
function contentType(res, expected) {

	var actual = res.headers['content-type'];
	deepEqual(actual, expected,
		'Expected content-type to be ' + expected + ', but was ' + actual);

}


function isDeepEqual(result, expected, message) {

	try {
		if (typeof expected === 'string') {
			assert.ok(result === expected || (new RegExp(expected).test(result)), message);
		} else {
			assert.deepEqual(result, expected, message);
		}
		return true;
	} catch (e) {
		return false;
	}

}


function deepEqual(result, expected, message) {

	try {
		if (typeof expected === 'string') {
			assert.ok(result === expected || (new RegExp(expected).test(result)));
		} else {
			assert.deepEqual(result, expected, message);
		}
	} catch (e) {
		console.log('Expected:\n' + JSON.stringify(expected, null, 2));
		console.log('Result:\n' + JSON.stringify(result, null, 2));
		throw e;
	}

}


function notDeepEqual(result, expected, message) {

	try {
		assert.notDeepEqual(result, expected, message);
	} catch (e) {
		console.log('Not expected:\n' + JSON.stringify(expected, null, 2));
		console.log('Result:\n' + JSON.stringify(result, null, 2));
		throw e;
	}

}


function fails(promise, onRejected) {

	var failed = false;

	function trackFailure(e) {
		failed = true;
		return onRejected(e);
	}

	function check() {
		if (!failed) {
			throw new Error('expected error was not thrown');
		}
	}

	return promise.catch(trackFailure).then(check);

}


function checkCitation(res, title) {

	var cit = res.body;

	if(!Array.isArray(cit) || !cit.length) {
		throw new Error('Expected to receive an array of citations, got: ' + JSON.stringify(cit));
	}

	cit = cit[0];
	assert.notDeepEqual(cit.itemType, undefined, 'No itemType present');
	if(title) {
		assert.deepEqual(cit.title, title, 'Wrong title, expected "' + title + '", got "' + cit.title + '"');
	}

}


function checkBibtex(res, beginning) {

	var cit = res.body;

	if (cit instanceof String) {
		throw new Error('Expected String, got: ' + JSON.stringify(cit));
	}

	assert.deepEqual(cit.substring(0, beginning.length), beginning, "Beginning of citation does not match");

}


module.exports.ok             = assert.ok;
module.exports.fails          = fails;
module.exports.deepEqual      = deepEqual;
module.exports.isDeepEqual    = isDeepEqual;
module.exports.notDeepEqual   = notDeepEqual;
module.exports.contentType    = contentType;
module.exports.status         = status;
module.exports.checkCitation  = checkCitation;
module.exports.checkBibtex    = checkBibtex;


