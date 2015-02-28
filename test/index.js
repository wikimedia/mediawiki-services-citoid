#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 */

// mocha defines to avoid JSHint errors
/* global describe, it */

var CitoidService = require('../lib/CitoidService.js'),
	bunyan = require('bunyan'),
	path = require('path'),
	opts = require('yargs')
	.usage('Usage: $0 [-c configfile|--config=configfile]')
	.default({
		c: __dirname + '/localsettings.js'
	})
	.alias( 'c', 'config' ),
	argv = opts.argv,
	settingsFile = path.resolve(process.cwd(), argv.c),
	log = bunyan.createLogger({name: "citoid"}),
	defaults = {
		allowCORS : '*',
		citoidPort : 1970,
		citoidInterface : 'localhost',
		userAgent : null,
		zoteroPort : 1969,
		zoteroInterface : 'localhost',
	},
	citoidConfig,
	citoidService;

try {
	citoidConfig = require(settingsFile).CitoidConfig;
} catch (e) {
	citoidConfig = defaults;
}

citoidService = new CitoidService(citoidConfig, log);

describe('200', function() {

	var url = 'example.com';

	it('should scrape info successfully', function(done) {
		citoidService.request(url, 'mediawiki', function(error, responseCode, citation){
			if (error) {throw error;}
			if (responseCode !== 200){
				throw new Error('Not successful: Response code is' + responseCode);
			}
			if (!citation) {throw new Error ('Empty body');}
			done();
			// TODO: Match retrieved citation to expected citation
		});
	});
});

describe('520', function() {

	var url = 'example./com';

	it('should return 520 error and citation', function(done) {
		citoidService.request(url, 'mediawiki', function(error, responseCode, citation){
			if (responseCode !== 520){
				throw new Error('Should throw 520: Response code is' + responseCode);
			}
			if (!citation) {throw new Error ('Empty body');}
			// TODO: Match retrieved citation to expected citation
			done();
		});
	});
});
