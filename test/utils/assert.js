'use strict';


const assert = require('assert');


function deepEqual(result, expected, message) {

    try {
        assert.deepEqual(result, expected, message);
    } catch (e) {
        console.log(`Expected:\n${JSON.stringify(expected, null, 2)}`);
        console.log(`Result:\n${JSON.stringify(result, null, 2)}`);
        throw e;
    }

}


/**
 * Asserts whether the return status was as expected
 *
 * @param {Object} res
 * @param {integer} expected
 */
function status(res, expected) {

    deepEqual(res.status, expected,
        `Expected status to be ${expected}, but was ${res.status}`);

}


/**
 * Asserts whether content type was as expected
 *
 * @param {Object} res
 * @param {string} expectedRegexString
 */
function contentType(res, expectedRegexString) {

    const actual = res.headers['content-type'];
        assert.ok(RegExp(expectedRegexString).test(actual),
            `Expected content-type to match ${expectedRegexString}, but was ${actual}`);
}


function isDeepEqual(result, expected, message) {

    try {
        assert.deepEqual(result, expected, message);
        return true;
    } catch (e) {
        return false;
    }

}


function notDeepEqual(result, expected, message) {

    try {
        assert.notDeepEqual(result, expected, message);
    } catch (e) {
        console.log(`Not expected:\n${JSON.stringify(expected, null, 2)}`);
        console.log(`Result:\n${JSON.stringify(result, null, 2)}`);
        throw e;
    }

}


function fails(promise, onRejected) {

    let failed = false;

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

function checkError(res, status, message) {

    deepEqual(res.status, status,
        'Expected status to be ' + status + ', but was ' + res.status);

    if (message) {
        assert.deepEqual(res.body.Error, message, 'Wrong error message, expected "' + message + '", got "' + res.body.Error + '"');
    }

    assert.deepEqual(res.body.name, undefined, 'Unexpected parameter "name" in error response');

}

// Assert that expected value is an element of an array.
function isInArray(arr, expected, message) {
    if (!Array.isArray(arr)) {
        throw new Error('Expected array, got ' + typeof arr + ' ' + arr); // If arr is undefined will throw undefined error instead
    }

    assert.notDeepEqual(arr.indexOf(expected), -1, message);
}

// Assert that expected value is not element of an array.
function isNotInArray(arr, expected, message) {
    if (!Array.isArray(arr)) {
        throw new Error('Expected array, got ' + typeof arr + ' ' + arr); // If arr is undefined will throw undefined error instead
    }

    assert.deepEqual(arr.indexOf(expected), -1, message);
}


// Used by checkCitation and checkZotCitation
function checkCit(res, title) {

    status(res, 200);

    let cit = res.body;

    if (!Array.isArray(cit) || cit.length < 1) {
        throw new Error('Expected to receive an array of at least 1 citation, got: ' + JSON.stringify(cit));
    }

    cit = cit[0];

    // Check presence of all required fields
    assert.deepEqual(!!cit.itemType, true, 'No itemType present');
    assert.deepEqual(!!cit.title, true, 'No title present');
    assert.deepEqual(!!cit.url, true, 'No url present');

    if (title) {
        assert.deepEqual(cit.title, title, 'Wrong title, expected "' + title + '", got "' + cit.title + '"');
    }

}

// Checks Zotero citation
function checkZotCitation(res, title) {

    isInArray(res.body[0].source, 'Zotero', 'Expected response from Zotero');

    checkCit(res, title);

    assert.deepEqual(res.body[0].accessDate.length, 10, 'accessDate length incorrect');
    assert.notDeepEqual(res.body[0].accessDate, 'CURRENT_TIMESTAMP', 'Access date uncorrected');

}

// Checks non-Zotero citation
function checkCitation(res, title) {
    isNotInArray(res.body[0].source, 'Zotero', 'Expected no response from Zotero');

    checkCit(res, title);

    assert.deepEqual(!!res.body[0].accessDate, true, 'No accessDate present');
    assert.notDeepEqual(res.body[0].accessDate, 'CURRENT_TIMESTAMP', 'Access date uncorrected');
}


function checkBibtex(res, beginning) {

    assert.deepEqual(Buffer.isBuffer(res.body), true, 'Expected the body to be a Buffer!');

    const cit = res.body.toString();
    assert.deepEqual(cit.substring(0, beginning.length), beginning, "Beginning of citation does not match");

}


module.exports.ok             = assert.ok;
module.exports.fails          = fails;
module.exports.deepEqual      = deepEqual;
module.exports.isDeepEqual    = isDeepEqual;
module.exports.notDeepEqual   = notDeepEqual;
module.exports.contentType    = contentType;
module.exports.status         = status;
module.exports.checkError       = checkError;
module.exports.isInArray        = isInArray;
module.exports.isNotInArray     = isNotInArray;
module.exports.checkCitation    = checkCitation;
module.exports.checkZotCitation = checkZotCitation;
module.exports.checkBibtex      = checkBibtex;

