'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to a Zotero server
 */

/* Import Modules */
var BBPromise = require('bluebird');
var chrono = require('chrono-node');
var crypto = require('crypto');
var extend = require('extend');
var stripTags = require('striptags');
var urlParse = require('url');
var util = require('util');

/* Local Modules */
var CachedTypes = require('./zotero/cachedTypes.js');
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

    this.types = new CachedTypes();

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
 * @param  {Function}          convert(url, format, body)
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
    var citation = extend(true, {}, citationPointer);
    var self = this;
    citation = replaceCreators(citation);
    citation = fixISBN(citation);
    citation = fixISSN(citation);

    cr.response.body = [citation]; // Put modified citation in body field

    return addIDSToCitation(cr).then(function(citoidRequest){
        // Convert to baseFields if this was in the request
        if (citoidRequest.baseFields){
            citoidRequest.response.body[0] = self.convertToBaseFields(citoidRequest.response.body[0]);
        }
        if (citoidRequest.response.source && (citoidRequest.response.source.length > 0)){ // Only add source field if one or more source listed
            citoidRequest.response.body[0].source = citoidRequest.response.source; // Add sources field to citation body
        }
        return citoidRequest;
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
    var citation = extend(true, {}, citationPointer);
    var creatorTypeCount = {};

    var zotCreators;
    var creatorFieldName;

    function fixCreatorsMW(citation) {
        if (citation.creators) {
            zotCreators = citation.creators;
            for (var z in zotCreators) {
                creatorFieldName = zotCreators[z].creatorType;
                if (creatorTypeCount[creatorFieldName]){
                    creatorTypeCount[creatorFieldName] += 1;
                } else {
                    creatorTypeCount[creatorFieldName] = 1;
                }
                //Appends number to name, i.e. author -> author1
                creatorFieldName += (parseInt(creatorTypeCount[creatorFieldName]));
                if (zotCreators[z].firstName){
                    citation[creatorFieldName + "-first"] = zotCreators[z].firstName;
                }
                if (zotCreators[z].firstName){
                    citation[creatorFieldName + "-last"] = zotCreators[z].lastName;
                } else if (zotCreators[z].name){
                    citation[creatorFieldName + "-last"] = zotCreators[z].name;
                }
            }
            delete citation.creators; //remove creators field
        }
        return citation;
    }

    citation = fixCreatorsMW(citation);

    cr.response.body = [citation]; // Add citation to body before sending to the below function which further fixes body
    return addIDSToCitation(cr);

});

/**
 * Convert all the specific fields names to the base field
 * names in a Zotero citation, i.e. websiteTitle -> publicationTitle
 * TODO: Currently has both fields in for backwards compatibility- remove
 * @param  {Object} citation Zotero citation
 * @return {Object}          Zotero citation
 */
Exporter.prototype.convertToBaseFields = function(citation){
    var types =  this.types;
    var baseFields = types.getBaseFields(citation.itemType);
    Object.keys(baseFields).forEach(function(field){
        if (citation[field]){
            // Add base field to citation as well
            citation[baseFields[field]] = citation[field];
        }
    });
    return citation;
};

/* Methods for Particular Fields in Citation Object*/

