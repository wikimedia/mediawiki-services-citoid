#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 */

var xpath = require('xpath'),
	dom = require('xmldom').DOMParser,
	urlParse = require('url');
	request = require('request');

/**
 * Currently picks out contents of <title> tag only
 * callback runs on list of json objs (var body)
 * @param  {String}   url      url to scrape
 * @param  {Function} callback callback function
 */

var scrapeXpath = function(url, callback){
	var body,
		json = {
			itemType: 'webpage',
		};


	request(
		{
			url: url, 
			headers: {'user-agent': 'Mozilla/5.0'},
			//followRedirect: false 
		}, function(error, response, html){

			//case for there being no response from the server
			//usually in the case of malformed url
			if (error || !response) {
				json['url'] = url;
				json['title'] = url;
				body = [json];
				callback(body);
				return;
			}

			var d,
				parsedUrl = response.request.uri ? response.request.uri : urlParse.parse(url);

			json['url'] = urlParse.format(parsedUrl);

			try{
				var doc = new dom().parseFromString(html);
				json['title'] = xpath.select('//title/text()', doc).toString();
			}
			catch (e){
				json['title'] = parsedUrl.pathname ? (parsedUrl.hostname.toString() + parsedUrl.pathname.toString()) : parsedUrl.hostname.toString();
			}

			//only set pub title if doc sucessfully parsed
			//b/c otherwise full url is in the title field anyway
			if (doc) {
				json['publicationTitle'] = parsedUrl.hostname;
			}

			d = new Date();
			json['accessDate'] = d.toDateString();	

			var body = [json];
			callback(body);
	});
};

var scrape = scrapeXpath;

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