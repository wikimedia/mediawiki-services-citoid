'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('errors caused by changing default settings', function() {

    this.timeout(20000);

    describe('disable xisbn', function() {
        before(function () { return server.start({xisbn:false}); });

        it('isbn- not implemented, assumes url and gets invalid host', function() {
            var pmcid = '978-0596519797';
            return server.query(pmcid, 'mediawiki', 'en')
            .then(function(res) {
                assert.status(res, 400);
            }, function(err) {
                assert.status(err, 400);
                assert.deepEqual(err.body.Error, 'Invalid host supplied');
            });
        });
    });
});

