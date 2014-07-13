#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 */

var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var request = require('request');


/**
 * Currently picks out contents of <title> tag only
 * callback runs on list of json objs (var body)
 * @param  {String}   url      url to scrape
 * @param  {Function} callback callback function
 */

var scrapeXpath = function(url, callback){
	var json = { title : "", url: url};
	request(
		{
			url: url, 
			headers: {'user-agent': 'Mozilla/5.0'},
			//followRedirect: false 
		}, function(url, response, html){
			var doc, 
				titleValue = '';

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

			json.title = titleValue;
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