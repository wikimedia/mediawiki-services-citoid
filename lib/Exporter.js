'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to a Zotero server
 */

/* Import Modules */
var BBPromise = require('bluebird');
var crypto = require('crypto');
var util = require('util');
var stripTags = require('striptags');

var pubMedRequest = require('./pubMedRequest.js');

//TODO: Remove
var defaultLogger;
var userAgent;

/**
 * Constructor for Exporter object
 * @param {Object} zoteroService ZoteroService object
 * @param {Object} logger        logger object, must have a log() method
 * @param {Object} stats         metrics object
 */
function Exporter(app){
	this.logger = app.logger;
	this.stats = app.metrics;

	this.zoteroService = null;

	defaultLogger = this.logger;
	userAgent = app.conf.userAgent;
}

Exporter.prototype.export = BBPromise.method(function(cr){
	var convert = this.selectFormatFcn(cr.format);
	if (!Array.isArray(cr.response.citation)){
		return BBPromise.reject('Expected cr.response.citation to be an Array');
	}
	if (!cr.response.citation[0]){
		return BBPromise.reject('No citation available to convert');
	}
	return convert(cr.response.citation[0], cr);
});

/**
 * Selects the format function given format string
 * @param  {String}   format   string describing format
 * @param  {Function}  		   convert(url, format, body)
 */
Exporter.prototype.selectFormatFcn = function (format) {
	var self = this;
	var formatFcns = {
		'mwDeprecated':self.convertToMWDeprecated,
		'mediawiki':self.convertToMediawiki,
		'zotero':self.convertToZotero,
		'bibtex':self.convertToBibtex
		};
	return formatFcns[format].bind(self);
};

/**
 * Specific Conversion Methods
 *
 * These methods should fill the body of the CitoidResponse object as they are
 * the final step before passing to the app.
 */

/**
 * Takes Zotero output and standardises it
 * @param  {Object}   citation    cr.response.citation[0]
 * @param  {Object}   cr          CitoidResponse object
 * @return {Object}               BBPromise for CitoidResponse object
 */
Exporter.prototype.convertToZotero = BBPromise.method(function(citation, cr){
	cr.response.body = cr.response.citation;
	return cr;
});

/**
 * Takes Zotero output, standardises, and exports to BibTex
 * TODO: Use to take any Zotero output format
 * @param  {Object}   citation    cr.response.citation[0]
 * @param  {Object}   cr          CitoidResponse object
 * @return {Object}               BBPromise for CitoidResponse object
 */
Exporter.prototype.convertToBibtex = BBPromise.method(function(citation, cr){
	var zoteroService = this.zoteroService;

	// Run on cr for export failure
	function reject(cr){
		var format = cr.format;
		var message  = "Unable to serve " + format + " format at this time";
		var error = {Error: message};
		cr.logger.log('trace/zotero', message);
		cr.response.error = error;
		cr.response.responseCode = 404; // 404 error if cannot translate into alternate format
		cr.response.body = error;
		return cr;
	}

	return zoteroService.zoteroExportRequest([citation], cr.format).then(
		function(response){
			// Don't reset response code; could be 520 or 200
			cr.response.body = response.body.toString();
			return cr;
		},
		// Rejection handler
		function(response){
			return reject(cr);
		});

});

/**
 * Takes Zotero output and converts to 'mediawiki' format
 * @param  {Object}   citationPointer    cr.response.citation[0]
 * @param  {Object}   cr                 CitoidResponse object
 * @return {Object}                      BBPromise for CitoidResponse object
 */
Exporter.prototype.convertToMediawiki = BBPromise.method(function(citationPointer, cr){
	// Don't directly modify cr.response.citation, this should remain in zotero format only.
	var citation = Object.assign({}, citationPointer);

	citation = replaceCreators(citation);
	citation = fixISBN(citation);
	citation = fixISSN(citation);

	return addIDSToCitation(cr, citation).then(function(cit){
		cr.response.body = [cit];
		return cr;
	});

});

/**
 * Takes Zotero output and converts to 'mwDeprecated' format
 * @param  {Object}   citationPointer    cr.response.citation[0]
 * @param  {Object}   cr                 CitoidResponse object
 * @return {Object}                      BBPromise for CitoidResponse object
 */
Exporter.prototype.convertToMWDeprecated = BBPromise.method(function(citationPointer, cr){
	// Don't directly modify cr.response.citation, this should remain in zotero format only.
	var citation = Object.assign({}, citationPointer);
	var creatorTypeCount = {};

	var zotCreators;
	var creatorFieldName;

	function fixCreatorsMW(citation) {
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
		return citation;
	}

	citation = fixCreatorsMW(citation);

	return addIDSToCitation(cr, citation).then(function(cit){
		cr.response.body = [cit];
		return cr;
	});

});

/* Methods for Particular Fields in Citation Object*/

