/* eslint-disable no-prototype-builtins,no-use-before-define */

'use strict';

const AddressError = require('./hostIsAllowed').AddressError;
const hostIsAllowed = require('./hostIsAllowed').hostIsAllowed;
const preq = require('preq');
const urlParse = require('url');

/**
 * Follows redirects in a URL. Promise succeeds even if the url does not redirect anywhere;
 * Fails if any url in the redirect chain is not allowed (via hostIsAllowed)
 * @param  {string}  url        url trying to be unshortened
 * @param  {string}  userAgent  the User-Agent header to use
 * @param  {Object}  jar        the cookie jar to use for requests
 * @param  {Object}  conf       app config object
 * @param  {Object}  logger     logger object
 * @return {Object}             BBPromise for url
 */
function unshorten(url, userAgent, jar, conf, logger) {
    logger.log('trace/unshorten', `Unshortening: ${url}`);
    const opts = {
        followRedirect: false,
        headers: {
            'User-Agent': userAgent
        },
        jar,
        /* We don't use HEAD because we can't be sure that this verb will be
         * handled in the same manner as GET (i.e., the redirect may not be
         * returned).
         */
        method: 'get',
        uri: url
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
        logger.log('trace/unshorten',
            `No more redirects detected after ${seenRedirects} redirects, returning: ${opts.uri}`);
        return opts.uri;
    };

    const followRedirect = (redirLocation, prevUrl) => {  // jshint ignore:line
        logger.log('trace/unshorten', `Attempting to follow redirect: ${redirLocation}`);
        if (seenRedirects === maxRedirects) {
            throw new AddressError('Maximum number of allowed redirects reached');
        }
        seenRedirects++;

        return hostIsAllowed(redirLocation, conf, logger)
        .then((allowedUrl) => {

            // Handle relative redirects
            const parsedUrl = urlParse.parse(allowedUrl);
            if (!parsedUrl.hostname) {
                allowedUrl = urlParse.resolve(prevUrl, allowedUrl);
                logger.log('trace/unshorten', `Assembled relative redirect: ${allowedUrl}`);
            }

            opts.uri = allowedUrl;

            return preq(opts).then(detectRedirect);
        });
    };

    return hostIsAllowed(url, conf, logger)
    .then((allowedUrl) => {
        opts.uri = allowedUrl;

        return preq(opts)
        .then(detectRedirect)
        .catch((error) => {
            logger.log('trace/unshorten', `Caught at recursion: ${error}`);
            throw error;
        });
    })
    .catch((error) => {
        logger.log('trace/unshorten', `Caught at top level${error}`);
        throw error;
    });
}

module.exports = unshorten;
