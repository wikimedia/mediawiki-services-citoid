'use strict';

const fs = require('fs');
const yaml = require('js-yaml');
const preq = require('preq');

const assert = require('../../../utils/assert.js');
const CrossRefService = require('../../../../lib/external-apis/CrossRefService.js');
const Logger = require('../../../../node_modules/service-runner/lib/logger.js');
const logStream = require('../../../utils/logStream.js');

describe('lib/externalAPIs/CrossRefService.js functions: ', function () {

    let doi;
    let onreject;
    let promise;
    let conf;
    let logConf;
    let request;
    let crossref;
    let app;

    before(() => {
        // Dummy logger
        logConf = {
            name: 'test-log',
            level: 'trace',
            stream: logStream()
        };

        request = {
            logger: new Logger(logConf),
            issueRequest: preq // use preq as standin for issueRequest, as they're the same except some headers will be missing, i.e. user-agent
        };
    });

    describe('polite config', function () {

        before(() => {
            conf = yaml.safeLoad(fs.readFileSync(__dirname + '/../../../../config.yaml'));
            app = {
                conf: conf.services[0].conf
            };
            app.conf.mailto = 'example@example.com';
            crossref = new CrossRefService(app);
        });

        it('Gets metadata for doi', function () {
            doi = '10.1037/0003-066x.59.1.29'; // Case sensitive
            promise = crossref.doi(doi, request);
            return promise.then(function (results) {
                assert.deepEqual(results.DOI, doi);
            });
        });

        it('Doesn\'t get metadata for invalid doi', function () {
            doi = 'www.example.com';
            promise = crossref.doi(doi, request);
            onreject = function (e) {
                return;
            };
            return assert.fails(promise, onreject);
        });
    });

    describe('anonymous config', function () {

        before(() => {
            conf = yaml.safeLoad(fs.readFileSync(__dirname + '/../../../../config.yaml'));
            app = {
                conf: conf.services[0].conf
            };
            delete app.conf.mailto;
            crossref = new CrossRefService(app);
        });

        it('Gets metadata for doi', function () {
            doi = '10.1037/0003-066x.59.1.29'; // Case sensitive
            promise = crossref.doi(doi, request);
            return promise.then(function (results) {
                assert.deepEqual(results.DOI, doi);
            });
        });

        it('Doesn\'t get metadata for invalid doi', function () {
            doi = 'www.example.com';
            promise = crossref.doi(doi, request);
            onreject = function (e) {
                return;
            };
            return assert.fails(promise, onreject);
        });
    });

    describe('open search function', function () {

        before(() => {
            conf = yaml.safeLoad(fs.readFileSync(__dirname + '/../../../../config.yaml'));
            app = {
                conf: conf.services[0].conf
            };
            app.conf.mailto = 'example@example.com';
            crossref = new CrossRefService(app);
        });

        it('Gets metadata for open search', function () {
            const search = 'E. Schrodinger, Proc. Cam. Phil. Soc. 31, 555 (1935)';
            promise = crossref.search(search, request);
            return promise.then(function (results) {
                assert.deepEqual(results.DOI, '10.1017/s0305004100013554');
            });
        });
    });
});
