'use strict';

(function() {

	var request = require('request');

	/**
	 * Follows redirects in a URL
	 * @param  {String}   url      url trying to be unshortened
	 * @param  {Function} callback callback(detectedRedirect, url)
	 */
	var unshorten = function (url, callback){
		request(url, function (error, response){
			if (response && !error && (url !== response.request.href)){
				callback(true, response.request.href);
			}
			else {
				callback(false, url);
			}
		});
	};
	module.exports = unshorten;
}());
