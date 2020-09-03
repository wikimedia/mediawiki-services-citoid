'use strict';

/**
 * Tests for when Zotero can translate but not export
 */

var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');
var zotero = require('../../utils/mockZoteroServer.js');


if (!server.stopHookAdded) {
    server.stopHookAdded = true;
    after(() => server.stop());
}

describe('mock Zotero service that cannot export', function() {

    this.timeout(40000);

    // Give Zotero port which is it is not running from-
    // Mimics Zotero being down.
    before(() => {
        zotero.start(1968); // Start mock zotero server
        server.start({ zoteroPort:1968 }); // Start citoid server using mock Zotero location
    });

    it('Get error for bibtex export', function() {
        return server.query('http://www.example.com', 'bibtex', 'en')
        .then(function(res) {
            assert.status(res, 404);
        }, function(err) {
            assert.deepEqual(err.body.Error,'Unable to serve bibtex format at this time');
            assert.status(err, 404);
            // assert.checkError(err, 404, 'Unable to serve bibtex at this time');
        });
    });

    it('Success with mediawiki export', function() {
        return server.query('http://www.example.com').then(function(res) {
            assert.status(res, 200);
            assert.checkCitation(res, 'Example Domain');
        });
    });

});
