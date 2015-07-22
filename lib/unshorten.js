'use strict';

var BBPromise = require('bluebird');
var preq = require('preq');

/**
 * Follows redirects in a URL
 * @param  {String}  url        url trying to be unshortened
 * @param  {String}  userAgent  the User-Agent header to use
 * @param  {Object}  jar        the cookie jar to use for requests
 * @return {Object}             BBPromise for url
 */

var unshorten = BBPromise.method(function (url, userAgent, jar){
	return preq({
		method: 'head',
		url: url,
		headers: {
			'User-Agent': userAgent
		},
		jar: jar
	}).then(function (response){
		if (response && (url !== response.headers['content-location'])){
			return response.headers['content-location'];
		}
		else {
			return BBPromise.reject('No redirect detected');
		}
	});
});

module.exports = unshorten;