/**
 * Remove creators and add 2D array of fname, lname keyed by creatorType
 * Used to convert to 'mediawiki' format
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
 function replaceCreators(citation){
    if (citation.creators) {
        var creator;
        var creatorFieldName;
        var zotCreators = citation.creators;

        for (var z = 0; z < zotCreators.length; z++) {
            creatorFieldName = zotCreators[z].creatorType;

            // Only add the creator to the list if either a firstName, lastName, or name is present
            if (zotCreators[z].firstName || zotCreators[z].lastName || zotCreators[z].name){
                creator = []; // List containing [firstName, lastName]

                if (zotCreators[z].firstName){
                    creator[0] = zotCreators[z].firstName; // Set first element of creator list to firstName
                } else {
                    creator[0] = ''; // Otherwise, empty string
                }

                if (zotCreators[z].lastName){
                    creator[1] = zotCreators[z].lastName; // Set second element of creator list to lastName
                } else if (zotCreators[z].name){ // Set lastName to value of name
                    creator[1] = zotCreators[z].name;
                } else {
                    creator[1] = ''; // If there is no lastName, empty string
                }

                if (!citation[creatorFieldName]){
                    citation[creatorFieldName] = [];
                }
                citation[creatorFieldName].push(creator); // Add creator list [firstName, lastName] to the list of creators.
            }
        }

        delete citation.creators; //remove creators field
    }
    return citation;
}

/**
 * Add PMID, PMCID, and DOI fields from the extra field or through PMID, PMCID or DOI lookup
 * @param  {Object}   cw      citoidRequest object to add PMID
 * @return {Object}   promise for citoidRequest object
 */
var addPubMedIdentifiers = BBPromise.method(function(cr){
    var citation = cr.response.citation[0];
    var gotData = false; // Whether or not we retrieved any useful data from PubMed

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
        return cr;
    }

    // Fill in remaining IDs from pubmed api
    return pubMedRequest((citation.DOI || citation.PMCID || citation.PMID), userAgent, defaultLogger).then(function(results){
        if (!citation.PMID && results.records[0].pmid){
            gotData = true;
            citation.PMID = results.records[0].pmid;
        }
        if (!citation.PMCID && results.records[0].pmcid) {
            gotData = true;
            citation.PMCID = results.records[0].pmcid.replace('PMC','');
        }
        if (!citation.DOI && results.records[0].doi) {
            gotData = true;
            citation.DOI = results.records[0].doi;
        }
        if ((cr.response.source.indexOf('PubMed') === -1) && gotData){ // Only add if PubMed not already in source Array
            cr.response.source.push('PubMed'); // Add pubmed to source list as we retrieved data from there
        }
        return cr;
    }, function(){
        return cr; //Unhandled rejection
    });

});

/**
 * Add URL provided by user if none in Zotero response
 * @param  {String}   url      alternate url provided by user
 * @param  {Object}   citation citation object to add PMID
 * @return {Object}   citation     citation object
 */
