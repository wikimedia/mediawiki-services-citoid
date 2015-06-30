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
var preq = require('preq');

var pubMedRequest = require('./pubMedRequest.js');

//TODO: Remove
var defaultLogger;

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
 * @return {Object}               BBPromise for array of citations
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
 * @return {Object}               BBPromise for array of citations
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
 * @return {Object}                      BBPromise for array of citations
 */
Exporter.prototype.convertToMediawiki = BBPromise.method(function(citationPointer, cr){
	// Don't directly modify cr.response.citation, this should remain in zotero format only.
	var citation = Object.assign({}, citationPointer);

	citation = replaceCreators(citation);
	citation = fixISBN(citation);
	citation = fixISSN(citation);

	cr.response.body = [citation];
	return cr;

});

/**
 * Takes Zotero output and converts to 'mwDeprecated' format
 * @param  {Object}   citationPointer    cr.response.citation[0]
 * @param  {Object}   cr                 CitoidResponse object
 * @return {Object}                      BBPromise for array of citations
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

	cr.response.body = [citation];
	return cr;
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
 * Add PMID and PMCID fields from the extra field or through DOI lookup
 * @param  {Object}   citation citation object to add PMID
 * @return {Object}   promise for citation object
 */
var addPubMedIdentifiers = BBPromise.method(function(citation){
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
		return citation;
	// TODO: make this work for any pubmed id, i.e. add doi from pubmed id.
	} else if (!citation.PMID && citation.DOI) {
		//if pmid is not found, lookup the pmid using the DOI
		return pubMedRequest(citation.DOI, defaultLogger).then(function(object){
			if (object.records[0].pmid){
				citation['PMID'] = object.records[0].pmid;
			}
			if (object.records[0].pmcid) {
				citation['PMCID'] = object.records[0].pmcid.replace('PMC','');
			}
			return citation;
		}, function(){
			return citation; //Unhandled rejection
		})
		.catch(function(error){
			return citation;
		});
	} else {
		return citation;
	}
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

	return addIDSToCitation(cr);

});


/**
 * Add all identifiers in CitoidRequest to the citation in
 * cr.response.citation[0]
 * @param  {Object} cr CitoidRequest object
 * @return {Object}    Promise for CitoidRequest object instance
 */
var addIDSToCitation = BBPromise.method(function(cr){
	var citation = cr.response.citation[0];

	// Set requested identifier as part of citation
	if (!citation[cr.idType.toUpperCase()]) {
		citation[cr.idType.toUpperCase()] = cr.idValue;
	}

	// Try to get doi from url
	if (!citation.DOI){
		var reDOI = new RegExp('\\b10\\.?[0-9]{3,4}(?:[.][0-9]+)*/.*');
		var matchDOI = citation.url.match(reDOI);
		// TODO: Actually resolve to make sure DOI is valid; separate function out from requestFromDOI
		// Could potentially skip this if we know it's dx.doi.org
		// Some links will be false positive if doi is in the middle of url since there's no way to signal end of doi
		if (matchDOI && matchDOI[0]) { citation.DOI = matchDOI[0]; }

	}

	return addPubMedIdentifiers(citation).then(function(){
		return cr;
	});

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
module.exports.addIDSToCitation = addIDSToCitation;


