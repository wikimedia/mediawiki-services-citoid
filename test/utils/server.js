'use strict';


var BBPromise = require('bluebird');
var ServiceRunner = require('service-runner');
var logStream = require('./logStream');
var fs        = require('fs');
var assert    = require('./assert');
var yaml      = require('js-yaml');
var preq      = require('preq');


// set up the configuration
var config = {
	conf: yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yaml'))
};
// build the API endpoint URI by supposing the actual service
// is the last one in the 'services' list in the config file
var myService = config.conf.services[config.conf.services.length - 1];
config.uri = 'http://localhost:' + myService.conf.port + '/';
config.q_uri = config.uri + 'api';
// no forking, run just one process when testing
config.conf.num_workers = 0;
// have a separate, in-memory logger only
config.conf.logging = {
	name: 'test-log',
	level: 'trace',
	stream: logStream()
};

var stop    = function () {};
var options = null;
var runner = new ServiceRunner();


function start(_options) {

	_options = _options || {};

	if (!assert.isDeepEqual(options, _options)) {
		console.log('server options changed; restarting');
		stop();
		options = _options;
		return runner.run(config.conf)
		.then(function(servers) {
			var server = servers[0];
			stop = function () {
				console.log('stopping test server');
				server.close();
				stop = function () {};
			};
			return true;
		});
	} else {
		return BBPromise.resolve();
	}

}


function query(search, format, language) {

	if (!format) {
		format = 'mediawiki';
	}
	if (!language) {
		language = 'en';
	}

	return preq.get({
		uri: config.q_uri,
		query: {
			format: format,
			search: search
		},
		headers: {
			'accept-language': language
		}
	});

}


module.exports = {
	config: config,
	start: start,
	query: query
};

