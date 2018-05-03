'use strict';

const fs = require('fs');
const preq   = require('preq');
const yaml = require('js-yaml');

const assert = require('../../../utils/assert.js');
const CrossRefService = require('../../../../lib/external-apis/CrossRefService.js');
const Logger = require('../../../../node_modules/service-runner/lib/logger.js');
const logStream = require('../../../utils/logStream.js');
const server = require('../../../utils/server.js')

if (!server.stopHookAdded) {
    server.stopHookAdded = true;
    after(() => server.stop());
}

describe('lib/externalAPIs/CrossRefService.js functions: ', function() {

    let doi;
    let expected;
    let onreject;
    let promise;
    let result;
    const conf = yaml.safeLoad(fs.readFileSync(__dirname + '/../../../../config.yaml'));

    describe('polite config', function() {

        let app = {
            conf: conf.services[0].conf
        };

        app.conf.userAgent = 'mocha-user-agent';
        app.conf.mailto = 'example@example.com';

        app.conf.logging = {
            name: 'test-log',
            level: 'trace',
            stream: logStream()
        };

        app.logger = new Logger(app.conf.logging);

        const crossref = new CrossRefService(app);

        it('Gets metadata for doi', function() {
            doi = '10.1037/0003-066x.59.1.29'; // Case sensitive
            promise = crossref.doi(doi);
            return promise.then(function(results){
                assert.deepEqual(results.DOI, doi);
            });
        });

        it('Doesn\'t get metadata for invalid doi', function() {
            doi = 'www.example.com';
            promise = crossref.doi(doi);
            onreject = function(e){return;};
            return assert.fails(promise, onreject);
        });
    });

    describe('anonymous config', function() {

        let app = {
            conf: conf.services[0].conf
        };

        delete app.conf.userAgent;
        delete app.conf.mailto;

        app.conf.logging = {
            name: 'test-log',
            level: 'trace',
            stream: logStream()
        };

        app.logger = new Logger(app.conf.logging);

        const crossref = new CrossRefService(app);

        it('Gets metadata for doi', function() {
            doi = '10.1037/0003-066x.59.1.29'; // Case sensitive
            promise = crossref.doi(doi);
            return promise.then(function(results){
                assert.deepEqual(results.DOI, doi);
            });
        });

        it('Doesn\'t get metadata for invalid doi', function() {
            doi = 'www.example.com';
            promise = crossref.doi(doi);
            onreject = function(e){return;};
            return assert.fails(promise, onreject);
        });
    });

    describe('open search function', function() {

        let app = {
            conf: conf.services[0].conf
        };

        app.conf.userAgent = 'mocha-user-agent';
        app.conf.mailto = 'example@example.com';

        app.conf.logging = {
            name: 'test-log',
            level: 'trace',
            stream: logStream()
        };

        app.logger = new Logger(app.conf.logging);

        const crossref = new CrossRefService(app);

        it('Gets metadata for open search', function() {
            let search = 'E. Schrodinger, Proc. Cam. Phil. Soc. 31, 555 (1935)';
            promise = crossref.search(search);
            return promise.then(function(results){
                assert.deepEqual(results.DOI, '10.1017/s0305004100013554');
            });
        });
    });
});