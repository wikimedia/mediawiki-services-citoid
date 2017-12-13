'use strict';

/**
 * https://www.mediawiki.org/wiki/citoid
 *
 * Supplies methods to send requests to a Zotero server
 */

/* Import Modules */
const BBPromise = require('bluebird');
const chrono = require('chrono-node');
const extend = require('extend');
const stripTags = require('striptags');
const urlParse = require('url');

/* Local Modules */
const CachedTypes = require('./zotero/cachedTypes.js');
const pubMedRequest = require('./pubMedRequest.js');

/* Globals */
let defaultLogger;
let userAgent;
let pubmed;
const acceptLanguage = 'en-US';

/* Custom chrono parsers */
const customChrono = new chrono.Chrono();

// Targets partial iso dates, i.e. 1975-10 or 1975-1
const partialISO = new chrono.Parser();
partialISO.pattern = () =>  /([0-9]{4})-([0-9]{1,2})$/g;
partialISO.extract = (text, ref, match, opt) => {
    return new chrono.ParsedResult({
        ref,
        text: match[0],
        index: match.index,
        start: {
            month: match[2],
            year: match[1]
        }
    });
};
customChrono.parsers.push(partialISO);

// Target year first with range, i.e. 1975 Dec-Nov
// TODO: Add to end
const journalFormat = new chrono.Parser();
journalFormat.pattern = () => /(\d{4})\s+([a-z]{3})\s*-\s*[a-z]{3}$/ig;
journalFormat.extract = (text, ref, match, opt) => {
    // Get month number - a bit hacky
    const date = new Date(Date.parse(`${match[2]} 1, 2010`));
    const month = date ? date.getMonth() + 1 : 1;
    return new chrono.ParsedResult({
        ref,
        text: match[0],
        index: match.index,
        start: {
            month,
            year: match[1]
        }
    });
};
customChrono.parsers.push(journalFormat);

// TODO: Target Fall, Spring, Summer, and Winter 1975


/* Methods for Particular Fields in Citation Object */

/**
 * Remove creators and add 2D array of fname, lname keyed by creatorType
 * Used to convert to 'mediawiki' format
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function replaceCreators(citation) {
    if (!citation.creators) {
        return citation;
    }
    let creator;
    let creatorFieldName;
    const zotCreators = citation.creators;

    for (let z = 0; z < zotCreators.length; z++) {
        creatorFieldName = zotCreators[z].creatorType;

        // Only add the creator to the list if either a firstName, lastName, or name is present
        if (zotCreators[z].firstName || zotCreators[z].lastName || zotCreators[z].name) {
            creator = []; // List containing [firstName, lastName]

            if (zotCreators[z].firstName) {
                // Set first element of creator list to firstName
                creator[0] = zotCreators[z].firstName;
            } else {
                creator[0] = ''; // Otherwise, empty string
            }

            if (zotCreators[z].lastName) {
                // Set second element of creator list to lastName
                creator[1] = zotCreators[z].lastName;
            } else if (zotCreators[z].name) { // Set lastName to value of name
                creator[1] = zotCreators[z].name;
            } else {
                creator[1] = ''; // If there is no lastName, empty string
            }

            if (!citation[creatorFieldName]) {
                citation[creatorFieldName] = [];
            }
            // Add creator list [firstName, lastName] to the list of creators.
            citation[creatorFieldName].push(creator);
        }
    }

    delete citation.creators; // remove creators field
    return citation;
}

/**
 * Add PMID, PMCID, and DOI fields from the extra field or through PMID, PMCID or DOI lookup
 * @param  {Object}   citation      citoidRequest object to add PMID
 * @return {Object}   promise for citoidRequest object
 */
