#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 */

var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var request = require('request');
var urlParse = require('url');


/**
 * Currently picks out contents of <title> tag only
 * callback runs on list of json objs (var body)
 * @param  {String}   url      url to scrape
 * @param  {Function} callback callback function
 */

var scrapeXpath = function(url, callback){
	request(
		{
			url: url, 
			headers: {'user-agent': 'Mozilla/5.0'},
			followAllRedirects: true 
		}, function(error, response, html){

			var doc, body, titleValue,
				json = {itemType: 'webpage'};

			if (error || !response) {
				json['url'] = url;
				json['title'] = url;
				body = [json];
				callback(body);
				return;
			}

			try{
				doc = new dom().parseFromString(html);
			}
			catch (e){
				console.log(e);
			}

			try {
				titleValue = xpath.select("//title/text()", doc).toString();
			}
			catch (e){
				console.log(e);
			}

			parsedUrl = response.request.uri ? response.request.uri : urlParse.parse(url);
			json['url'] = url;

			d = new Date();
			json['accessDate'] = d.toDateString();

			json['title'] = titleValue ? titleValue : url;

			if (titleValue && parsedUrl && parsedUrl.hostname) {
				json['publicationTitle'] = parsedUrl.hostname;
			}

			body = [json];

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