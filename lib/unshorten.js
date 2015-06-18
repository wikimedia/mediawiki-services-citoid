'use strict';

var BBPromise = require('bluebird');
var AddressError = require('./hostIsAllowed').AddressError;
var hostIsAllowed = require('./hostIsAllowed').hostIsAllowed;
var preq = require('preq');
var urlParse = require('url');

/**
 * Follows redirects in a URL
 * @param  {String}  url        url trying to be unshortened
 * @param  {String}  userAgent  the User-Agent header to use
 * @param  {Object}  jar        the cookie jar to use for requests
 * @param  {Object}  conf       app config object
 * @param  {Object}  logger     logger object
 * @return {Object}             BBPromise for url
 */
var unshorten = BBPromise.method(function (url, userAgent, jar, conf, logger) {
	var opts = {
		followRedirect: false,
		headers: {
			'User-Agent': userAgent
		},
		jar: jar,
		/* We don't use HEAD because we can't be sure that this verb will be
		 * handled in the same manner as GET (i.e., the redirect may not be 
		 * returned).
		 */
		method: 'get',
		url: url,
	};

	var initialRequest = true;

	var seenRedirects = 0;
	var maxRedirects = conf.maxRedirects || 5;

	function detectRedirect (response) {
		if (response.headers.hasOwnProperty('location') && (opts.url !== response.headers['location'])) {
			return followRedirect(response.headers['location'], opts.url);
		}
		if (response.headers.hasOwnProperty('content-location') && (opts.url !== response.headers['content-location'])) {
			return followRedirect(response.headers['content-location'], opts.url);
		}

		if (initialRequest) {
			throw new Error('No redirect detected in unshorten');
		}

		return opts.url;
	}

	function followRedirect (redirLocation, prevUrl) {
		if (seenRedirects === maxRedirects) {
			throw new AddressError('Maximum number of allowed redirects reached');
		}
		seenRedirects++;

		return hostIsAllowed(redirLocation, conf, logger)
		.then(function (allowedUrl) {

			// Handle relative redirects
			var parsedUrl = urlParse.parse(allowedUrl);
			if (!parsedUrl.hostname) {
				allowedUrl = urlParse.resolve(prevUrl, allowedUrl);
				logger.log('trace/unshorten', 'Assembled relative redirect: ' + allowedUrl);
			}

			opts.url = allowedUrl;
			initialRequest = false;

			return preq(opts).then(detectRedirect);
		});
	}

	return hostIsAllowed(url, conf, logger)
	.then(function (allowedUrl) {
		opts.url = allowedUrl;

		return preq(opts)
		.then(detectRedirect)
		.catch(function (error) {
			logger.log('trace/unshorten', 'Caught at recursion: ' + error);
			throw error;
		});
	})
	.catch(function (error) {
		logger.log('trace/unshorten', 'Caught at top level' + error);
		throw error;
	});
});

module.exports = unshorten;

