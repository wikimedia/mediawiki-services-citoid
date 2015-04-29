'use strict';

var ctFromBody = require('../../../lib/Scraper.js').contentTypeFromBody;
var fs = require('fs');
var cheerio = require('cheerio');

describe('parsing', function() {

	this.timeout(20000);

	it('should scrape meta tag charset content', function(done) {
		var results = ctFromBody(cheerio.load(fs.readFileSync('test/utils/static/metacharset.html')));
		if (results !== 'iso-8859-1'){
			throw new Error('Expected to iso-8859-1; got ' + results);
		}
		done();
	});

});
