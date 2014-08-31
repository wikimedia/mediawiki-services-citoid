#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 */

var request = require('request');
var urlParse = require('url');
var cheerio = require('cheerio');


/**
 * Currently picks out contents of <title> tag only
 * callback runs on list of json objs (var body)
 * @param  {String}   url      url to scrape
 * @param  {Function} callback callback function
 */

var scrape = function(url, callback){

	var $;

	function getTitle() {

		var title;

		// Try to get title from itemprop="heading"
		title = $('*[itemprop~="headline"]').first().text();
		if (title) { return title; }

		// Try to get title from <title> tag
		title = $('title').first().text();
		if (title) { return title; }

		// Default
		return url;
	}

	request(
		{
			url: url, 
			headers: {'user-agent': 'Mozilla/5.0'},
			followAllRedirects: true 
		}, function(error, response, html){

			var json = {itemType: 'webpage', url: url, title: url};

			if (error || !response) {
				callback([json]);
				return;
			}

			try{
				$ = cheerio.load(html);
			}
			catch (e){
				console.log('Could not load document: ' + e);
				callback([json]);
			}

			json.title = getTitle();

			// Access date on format YYYY-MM-DD
			json.accessDate = (new Date()).toISOString().substring(0, 10);

			var parsedUrl = response.request.uri ? response.request.uri : urlParse.parse(url);

			if (json.title && parsedUrl && parsedUrl.hostname) {
				json.publicationTitle = parsedUrl.hostname;
			}

			callback([json]);
	});
};

if (require.main === module) {
	var sampleUrl = 'http://example.com';
	console.log('scrape fcn running on sample url:'+sampleUrl);
	scrape(sampleUrl, function(body){
		console.log(body);
	});
}

module.exports = {
	scrape: scrape
};