function addPubMedIdentifiers(citation) {
    const content = citation.formattedContent;
    let gotData = false; // Whether or not we retrieved any useful data from PubMed

    const rePMCID = new RegExp('\\bPMC\\d{7}\\b');
    const rePMID = new RegExp('^[1-9]\\d{0,7}\\b');

    // Try to get PMCID or PMID from extra field
    if ((!content.PMCID || !content.PMID) && content.extra) {
        // get pmid from extra fields
        content.extra.split('\n').forEach((field) => {
            // could add them all, but let's not do this in case of conflicting fields
            const keyValue = field.split(': ');
            if (keyValue[0] === 'PMID' && keyValue[1].trim().match(rePMID)) {
                content.PMID = keyValue[1].trim();
            } else if (keyValue[0] === 'PMCID' && keyValue[1].trim().match(rePMCID)) {
                content.PMCID = keyValue[1].trim();
            }
        });
    }

    // If waiting for pubmed request is disabled, return the citation
    if (!pubmed) {
        return BBPromise.resolve(citation);
    }

    // If no identifiers to check, return citation
    // All IDs present
    if ((content.PMID !== undefined && content.PMCID !== undefined && content.DOI !== undefined) ||
            // No IDs present
            (content.PMID === undefined && content.PMCID === undefined &&
            content.DOI === undefined)) {
        return BBPromise.resolve(citation);
    }

    // If the pubmed identifiers haven't yet been requested, create new request
    if (!citation.hasRequestedPubMed) {
        return pubMedRequest((content.DOI || (content.PMCID ? content.PMCID : false) ||
            content.PMID), userAgent, defaultLogger)
        .then((results) => {
            if (!content.PMID && results.records[0].pmid) {
                gotData = true;
                content.PMID = results.records[0].pmid;
            }
            if (!content.PMCID && results.records[0].pmcid) {
                gotData = true;
                content.PMCID = results.records[0].pmcid;
            }
            if (!content.DOI && results.records[0].doi) {
                gotData = true;
                content.DOI = results.records[0].doi;
            }
            // Only add if PubMed not already in source Array
            if ((citation.source.indexOf('PubMed') === -1) && gotData) {
                // Add pubmed to source list as we retrieved data from there
                citation.source.push('PubMed');
            }
            return BBPromise.resolve(citation);
        }, () => {
            return BBPromise.resolve(citation); // Unhandled rejection
        });
    } else {
        // Wait for original Promise made at the beginning of the request,
        // then fill IDs into content
        return BBPromise.resolve(citation.hasRequestedPubMed).then(() => {
            // Make sure requested identifiers are filled in content
            if (!content.DOI && citation.doi) {
                content.DOI = citation.doi;
            }
            if (!content.PMCID && citation.pmcid) {
                content.PMCID = citation.pmcid;
            }
            if (!content.PMID && citation.pmid) {
                content.PMID = citation.pmid;
            }
            return citation;
        // Rejection case
        }, () => {
            return citation;
        }).catch((e) => {
            defaultLogger.log('debug/citoidRequest', e);
        });
    }
}


/**
 * Add URL provided by user if none in Zotero response
 * @param  {string}   url      alternate url provided by user
 * @param  {Object}   citation citation object to add PMID
 * @return {Object}   citation     citation object
 */
function fixURL(url, citation) {

    if (citation.url) {
        let parsed = urlParse.parse(citation.url);

        // Add http protocol if lacks protocol
        if (!parsed.protocol) {
            parsed = urlParse.parse(`http://${citation.url}`);
        }
        citation.url = (parsed.hostname || parsed.host) ? urlParse.format(parsed) : url;
    } else {
        // Use alternate url if url missing
        citation.url = url;
    }
    return citation;
}

