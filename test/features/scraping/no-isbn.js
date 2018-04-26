'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


if (!server.stopHookAdded) {
    server.stopHookAdded = true;
    after(() => server.stop());
}

describe('No isbn', function() {

    this.timeout(20000);

    describe('disable xisbn', function() {
        before(function () { return server.start({xisbn:false, wskey:false}); });

        it('isbn- not implemented, uses crossref open search instead, and does badly', function() {
            var pmcid = '978-0596519797';
            return server.query(pmcid, 'mediawiki', 'en')
            .then(function(res) {
                assert.status(res, 200);
            });
        });
    });
});

