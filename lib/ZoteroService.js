#!/usr/bin/env node
/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to a Zotero server
 */

/* Import Modules */
var	async = require('async'),
	crypto = require('crypto'),
	request = require('request'),
	util = require('util'),
	pubMedRequest = require('./pubMedRequest.js');

function ZoteroService(citoidConfig, logger){
	this.log = logger;
	var baseURL = util.format('http://%s:%s/',
		citoidConfig.zoteroInterface, citoidConfig.zoteroPort.toString());
	this.webURL = baseURL + 'web';
	this.exportURL = baseURL + 'export';
}

/**
 * Requests to Zotero server endpoint /web
 * @param  {String}   requestedURL url being requested
 * @param  {Object}   format         options for request
 * @param  {Function} callback     callback(error, response, body)
 */
ZoteroService.prototype.zoteroWebRequest = function(requestedURL, format, callback){

	var zoteroService = this,
		sessionID = crypto.randomBytes(20).toString('hex'),
		options = {
		url: this.webURL,
		method: 'POST',
		json: {
			"url": requestedURL,
			"sessionid": sessionID
		}
	};

	request(options, function (error, response, body) {
		if (!error && response.statusCode === 200) {
			zoteroService.selectFormatFcn(format, function(convert){
				convert(requestedURL, format, body, function(modifiedBody){
					callback(error, response, modifiedBody);
				});
			});
		} else {
			callback(error, response, body);
		}

	});
};

/**
 * Request to Zotero server endpoint /export
 * @param  {Object}   citation     Zotero JSON citation to be converted
 * @param  {Object}   format         options for request
 * @param  {Function} callback     callback(error, responseCode, body)
 */
ZoteroService.prototype.zoteroExportRequest = function(citation, format, callback){
	var options = {
		url: this.exportURL,
		method: 'POST',
		body: JSON.stringify([citation]),
		qs: {format: format},
		headers: {
			'content-type': 'application/json'
		}
	};

	request.post(options, function(error, response, body) {
		if (error){
			callback(error, null, body);
		} else {
			callback(null, response.statusCode, body);
		}
	});
};

/**
 * Selects the format function given format string
 * @param  {String}   format   string describing format
 * @param  {Function} callback callback(desiredFunctionHere)
 */
ZoteroService.prototype.selectFormatFcn = function (format, callback){
	var self = this,
		formatFcns = {
		'mwDeprecated':self.convertToMWDeprecatedAsync,
		'mediawiki':self.convertToMediawikiAsync,
		'zotero':self.convertToZoteroAsync,
		'bibtex':self.convertToBibtexAsync
		};
	callback(formatFcns[format].bind(self));
};

/* Specific Conversion Methods */

/**
 * Takes Zotero output and standardises it
 * @param  {String}   url      URL provided by user
 * @param  {Object}   format   requested format
 * @param  {Array}    body     Array of citation objects
 * @param  {Function} callback callback(arrayOfCitationObjs)
 */
ZoteroService.prototype.convertToZoteroAsync = function(url, format, body, callback){
	var citation = body[0];
	if (citation instanceof Array){
		citation = citation[0];
	}

	async.waterfall([
		function(cb){ //this function exists to pass url to fixURLAsync
			cb(null, url, citation);
		},
		fixURL, //must go directly after unnamed function that hands it url
		fixAccessDate
	], function (err, citation) {
		callback([citation]);
	});

};

/**
 * Takes Zotero output, standardises, and exports to BibTex
 * @param  {String}   url      URL provided by user
 * @param  {Object}   format   requested format
 * @param  {Array}    body     Array of citation objects
 * @param  {Function} callback callback(arrayOfCitationObjs)
 */
ZoteroService.prototype.convertToBibtexAsync = function(url, format, body, callback){
	var zoteroService = this,
		citation = body[0];
	if (citation instanceof Array) {
		citation = citation[0];
	}

	async.waterfall([
		function(cb){ //this function exists to pass url to fixURLAsync
			cb(null, url, citation);
		},
		fixURL, //must go directly after unnamed function that hands it url
		fixAccessDate,
		function(citation, cb){
			zoteroService.zoteroExportRequest(citation, format, function(error, responseCode, body){
				cb(error, body);
			});
	}], function (err, citation) {
		callback(citation);
	});
};

/**
 * Takes Zotero output and converts to 'mediawiki' format
 * @param  {String}   url      URL provided by user
 * @param  {Object}   format   requested format
 * @param  {Array}    body     Array of citation objects
 * @param  {Function} callback callback(arrayOfCitationObjs)
 */
ZoteroService.prototype.convertToMediawikiAsync = function(url, format, body, callback){
	var citation = body[0];
	if (citation instanceof Array){
		citation = citation[0];
	}

	async.waterfall([
		function(cb){ //this function exists to pass url to fixURLAsync
			cb(null, url, citation);
		},
		fixURL, //must go directly after unnamed function that hands it url
		fixAccessDate,
		replaceCreators,
		addPubMedIdentifiers,
		fixISBN,
		fixISSN,
		fixLang
	], function (err, citation) {
		callback([citation]);
	});
};

/**
 * Takes Zotero output and converts to 'mwDeprecated' format
 * @param  {String}   url      URL provided by user
 * @param  {Object}   format   requested format
 * @param  {Array}    body     Array of citation objects
 * @param  {Function} callback callback(arrayOfCitationObjs)
 */