/**
 * Replace Zotero output of CURRENT_TIMESTAMP with ISO time
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function fixAccessDate(citation) {
    if (!citation.accessDate || (citation.accessDate === "CURRENT_TIMESTAMP")) {
        citation.accessDate = (new Date()).toISOString().substring(0, 10);
    }
    return citation;
}

/**
 * Convert String of ISSNs into an Array of ISSNs
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function fixISSN(citation) {
    let match;
    const reISSN = new RegExp('\\d{4}\\-\\d{3}[\\dX]', 'ig');
    const issn = citation.ISSN;

    if (issn) {
        match = issn.trim().match(reISSN);
        if (match) {
            citation.ISSN = match;
        } else {
            delete citation.ISSN; // Deletes field with no matches
        }
    }
    return citation;
}

function validateISSN(issn) {
    if (!issn) { return false; }
    const reISSN = new RegExp('\\d{4}\\-\\d{3}[\\dX]', 'ig');
    const match = issn.trim().match(reISSN);
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
function fixISBN(citation) {
    let match;
    let isbn = citation.ISBN;
    const reDash = new RegExp('[\\-–]', 'g');
    const reISBN = new RegExp('((978 ?)[0-9]{10}|[0-9]{9}[0-9xX])', 'g');

    if (isbn) {
        // Clean up ISBN so we can parse it easier
        isbn = isbn.trim().replace(reDash, '');

        match = isbn.match(reISBN);
        if (match) {
            citation.ISBN = [];
            match.forEach((isbnMatch) => {
                isbnMatch = isbnMatch.replace(/ /g, ''); // Remove any spaces (e.g. 978 0810935310)
                citation.ISBN.push(isbnMatch);
            });
        } else {
            citation.ISBN = [isbn]; // wraps isbn field in array in case of false negatives
        }
    }
    return citation;
}

function validateISBN(isbn) {
    if (!isbn) { return false; }

    const reDash = new RegExp('[\\-–]', 'g');
    const reISBN = new RegExp('((978 ?)[0-9]{10}|[0-9]{9}[0-9xX])', 'g');

    const match = isbn.trim().replace(reDash, '').match(reISBN);
    if (!match) { return false; }
    return match[0].replace(/ /g, '');
}

/**
 * Validate language codes
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function fixLang(citation) {
    if (citation.language) {
        citation.language = citation.language.replace('_', '-');
        if (!/^[a-z]{2}(?:-?[a-z]{2,})*$/i.test(citation.language)) {
            delete citation.language;
        }
    }
    return citation;
}

/* Methods for cleaning out specific output types (i.e. from Zotero) */

/**
 * Strip html style tags out of top level field values
 * TODO: Check structured creators field as well
 * @param  {Object} citation Zotero citation
 * @return {Object}          Clean Zotero citation
 */
