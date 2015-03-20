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

describe('pmid', function() {

	var opts = {
		search : '23555203',
		format : 'mediawiki',
		acceptLanguage : 'en'
	},
		expectedTitle = 'Viral Phylodynamics';

	it('should scrape info successfully', function(done) {
		citoidService.request(opts, function(error, responseCode, citation){
			if (error) {throw error;}
			if (responseCode !== 200){
				throw new Error('Not successful: Response code is' + responseCode);
			}
			if (!citation) {throw new Error ('Empty body');}
			if (citation[0].title !== expectedTitle){
				throw new Error('Expected title is: ' + expectedTitle +
					";\nGot: " + citation[0].title);
			}
			if (!citation[0].itemType){
				throw new Error('Missing itemType');
			}
			done();
		});
	});
});

describe('200', function() {

	var opts = {
		search : 'example.com',
		format : 'mediawiki',
		acceptLanguage : 'en'
	},
		expectedTitle = 'Example Domain';

	it('should scrape info successfully', function(done) {
		citoidService.request(opts, function(error, responseCode, citation){
			if (error) {throw error;}
			if (responseCode !== 200){
				throw new Error('Not successful: Response code is' + responseCode);
			}
			if (!citation) {throw new Error ('Empty body');}
			if (citation[0].title !== expectedTitle){
				throw new Error('Expected title is: ' + expectedTitle +
					";\nGot: " + citation[0].title);
			}
			if (!citation[0].itemType){
				throw new Error('Missing itemType');
			}
			done();
		});
	});
});

describe('ENOTFOUND', function() {

	var url = 'example./com',
		opts = {
		search : url,
		format : 'mediawiki',
		acceptLanguage : 'en'
		},
		expectedTitle = 'http://example./com';

	it('should return a ENOTFOUND error, a 520 responseCode, and citation', function(done) {
		citoidService.request(opts, function(error, responseCode, citation){
			if (!error) {
				throw new Error('No error');
			}
			// Throw errors except the expected error, ENOTFOUND
			if (error.message !== 'getaddrinfo ENOTFOUND'){
				throw error;
			}
			if (responseCode !== 520){
				throw new Error('Should throw 520: Response code is ' + responseCode);
			}
			if (!citation) {throw new Error ('Empty body');}
			if (citation[0].title !== expectedTitle){
				throw new Error('Expected title is: ' + expectedTitle +
					";\nGot: " + citation[0].title);
			}
			if (!citation[0].itemType){
				throw new Error('Missing itemType');
			}
			done();
		});
	});
});

describe('404', function() {

	var url = 'http://example.com/thisurldoesntexist',
		opts = {
		search : url,
		format : 'mediawiki',
		acceptLanguage : 'en'
		},
		expectedTitle = url;

	it('should return a 520 responseCode and citation', function(done) {
		citoidService.request(opts, function(error, responseCode, citation){
			if (responseCode !== 520){
				throw new Error('Should throw 520: Response code is ' + responseCode);
			}
			if (!citation) {throw new Error ('Empty body');}
			if (citation[0].title !== expectedTitle){
				throw new Error('Expected title is: ' + expectedTitle +
					";\nGot: " + citation[0].title);
			}
			if (!citation[0].itemType){
				throw new Error('Missing itemType');
			}
			done();
		});
	});
});


describe('German twitter', function() {

	var opts = {
		search : 'http://twitter.com',
		format : 'mediawiki',
		acceptLanguage : 'de'
		},
		expectedTitle = 'Willkommen bei Twitter - Anmelden oder Registrieren';

	it('should return the citation for twitter in German', function(done) {
		citoidService.request(opts, function(error, responseCode, citation){
			if (error) {throw error;}
			if (responseCode !== 200){
				throw new Error('Should respond 200: Response code is ' + responseCode);
			}
			if (!citation) {throw new Error ('Empty body');}
			if (citation[0].title !== expectedTitle){
				throw new Error('Expected title is: ' + expectedTitle +
					";\nGot: " + citation[0].title);
			}
			done();
		});
	});
});

describe('doi', function() {

	var opts = {
		search : 'doi: 10.1371/journal.pcbi.1002947',
		format : 'mediawiki',
		acceptLanguage : 'en'
		};

	it('should use return citation from doi', function(done) {
		citoidService.request(opts, function(error, responseCode, citation){
			if (error) {throw error;}
			if (responseCode !== 200){
				throw new Error('Should respond 200: Response code is ' + responseCode);
			}
			if (!citation) {throw new Error ('Empty body');}
			if (citation[0].pages !== 'e1002947'){
				throw new Error('Expected pages value should be: e1002947; Got: '
					+ citation[0].pages);
			}
			done();
		});
	});
});