function fixURL(url, citation){

    if (citation.url){
        var parsed = urlParse.parse(citation.url);

        // Add http protocol if lacks protocol
        if (!parsed.protocol){
            parsed = urlParse.parse('http://' + citation.url);
        }

        citation.url = (parsed.hostname || parsed.host) ? urlParse.format(parsed) : url;

    // Use alternate url if url missing
    } else {citation.url = url;}
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
    var match;
    var i;
    var reISSN = new RegExp('\\d{4}\\-\\d{3}[\\dX]', 'g');
    var issn = citation.ISSN;

    if (issn){
        match = issn.trim().match(reISSN);
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

function validateISSN(issn) {
    var match;
    var reISSN = new RegExp('\\d{4}\\-\\d{3}[\\dX]', 'g');
    if (!issn){return false;}
    match = issn.trim().match(reISSN);
    if (match) {
        return match[0];
    } else {
        return false;
    }
}

/**
 * Convert String of ISBNs into an Array of ISBNs
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function fixISBN(citation){
    var match;
    var i;
    var isbn = citation.ISBN;
    var reDash = new RegExp('[\\-–]', 'g');
    var reISBN = new RegExp('((978 ?)[0-9]{10}|[0-9]{9}[0-9xX])', 'g');

    if (isbn) {
        // Clean up ISBN so we can parse it easier
        isbn = isbn.trim().replace(reDash, '');

        match = isbn.match(reISBN);
        if (match) {
            citation.ISBN = [];
            for (i in match){
                var isbnMatch = match[i];
                isbnMatch = isbnMatch.replace(/ /g, ''); // Remove any spaces (e.g. 978 0810935310)
                citation.ISBN.push(isbnMatch);
            }
        } else {
            citation.ISBN = [isbn]; //wraps isbn field in array in case of false negatives
        }
    }
    return citation;
}

function validateISBN(isbn){
    var match;
    var isbnMatch;
    var reDash = new RegExp('[\\-–]', 'g');
    var reISBN = new RegExp('((978 ?)[0-9]{10}|[0-9]{9}[0-9xX])', 'g');

    if (!isbn){return false;}

    match = isbn.trim().replace(reDash, '').match(reISBN);
    if(!match){return false;}
    return match[0].replace(/ /g, '');
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
    delete citation.itemKey;
    delete citation.itemVersion;
    citation = stripCitation(citation);
    citation = fixURL(url, citation);
    citation = fixAccessDate(citation);
    citation = fixLang(citation);
    citation = fixDate(citation);
    citation = fixPages(citation);

    //TODO: Possibly validate ISSN & ISBN / throw out duplicates

    //TODO: Add DOI to zotero citation for types journalArticle and conferencePaper
    return cr;

});


/**
 * Add all identifiers in CitoidRequest to an intermediate
 * converted citation currently in body Array.
 * @param  {Object} cr       CitoidRequest object
 * @param  {Object} citation citation object
 * @return {Object}          CitoidRequest object
 */
var addIDSToCitation = BBPromise.method(function(cr){
    // Fill body if not done already
    if (!cr.response.body || !cr.response.body[0]){ // If body is null or empty array, set to citation field
        cr.response.body = cr.response.citation;
    }
    // Pointer for code clarity
    var citation = cr.response.body[0];

    // Set requested identifier as part of citation
    if (cr.idType !== 'url' && !citation[cr.idType.toUpperCase()]) {
        citation[cr.idType.toUpperCase()] = cr.idValue;
    }

    // Add OCLC number if present
    if (cr.oclc) {
        citation.oclc = cr.oclc;
    }

    // Try to get doi from cr.doi
    if (!citation.DOI && cr.doi){
        citation.DOI = cr.doi;
    }

    return addPubMedIdentifiers(cr);

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
        try {
            var d;
            // Try to parse with chrono first
            var p = chrono.parse(citation.date); // Create ParsedResult object with chrono
            if (p && p[0] && p[0].start){
                p[0].start.assign('timezoneOffset', 0); // Remove timezone offset so that the user-observed date doesn't change based on offset
                d = p[0].start.date(); // Create a Date object from ParsedComponents Object
            } else {
                // Try to parse with Date.parse() as fallback; chrono doesn't seem to work with ambigious dates, such as '2010'
                d = new Date(citation.date + (/[0-9]T[0-9]/.test(citation.date) ? '' : ' GMT+00')); // Explicitly set to GMT time to avoid offset issue
            }

            // Lastly, remove time from date
            if (isFinite(d)) {
                citation.date = d.toISOString().split('T').shift();
            } else {
                // If no finite translation of the date is available, remove the field
                delete citation.date;
            }
        } catch (e) { // Remove field if errors are thrown
            delete citation.date;
        }
    }
    return citation;
}

/**
 * Replace and hyphen minuses with en dashes
 * @param  {Object} citation Zotero citation
 * @return {Object}          Zotero citation
 */
function fixPages(citation){
    if (citation.pages){
        citation.pages = citation.pages.replace('-', '–');
    }
    return citation;
}

/* Exports */
module.exports = Exporter;

module.exports.validateZotero = validateZotero;
module.exports.addPubMedIdentifiers = addPubMedIdentifiers;
module.exports.stripCitation = stripCitation;
module.exports.replaceCreators = replaceCreators;

module.exports.fixDate = fixDate;
module.exports.fixLang = fixLang;
module.exports.fixISSN = fixISSN;
module.exports.fixISBN = fixISBN;
module.exports.fixPages = fixPages;
module.exports.fixURL = fixURL;

module.exports.validateISSN = validateISSN;
module.exports.validateISBN = validateISBN;