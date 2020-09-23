/* eslint-disable no-prototype-builtins,no-use-before-define */

'use strict';

const AddressError = require('./hostIsAllowed').AddressError;
const hostIsAllowed = require('./hostIsAllowed').hostIsAllowed;
const urlParse = require('url');

/**
 * Follows redirects in a URL. Promise succeeds even if the url does not redirect anywhere;
 * Fails if any url in the redirect chain is not allowed (via hostIsAllowed)
 * @param  {string}  url        url trying to be unshortened
 * @param  {Object}  request    request object
 * @param  {Object}  jar        the cookie jar to use for requests
 * @param  {Object}  conf       app config object
 * @return {Object}             BBPromise for url
 */
function unshorten(url, request, jar, conf) {
    request.logger.log('debug/unshorten', `Unshortening: ${url}`);
    const opts = {
        followRedirect: false,
        jar,
        /* We don't use HEAD because we can't be sure that this verb will be
         * handled in the same manner as GET (i.e., the redirect may not be
         * returned).
         */
        method: 'get',
        uri: url,
    };

    let seenRedirects = 0;
    const maxRedirects = conf.maxRedirects || 5;

    const detectRedirect = (response) => {
        if (response.headers.hasOwnProperty('location') &&
                (opts.uri !== response.headers.location)) {
            return followRedirect(response.headers.location, opts.uri);
        }
        if (response.headers.hasOwnProperty('content-location') &&
                (opts.uri !== response.headers['content-location'])) {
            return followRedirect(response.headers['content-location'], opts.uri);
        }
        request.logger.log('debug/unshorten',
            `No more redirects detected after ${seenRedirects} redirects, returning: ${opts.uri}`);
        return opts.uri;
    };

    const followRedirect = (redirLocation, prevUrl) => {
        request.logger.log('debug/unshorten', `Attempting to follow redirect: ${redirLocation}`);
        if (seenRedirects === maxRedirects) {
            throw new AddressError('Maximum number of allowed redirects reached');
        }
        seenRedirects++;

        return hostIsAllowed(redirLocation, conf, request.logger)
        .then((allowedUrl) => {

            // Handle relative redirects
            const parsedUrl = urlParse.parse(allowedUrl);
            if (!parsedUrl.hostname) {
                allowedUrl = urlParse.resolve(prevUrl, allowedUrl);
                request.logger.log('debug/unshorten', `Assembled relative redirect: ${allowedUrl}`);
            }

            opts.uri = allowedUrl;

            return request.issueRequest(opts).then(detectRedirect);
        });
    };

    return hostIsAllowed(url, conf, request.logger)
    .then((allowedUrl) => {
        opts.uri = allowedUrl;

        return request.issueRequest(opts)
        .then(detectRedirect)
        .catch((error) => {
            request.logger.log('debug/unshorten', `Caught at recursion: ${error}`);
            throw error;
        });
    })
    .catch((error) => {
        request.logger.log('debug/unshorten', `Caught at top level${error}`);
        throw error;
    });
}

module.exports = unshorten;

