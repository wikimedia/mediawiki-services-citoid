'use strict';

/**
 * Validates domains in URLS supplied to the citoid service
 */

/* Import Modules */
const BBPromise = require('bluebird');
const dns = BBPromise.promisifyAll(require('dns'));
const ip = require('ip');
const net = require('net');
const urlParse = require('url');

function AddressError(message) {
    this.name = 'AddressError';
    this.message = message || 'Invalid host supplied';
    Error.captureStackTrace(this, AddressError);
}
AddressError.prototype = Object.create(Error.prototype);
AddressError.prototype.constructor = AddressError;

/**
 * Verify that requested URLs resolve to non-private IP addresses
 *
 * @param  {string}  url            URL to be parsed and resolved
 * @param  {Object}  conf           app config object
 * @param  {Object}  logger         logger object
 * @param  {Object}  [requiresHost] if true, rejects urls missing hostname
 * @return {Object}                 BBPromise object
 */
const hostIsAllowed = BBPromise.method((url, conf, logger, requiresHost) => {

    const parsedUrl = urlParse.parse(url);

    /* Return values other than a full URL as valid by default unless
     * requiresHost is set to true. This allows for use in
     * validation of relative HTTP redirects, as in unshorten.
     */
    if (!parsedUrl.hostname) {
        if (requiresHost) {
            throw new AddressError();
        } else {
            return url;
        }
    }

    if (conf.allowPrivateAddresses) {
        return url;
    }

    const allowedSchemes = [ 'http:', 'https:' ];
    if (!allowedSchemes.includes(parsedUrl.protocol)) {
        logger.log('warn/hostIsAllowed', `Rejected protocol: ${parsedUrl.protocol}`);
        throw new AddressError();
    }

    const hostname = parsedUrl.hostname;

    if (net.isIP(hostname) !== 0) {
        if (ip.isPublic(hostname)) {
            logger.log('trace/hostIsAllowed', `${url} is public, and is allowed`);
            return url;
        } else {
            logger.log('warn/hostIsAllowed', `${url} is not public, and is disallowed`);
            throw new AddressError();
        }
    } else {
        logger.log('trace/hostIsAllowed', `Resolving hostname ${hostname}`);

        /* Implementation spec:
         *
         * Use dns.lookup(hostname) to resolve address which may be listed in
         * /etc/hosts, then merge with results from dns.resolve(hostname, 'A', fn)
         * and dns.resolve(hostname, 'AAAA', fn). Check (ip.isPublic(address)) all
         * records in resulting array to verify that all are public.
         */
        const addresses = [];

        return dns.lookupAsync(hostname)
            .then((params) => {
                addresses.push(params[0]);
                logger.log('trace/hostIsAllowed', `lookupAsync ran: ${addresses}`);
                return hostname;
            })
            .then(dns.resolve4Async)
            .then((params) => {
            // This push may result in a small number of duplicates
                Array.prototype.push.apply(addresses, params);
                logger.log('trace/hostIsAllowed', `resolve4Async ran: ${addresses}`);
                // addresses = addresses.concat(params);
                return hostname;
            })
            .then(dns.resolve6Async)
            .then((params) => {
                Array.prototype.push.apply(addresses, params);
                logger.log('trace/hostIsAllowed', `resolve6Async ran: ${addresses}`);
            })
            .catch((err) => {
            // NOTFOUND is included in the case of looking up a record from /etc/hosts
                const acceptableCodes = [ dns.NODATA, dns.NOTFOUND ];
                if (!acceptableCodes.includes(err.code) && addresses.length === 0) {
                    logger.log('debug/hostIsAllowed', `Error during DNS resolution: ${err.code}`);
                    throw new AddressError();
                }
            })
            .then(() => {
                logger.log('debug/hostIsAllowed', `Resolved ${hostname} to ${addresses.join(', ')}`);

                if (addresses.length !== 0 && addresses.every(ip.isPublic)) {
                    logger.log('debug/hostIsAllowed', `${hostname} is public, and is allowed`);
                    return url;
                } else {
                    logger.log('debug/hostIsAllowed',
                        `${hostname} is not public or could not be resolved, and is disallowed`);
                    throw new AddressError();
                }

            });
    }

});

module.exports.hostIsAllowed = hostIsAllowed;
module.exports.AddressError = AddressError;
