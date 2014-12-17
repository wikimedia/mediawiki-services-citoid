#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 */

/* Import Modules */
var request = require('request'),
	urlParse = require('url'),
	cheerio = require('cheerio');

/**
 * Currently scrapes title only
 * callback runs on list of json objs (var body)
 * @param  {String}   url      url to scrape
 * @param  {Function} callback callback(error, body)
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
			followAllRedirects: true
		}, function(error, response, html){

			var citation = {itemType: 'webpage', url: url, title: url};

			if (error || !response) {
				console.log(error);
				callback(error, [citation]);
				return;
			}

			try{
				$ = cheerio.load(html);
			}
			catch (e){
				console.log('Could not load document: ' + e);
				callback(error, [citation]);
			}

			citation.title = getTitle();

			// Access date on format YYYY-MM-DD
			citation.accessDate = (new Date()).toISOString().substring(0, 10);

			var parsedUrl = response.request.uri ? response.request.uri : urlParse.parse(url);

			if (citation.title && parsedUrl && parsedUrl.hostname) {
				citation.publicationTitle = parsedUrl.hostname;
			}

			callback(error, [citation]);
	});
};

if (require.main === module) {
	var sampleUrl = 'http://example,.com';
	console.log('scrape fcn running on sample url:'+sampleUrl);
	scrape(sampleUrl, function(error, body){
		console.log(error);
		console.log(body);
	});
}

module.exports = {
	scrape: scrape
};