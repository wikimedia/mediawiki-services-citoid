'use strict';

/**
 * Validates domains in URLS supplied to the citoid service
 */

/* Import Modules */
var BBPromise = require('bluebird');
var dns = BBPromise.promisifyAll(require('dns'));
var ip = require('ip');
var net = require('net');
var urlParse = require('url');

function AddressError (message) {
	this.name = 'AddressError';
	this.message = message || 'Invalid host supplied';
	Error.captureStackTrace(this, AddressError);
}
AddressError.prototype = Object.create(Error.prototype);
AddressError.prototype.constructor = AddressError;

/**
 * Verify that requested URLs resolve to non-private IP addresses
 * @param  {String}  url     URL to be parsed and resolved
 * @param  {Object}  conf    app config object
 * @param  {Object}  logger  logger object
 * @return {Object}          BBPromise object
 */
var hostIsAllowed = BBPromise.method(function(url, conf, logger) {
	var self = this;

	if (conf.allowPrivateAddresses) {
		return url;
	}

	var parsedUrl = urlParse.parse(url);

	/* Return values other than a full URL as valid. This allows for use in
	 * validation of relative HTTP redirects, as in unshorten.
	 */
	if (!parsedUrl.hostname) {
		return url;
	}

	var allowedSchemes = ['http:', 'https:'];
	if (!allowedSchemes.includes(parsedUrl.protocol)) {
		logger.log('warn/hostIsAllowed', 'Rejected protocol: ' + parsedUrl.protocol);
		throw new AddressError();
	}

	var hostname = parsedUrl.hostname;

	if (net.isIP(hostname) !== 0) {
		if(ip.isPublic(hostname)) {
			logger.log('trace/hostIsAllowed', url + ' is public, and is allowed');
			return url;
		} else {
			logger.log('warn/hostIsAllowed', url + ' is not public, and is disallowed');
			throw new AddressError();
		}
	} else {
		logger.log('trace/hostIsAllowed', 'Resolving hostname ' + hostname);

		/* Implementation spec:
		 *
		 * Use dns.lookup(hostname) to resolve address which may be listed in
		 * /etc/hosts, then merge with results from dns.resolve(hostname, 'A', fn)
		 * and dns.resolve(hostname, 'AAAA', fn). Check (ip.isPublic(address)) all
		 * records in resulting array to verify that all are public.
		 */
		var addresses = [];

		return dns.lookupAsync(hostname)
		.then(function(params) {
			addresses.push(params[0]);
			logger.log('trace/hostIsAllowed', 'lookupAsync ran: ' + addresses);
			return hostname;
		})
		.then(dns.resolve4Async)
		.then(function(params) {
			// This push may result in a small number of duplicates
			Array.prototype.push.apply(addresses, params);
			logger.log('trace/hostIsAllowed', 'resolve4Async ran: ' + addresses);
			//addresses = addresses.concat(params);
			return hostname;
		})
		.then(dns.resolve6Async)
		.then(function(params) {
			Array.prototype.push.apply(addresses, params);
			logger.log('trace/hostIsAllowed', 'resolve6Async ran: ' + addresses);
		})
		.catch(function(err) {
			// NOTFOUND is included in the case of looking up a record from /etc/hosts
			var acceptableCodes = [dns.NODATA, dns.NOTFOUND];
			if (!acceptableCodes.includes(err.code) && addresses.length === 0) {
				logger.log('debug/hostIsAllowed', 'Error during DNS resolution: ' + err.code);
				throw new AddressError();
			}
		})
		.then(function() {
			logger.log('debug/hostIsAllowed', 'Resolved ' + hostname + ' to ' + addresses.join(', '));

			if(addresses.length !== 0 && addresses.every(ip.isPublic)) {
				logger.log('debug/hostIsAllowed', hostname + ' is public, and is allowed');
				return url;
			} else {
				logger.log('debug/hostIsAllowed', hostname + ' is not public or could not be resolved, and is disallowed');
				throw new AddressError();
			}

		});
	}

});

module.exports.hostIsAllowed = hostIsAllowed;
module.exports.AddressError = AddressError;