/**
 * Remove creators and add 2D array of fname, lname keyed by creatorType
 * Used to convert to 'mediawiki' format
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
 function replaceCreators(citation){
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
	return citation;
}

/**
 * Add PMID, PMCID, and DOI fields from the extra field or through PMID, PMCID or DOI lookup
 * @param  {Object}   citation citation object to add PMID
 * @return {Object}   promise for citation object
 */
var addPubMedIdentifiers = BBPromise.method(function(citation){
	// Try to get PMCID or PMID from extra field
	if ((!citation.PMCID || !citation.PMID) && citation.extra) {
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

	if ((citation.PMID !== undefined && citation.PMCID !== undefined && citation.DOI !== undefined) || // All IDs present
		(citation.PMID === undefined && citation.PMCID === undefined && citation.DOI === undefined)) { // No IDs present
		return citation;
	}

	// Fill in remaining IDs from pubmed api
	return pubMedRequest((citation.DOI || citation.PMCID || citation.PMID), userAgent, defaultLogger).then(function(results){
		if (!citation.PMID && results.records[0].pmid){
			citation.PMID = results.records[0].pmid;
		}
		if (!citation.PMCID && results.records[0].pmcid) {
			citation.PMCID = results.records[0].pmcid.replace('PMC','');
		}
		if (!citation.DOI && results.records[0].doi) {
			citation.DOI = results.records[0].doi;
		}
		return citation;
	}, function(){
		return citation; //Unhandled rejection
	});

});

/**
 * Add URL provided by user if none in Zotero response
 * @param  {String}   url      url provided by user
 * @param  {Object}   citation citation object to add PMID
 * @return {Object}   citation     citation object
 */
function fixURL(url, citation){
	if (!citation.url){
		citation.url = url;
	}
	return citation;
}

/**
 * Replace Zotero output of CURRENT_TIMESTAMP with ISO time
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function fixAccessDate(citation){
	if (!citation.accessDate || (citation.accessDate === "CURRENT_TIMESTAMP")){
		citation.accessDate = (new Date()).toISOString().substring(0, 10);
	}
	return citation;
}

/**
 * Convert String of ISSNs into an Array of ISSNs
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function fixISSN(citation){
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
	return citation;
}

/**
 * Convert String of ISBNs into an Array of ISBNs
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function fixISBN(citation){
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
	return citation;
}

/**
 * Validate language codes
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function fixLang(citation){
	if (citation.language) {
		citation.language = citation.language.replace('_', '-');
		if (!/^[a-z]{2}(?:-?[a-z]{2,})*$/i.test(citation.language)){
			delete citation.language;
		}
	}
	return citation;
}

/* Methods for cleaning out specific output types (i.e. from Zotero) */

/**
 * Validates Zotero fields and augments data based on CitoidRequest
 * object
 *
 * @param  {String} url  Requested URL from zotero service- not always from cr
 * @param  {Object} cr   Instance of CitoidRequest object
 * @return {Object}      Promise for CitoidRequest object
 */
var validateZotero = BBPromise.method(function(url, cr){
	var citation = cr.response.citation[0];

	stripCitation(citation);
	fixURL(url, citation);
	fixAccessDate(citation);
	fixLang(citation);
	fixDate(citation);

	//TODO: Possibly validate ISSN & ISBN / throw out duplicates

	//TODO: Add DOI to zotero citation for types journalArticle and conferencePaper
	return cr;

});


/**
 * Add all identifiers in CitoidRequest to an intermediate
 * converted citation that will be added to body
 * @param  {Object} cr       CitoidRequest object
 * @param  {Object} citation citation object
 * @return {Object}          citation object
 */
var addIDSToCitation = BBPromise.method(function(cr, citation){

	// Set requested identifier as part of citation
	if (!citation[cr.idType.toUpperCase()]) {
		citation[cr.idType.toUpperCase()] = cr.idValue;
	}

	// Try to get doi from cr.doi
	if (!citation.DOI && cr.doi){
		citation.DOI = cr.doi;
	}

	return addPubMedIdentifiers(citation);

});

/**
 * Strip html style tags out of top level field values
 * TODO: Check structured creators field as well
 * @param  {Object} citation Zotero citation
 * @return {Object}          Clean Zotero citation
 */
function stripCitation(citation){
	var value;
	Object.keys(citation).forEach(function(key) {
		value = citation[key];
		if (typeof value === 'string'){
			citation[key] = stripTags(value);
		}
	});
	return citation;
}

/**
 * If date cannot be converted to ISO, delete
 * @param  {Object} citation Zotero citation
 * @return {Object}          Zotero citation
 */
function fixDate(citation){
	if (citation.date){
		var d = new Date(citation.date + ' GMT+00'); // Explicitly set TZ to GMT for servers not running in GMT
		if (isFinite(d)) {
			citation.date = d.toISOString().split('T').shift();
		} else {
			delete citation.date;
		}
	}
	return citation;
}

/* Exports */
module.exports = Exporter;
module.exports.validateZotero = validateZotero;
module.exports.addPubMedIdentifiers = addPubMedIdentifiers;
module.exports.fixDate = fixDate;