ZoteroService.prototype.convertToMWDeprecatedAsync = function(url, format, body, callback){
	var zotCreators, creatorFieldName,
		creatorTypeCount = {},
		citation = body[0];
	if (citation instanceof Array){
		citation = citation[0];
	}

	async.waterfall([
		function(cb){ //this function exists to pass url to fixURLAsync
			cb(null, url, citation);
		},
		fixURL, //must go directly after unnamed function that hands it url
		function(citation, cb){ //function to fix creators to mwdeprecated format
			if (citation.creators) {
				zotCreators = citation.creators;

				for (var z in zotCreators){
					creatorFieldName = zotCreators[z].creatorType;
					if (creatorTypeCount[creatorFieldName]){
						creatorTypeCount[creatorFieldName] += 1;
					} else {
						creatorTypeCount[creatorFieldName] = 1;
					}
					//Appends number to name, i.e. author -> author1
					creatorFieldName += (parseInt(creatorTypeCount[creatorFieldName]));

					citation[creatorFieldName + "-first"] = zotCreators[z].firstName;
					citation[creatorFieldName + "-last"] = zotCreators[z].lastName;
				}
				delete citation.creators; //remove creators field
			}
			cb(null, citation);
		},
		fixAccessDate,
		replaceCreators,
		addPubMedIdentifiers
	], function (err, citation) {

		callback([citation]);
	});

};

/* Methods for Particular Fields in Citation Object*/

/**
 * Remove creators and add 2D array of fname, lname keyed by creatorType
 * Used to convert to 'mediawiki' format
 * @param  {Object}   citation     citation object
 * @param  {Function} callback     callback on citation object
 */
 function replaceCreators(citation, callback){
	if (citation.creators) {
		var creatorArray, creatorFieldName,
			zotCreators = citation.creators;

		for (var z in zotCreators){
			creatorFieldName = zotCreators[z].creatorType;

			if (!citation[creatorFieldName]){
				creatorArray = [];
				citation[creatorFieldName]= creatorArray;
			}

			citation[creatorFieldName].push([zotCreators[z].firstName, zotCreators[z].lastName]);
		}

		delete citation.creators; //remove creators field
	}
	callback(null, citation);
}

/**
 * Add PMID and PMCID fields from the extra field or through DOI lookup
 * @param  {Object}   citation citation object to add PMID
 * @param  {Function} callback callback (error, citation)
 */
function addPubMedIdentifiers(citation, callback){
	if (citation.extra) {
		//get pmid from extra fields
		var extraFields = citation.extra.split('\n');
		for (var f in extraFields) {
			//could add them all, but let's not do this in case of conflicting fields
			var keyValue = extraFields[f].split(': ');
			if (keyValue[0] === 'PMID' || keyValue[0] === 'PMCID') {
				citation[keyValue[0]] = keyValue[1].trim().replace('PMC','');
			}
		}
	}

	if (!citation.PMID && citation.DOI) {
		//if pmid is not found, lookup the pmid using the DOI
		pubMedRequest(citation.DOI, function (error, object){
			if (!error) { //don't pass along error as it's non-critical, and will halt the waterfall
				if (object.records[0].pmid){
					citation['PMID'] = object.records[0].pmid;
				}
				if (object.records[0].pmcid) {
					citation['PMCID'] = object.records[0].pmcid.replace('PMC','');
				}
			}
			callback(null, citation);
		});
	} else {
		callback(null, citation);
	}
}

/**
 * Add URL provided by user if none in Zotero response
 * @param  {String}   url      url provided by user
 * @param  {Object}   citation citation object to add PMID
 * @param  {Function} callback callback (error, citation)
 */
function fixURL(url, citation, callback){
	if (!citation.url){
		citation.url = url;
	}
	callback(null, citation);
}

/**
 * Replace Zotero output of CURRENT_TIMESTAMP with ISO time
 * @param  {Object}   citation     citation object
 * @param  {Function} callback     callback(error, citation)
 */
function fixAccessDate(citation, callback){
	if (!citation.accessDate || (citation.accessDate === "CURRENT_TIMESTAMP")){
		citation.accessDate = (new Date()).toISOString().substring(0, 10);
	}
	callback(null, citation);
}

/**
 * Convert String of ISSNs into an Array of ISSNs
 * @param  {Object}   citation     citation object
 * @param  {Function} callback     callback(error, citation)
 */
function fixISSN(citation, callback){
	var match, i, reISSN,
		issn = citation.ISSN;

	reISSN = new RegExp('\\d{4}\\-\\d{3}[\\dX]', 'g');

	if (issn){
		issn.trim();
		match = issn.match(reISSN);
		if (match) {
			citation.ISSN = [];
			for (i in match){
				citation.ISSN.push(match[i]);
			}
		} else {
			citation.ISSN = [issn]; //wraps issn field in array in case of false negatives
		}
	}
	callback(null, citation);
}

/**
 * Convert String of ISBNs into an Array of ISBNs
 * @param  {Object}   citation     citation object
 * @param  {Function} callback     callback(error, citation)
 */
function fixISBN(citation, callback){
	var match, i, reISBN,
		isbn = citation.ISBN;

	reISBN = new RegExp('((978[\\--– ])?[0-9][0-9\\--– ]{10}[\\--– ][0-9xX])|((978)?[0-9]{9}[0-9Xx])', 'g');

	if (isbn) {
		isbn.trim();
		match = isbn.match(reISBN);
		if (match) {
			citation.ISBN = [];
			for (i in match){
				citation.ISBN.push(match[i]);
			}
		} else {
			citation.ISBN = [isbn]; //wraps isbn field in array in case of false negatives
		}
	}
	callback(null, citation);
}

/**
 * Validate language codes
 * @param  {Object}   citation     citation object
 * @param  {Function} callback     callback(error, citation)
 */
function fixLang(citation, callback){
	if (citation.language) {
		citation.language = citation.language.replace('_', '-');
		if (!/^[a-z]{2}(?:-?[a-z]{2,})*$/i.test(citation.language)){
			delete citation.language;
		}
	}
	callback(null, citation);
}

/* Exports */
module.exports = ZoteroService;