function stripCitation(citation) {
    let value;
    Object.keys(citation).forEach((key) => {
        value = citation[key];
        if (typeof value === 'string') {
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
function fixDate(citation) {
    if (!citation.date) {
        return citation;
    }
    try {
        let d;
        // Strip copyright symbol if date is in format c2009 or
        // ©2009 (common in Worldcat); also match year only
        const matched = citation.date.trim().match(/^(?:c|©)?(\d{4})$/);
        if (matched) {
            citation.date = matched[1]; // Use second group; 0 index group is full match
            return citation; // Return year if that's all that's available
        }

        // Try to parse with chrono first
        const p = customChrono.parse(citation.date); // Create ParsedResult object with chrono
        if (p && p[0] && p[0].start) {
            // Remove timezone offset so that the user-observed date doesn't change based on offset
            p[0].start.assign('timezoneOffset', 0);
            // Create a Date object from ParsedComponents Object
            d = p[0].start.date();
            // If a Date object is formed, format it.
            if (isFinite(d)) {
                // Only turn into ISO date if an all fields are known
                if (p[0].start.knownValues.year && p[0].start.knownValues.month
                        && p[0].start.knownValues.day) {
                    // Remove time from date
                    citation.date = d.toISOString().split('T').shift();
                } else if (p[0].start.knownValues.year && p[0].start.knownValues.month) {
                    const options = {
                        year: 'numeric',
                        month: 'long'
                    };
                    citation.date = d.toLocaleDateString(acceptLanguage, options);
                }
            }
        }
    } catch (e) {
        // Leave field as written if errors are thrown
    }
    return citation;
}

/**
 * Replace and hyphen minuses with en dashes
 * @param  {Object} citation Zotero citation
 * @return {Object}          Zotero citation
 */
function fixPages(citation) {
    if (citation.pages) {
        citation.pages = citation.pages.replace('-', '–');
    }
    return citation;
}

/**
 * Validates Zotero fields and augments data based on CitoidRequest
 * object
 * @param  {string} url        Requested URL from zotero service- not always from cr
 * @param  {Object} citation   Citation object
 * @return {Object}            Citation object
 */
function validateZotero(url, citation) {
    delete citation.itemKey;
    delete citation.itemVersion;
    citation = stripCitation(citation);
    citation = fixURL(url, citation);
    citation = fixAccessDate(citation);

    // TODO: Remove
    citation = fixLang(citation);
    citation = fixDate(citation);
    citation = fixPages(citation);

    // TODO: Add DOI
    return citation;
}


/**
 * Add all identifiers in CitoidRequest to an intermediate
 * converted citation currently in body Array.
 * @param  {Object} citation citation object
 * @return {Object}          CitoidRequest object
 */
function addIDSToCitation(citation) {

    // Pointer for code clarity
    const content = citation.formattedContent;

    // Add isbn inside of an Array
    if (citation.idType === 'isbn') {
        content.ISBN = [citation.idValue];
    // Set other identifiers as part of citation and capitalise
    } else if (citation.idType === 'issn' || citation.idType === 'doi' ||
            citation.idType === 'pmid' || citation.idType === 'pmcid' &&
            !content[citation.idType.toUpperCase()]) {
        content[citation.idType.toUpperCase()] = citation.idValue;
    }

    if (!citation.idType) {
        defaultLogger.log('warn/addIDs', 'No idType found in CitoidRequest');
    }

    // Add OCLC number if present
    if (citation.oclc) {
        content.oclc = citation.oclc;
    }

    // Try to get doi from cr.doi //TODO remove?
    if (!content.DOI && citation.doi) {
        content.DOI = citation.doi;
    }

    return addPubMedIdentifiers(citation);

}

/**
 * Promise for additional identifiers (doi, pmc, pmcid) from the NIH id converter app.
 * Can be very slow
 * @param  {Object}   citation  Citation object with new functions added to getResults Array
 * @return {Object}             BBPromise object for modified Citation object from input
 */
function fetchPubMedIDs(citation) {
    let gotData = false;
    defaultLogger.log('debug/citoidRequest', "Requesting additional IDs from PubMed service");
    return pubMedRequest((citation.doi || citation.pmcid || citation.pmid),
        userAgent, defaultLogger)
    .then((results) => {
        defaultLogger.log('debug/citoidRequest', "Request to PubMed service completed");
        if (!citation.pmid && results.records[0].pmid) {
            gotData = true;
            citation.pmid = results.records[0].pmid;
        }
        if (!citation.pmcid && results.records[0].pmcid) {
            gotData = true;
            citation.pmcid = results.records[0].pmcid;
        }
        if (!citation.doi && results.records[0].doi) {
            gotData = true;
            citation.doi = results.records[0].doi;
        }
        // Only add if PubMed not already in source Array and we gotData from it
        if ((citation.source.indexOf('PubMed') === -1) && gotData) {
            citation.source.push('PubMed');
        }
        return citation;
    }, () => {
        return citation;
    }).catch((e) => {
        defaultLogger.log('debug/citoidRequest', e);
    });
}


/**
 * The Exporter class
 */
class Exporter {


    /**
    * Constructor for Exporter object
    * @param {Object} app The application object
    */
    constructor(app) {
        this.logger = app.logger;
        this.stats = app.metrics;

        // ZoteroService and Exporter services refer to each other
        // so must be set outside of constructor
        this.zoteroService = null;

        // Zotero itemType and field definitions
        this.types = new CachedTypes();

        defaultLogger = this.logger;
        userAgent = app.conf.userAgent;

        pubmed = app.conf.pubmed;
    }

    export(citation) {
        if (!citation.format) {
            return BBPromise.reject('No format available to convert to');
        }
        const convert = this.selectFormatFcn(citation.format);
        if (!citation.content) {
            return BBPromise.reject('No citation available to convert');
        }
        return BBPromise.resolve(convert(citation));
    }

    /**
    * Selects the format function given format string
    * @param  {string}   format   string describing format
    */
    selectFormatFcn(format) {
        const formatFcns = {
            'mediawiki':this.convertToMediawiki,
            'zotero':this.convertToZotero,
            'bibtex':this.convertToBibtex,
            'mediawiki-basefields':this.convertToBaseFields
        };
        return formatFcns[format].bind(this);
    }

    /**
    * Specific Conversion Methods
    *
    * These methods should fill the body of the CitoidResponse object as they are
    * the final step before passing to the app.
    */

    /**
    * Takes Zotero output and standardises it
    * @param  {Object}   citation  CitoidResponse object
    * @return {Object}             BBPromise for CitoidResponse object
    */
    convertToZotero(citation) {
        // Validation of Zotero type already done in ZoteroService.js in zoteroWebRequest
        citation.formattedContent = citation.content;
        return BBPromise.resolve(citation);
    }

    /**
    * Takes Zotero output, standardises, and exports to BibTex
    * TODO: Use to take any Zotero output format
    * @param  {Object}   citation    Citation object
    * @return {Object}               BBPromise for CitoidResponse object
    */
    convertToBibtex(citation) {
        const content = citation.content;
        const format = citation.format;

        // Run for export failure
        const reject = () => {
            const message  = `Unable to serve ${format} format at this time`;
            const error = { Error: message };
            // cr.logger.log('trace/zotero', message);//TODO: fix for single citation
            citation.error = error;
            // 404 error if cannot translate into alternate format
            citation.responseCode = 404;
            return BBPromise.resolve(citation);
        };

        // Immediately reject if no zotero service is available
        if (!this.zoteroService) {
            return reject();
        }

        return this.zoteroService.zoteroExportRequest([content], format)
        .then((response) => {
            // Don't reset response code; could be 520 or 200
            citation.formattedContent = response.body.toString();
            return BBPromise.resolve(citation);
        }, response => reject());

    }

    /**
    * Takes Zotero output and converts to 'mediawiki' format
    * @param  {Object}   citation  CitoidResponse object
    * @return {Object}       BBPromise for CitoidResponse object
    */
    convertToMediawiki(citation) {
        // Don't directly modify cr.response.citation, this should remain in zotero format only.
        let content = extend(true, {}, citation.content);
        content = replaceCreators(content);
        content = fixISBN(content);
        content = fixISSN(content);
        content = fixLang(content);
        content = fixDate(content);
        content = fixPages(content);

        citation.formattedContent = content;

        return addIDSToCitation(citation).then((cit) => {
            // Only add source field if one or more source listed
            if (cit.source && (cit.source.length > 0)) {
                // Add sources field to citation content
                cit.formattedContent.source = cit.source;
            }
            return BBPromise.resolve(cit);
        });
    }

    /**
    * Convert all the specific fields names to the base field
    * names in a Zotero citation, i.e. websiteTitle -> publicationTitle
    * TODO: Currently has both fields in for backwards compatibility- remove
    * @param  {Object} citation Zotero citation
    * @return {Object}          Zotero citation
    */
    convertToBaseFields(citation) {
        return this.convertToMediawiki(citation).then((citation) => {
            const content = citation.formattedContent;
            const types =  this.types;
            const baseFields = types.getBaseFields(content.itemType);
            Object.keys(baseFields).forEach((field) => {
                if (content[field]) {
                    // Add basefield
                    content[baseFields[field]] = content[field];
                    // Remove original field
                    delete content[field];
                }
            });
            return BBPromise.resolve(citation);
        });
    }


}


/* Exports */
module.exports = {
    Exporter,

    validateZotero,
    addPubMedIdentifiers,
    stripCitation,
    replaceCreators,
    fetchPubMedIDs,

    fixDate,
    fixLang,
    fixISSN,
    fixISBN,
    fixPages,
    fixURL,

    validateISSN,
    validateISBN
};
