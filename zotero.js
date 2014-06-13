#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/cite-from-id
* 
* Supplies methods to send requests to a Zotero server
 */

var request = require('request');

var zoteroURL = 'http://localhost:1969/web'; //assumes zotero already started

var zoteroRequest  = function(requestedURL, sessionID, callback){
	var options = {
		url: zoteroURL,
		method: 'POST',
		json: {
			"url": requestedURL,
			"sessionid": sessionID
		}
	};

	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback(body);
		}
	});
};

/*Test URL in main function*/
var main = function(){
    testURL = "http://www.tandfonline.com/doi/abs/10.1080/15424060903167229"
	testSessionID = "abc123"

	zoteroRequest(testURL, testSessionID, function(body){
		console.log(body);
	});
}

if (require.main === module) {
    main();
}

/*Exports*/
module.exports = {
	zoteroRequest: zoteroRequest
};

