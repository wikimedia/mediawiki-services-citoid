#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/cite-from-id
* 
* Supplies methods to send requests to a Zotero server
 */

var request = require('request');

var zotero_url = 'http://localhost:1969/web' //assumes zotero already started

var zotero_request  = function(requested_url, sessionid, callback){
	var options = {
		url: zotero_url,
		method: 'POST',
		json: {
			"url": requested_url,
			"sessionid": sessionid
		}
	};

	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback(body);
		}
	});
};

/*testing below*/
test_url = "http://www.tandfonline.com/doi/abs/10.1080/15424060903167229"
test_sessionid = "abc123"

zotero_request(test_url, test_sessionid, function(body){
	console.log(body);

});

