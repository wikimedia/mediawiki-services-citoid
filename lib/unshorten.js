'use strict';

var BBPromise = require('bluebird');
var preq = require('preq');

/**
 * Follows redirects in a URL
 * @param  {String}   url      url trying to be unshortened
 * @return {Object}            BBPromise for url
 */

var unshorten = BBPromise.method(function (url){
	return preq(url)
	.catch(function(e){ return BBPromise.reject(); })
	.then(function (response){
		if (response && (url !== response.headers['content-location'])){
			return response.headers['content-location'];
		}
		else {
			return BBPromise.reject('No redirect detected');
		}
	});
});

module.exports = unshorten;

