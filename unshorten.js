(function() {

	var request = require('request');

	var unshorten = function (url, callback){
		request(url, function (error, response, body) {
			if (!error && ~[301, 302].indexOf(response.statusCode)) {
				callback(response.headers.location);
			}
			else {
				callback(url);
			}
		});
	};
	module.exports = unshorten;
}());
