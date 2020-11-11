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
const ISBN = require('isbn3');

/* Local Modules */
const CachedTypes = require('./zotero/cachedTypes.js');
const PubMedService = require('./external-apis/PubMedService.js');

/* regExp */
const reDOI = new RegExp('\\b10\\.[0-9]{3,5}(?:[.][0-9]+)*/[^ ]*');
const reISBN = new RegExp('((97[89][ -]?)?([0-9]{10}|[0-9]{9}[0-9xX]|[0-9-]{12}[0-9xX]))', 'g');
const reISSN = new RegExp('\\d{4}\\-\\d{3}[\\dX]', 'ig');
const rePMCID = new RegExp('\\bPMC\\d{7}\\b');
const rePMID = new RegExp('^[1-9]\\d{0,8}\\b');

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
 *
 * @param  {Object}   citation     simple citation object
 * @return {Object}   citation     simple citation object
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
 * Transfer ids (except for ISBN and ISSN) from zotero content obj to Citation obj
 *
 * @param  {Citation}  citation     citoidRequest object to add PMID
 * @param  {Object}    content      citoidRequest object to add PMID
 */
function addIdentifiersToCitation(citation, content) {

    // Keys with same case
    citation.url = citation.url || content.url;

    // Keys with differing CASE
    citation.doi = citation.doi || content.DOI;

    // Try to get PMCID / PMID / OCLC from 'extra' field
    // example of extra field: { "extra": "PMID: 20478883\nPMCID: PMC2880113"}
    if ((!citation.pmcid || !citation.pmid || !citation.oclc) && content.extra) {
        content.extra.split('\n').forEach((field) => {
            // could add them all, but let's not do this in case of conflicting fields
            const keyValue = field.split(': ');
            if (keyValue[0] === 'PMID' && keyValue[1].trim().match(rePMID)) {
                citation.pmid = keyValue[1].trim();
            } else if (keyValue[0] === 'PMCID' && keyValue[1].trim().match(rePMCID)) {
                citation.pmcid = keyValue[1].trim().replace(/^PMC/, '');
            } else if (keyValue[0] === 'OCLC') {
                // Validate if coming from Library of Congress ISBN api
                // Strip leading ocn string
                citation.oclc = keyValue[1].trim().replace('ocn', '');
            }
        });
    }
}

/**
 * Add URL provided by user if none in Zotero response
 *
 * @param  {string}   url        alternate url provided by user
 * @param  {Object}   citation   citation object to add PMID
 * @return {Object}   citation   citation object
 */
function fixURL(url, citation) {

    if (citation.url) {
        let parsed = urlParse.parse(citation.url);

        // Add http protocol if lacks protocol
        if (!parsed.protocol) {
            parsed = urlParse.parse(`http://${citation.url}`);
        }
        citation.url = (parsed.hostname || parsed.host) ? urlParse.format(parsed) : url;
    } else if (url) {
        // Use alternate url if url missing
        citation.url = url;
    }

    return citation;
}

/**
 * Replace Zotero output of CURRENT_TIMESTAMP with ISO time
 *
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function fixAccessDate(citation) {
    if (!citation.accessDate || (citation.accessDate === "CURRENT_TIMESTAMP")) {
        citation.accessDate = (new Date()).toISOString().substring(0, 10);
    } else {
        citation.accessDate = citation.accessDate.substring(0, 10);
    }
    return citation;
}

/**
 * Add missing websiteTitle
 *
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function fixWebsiteTitle(citation) {
    if (citation.itemType === 'webpage' && !citation.websiteTitle && citation.url) {
        const parsedUrl = urlParse.parse(citation.url);
        if (parsedUrl && parsedUrl.hostname) {
            citation.websiteTitle = parsedUrl.hostname;
        }
    }
    return citation;
}

/**
 * Convert String of ISSNs into an Array of ISSNs
 *
 * @param  {Object}   citation     citation object
 * @return {Object}   citation     citation object
 */
function fixISSN(citation) {
    let match;
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

    const match = issn.trim().match(reISSN);
    if (match) {
        return match[0];
    } else {
        return false;
    }
}

/**
 * Convert String of ISBNs into an Array of ISBNs with hyphens
 *
 * @param  {Object}   citation     simple citation object
 * @return {Object}   citation     simple citation object
 */
function fixISBN(citation) {
    let match;
    let hyphenated;
    const isbn = citation.ISBN;

    if (isbn) {
        match = isbn.match(reISBN);
        if (match) {
            citation.ISBN = [];
            match.forEach((isbnMatch) => {
                hyphenated = ISBN.hyphenate(isbnMatch);
                if (hyphenated) {
                    citation.ISBN.push(hyphenated);
                } else {
                    // Adds it even if unable to hyphenate
                    // This is because an outdated isbn spec can result in unhyphenatable isbns
                    citation.ISBN.push(isbnMatch);
                }
            });
        }
    }
    return citation;
}

/**
 * Wikibase format only; Split ISBNs into isbn13 and isbn10 and stricter validation than fixISBN
 *
 * @param  {Object}   citPart     part to which identifiers should be added
 * @param  {Object}   citPartISBN part with ISBN field in it - may be same as citPart or different
 * @return {Object}   citPart     simple Object, part of larger Citation object.
 */
function splitISBN(citPart, citPartISBN) {
    let match;
    let hyphenated;
    const isbn = citPartISBN.ISBN;

    if (isbn) {
        match = isbn.match(reISBN);
        if (match) {
            const isbn10 = [];
            const isbn13 = [];

            match.forEach((isbnMatch) => {
                isbnMatch = isbnMatch.replace(/-/g, "");
                hyphenated = ISBN.hyphenate(isbnMatch);
                if (hyphenated) {
                    if (isbnMatch.length === 13) { // unhyphenated length
                        isbn13.push(hyphenated);
                    }
                    if (isbnMatch.length === 10) { // unhyphenated length
                        isbn10.push(hyphenated);
                    }
                } // Doesn't add invalid / unhyphenatable isbns
            });

            // Add to citPart object
            if (isbn10.length > 0 || isbn13.length > 0) {
                if (!citPart.identifiers) {
                    citPart.identifiers = {};
                }
                if (isbn10.length > 0) {
                    citPart.identifiers.isbn10 = isbn10;
                }
                if (isbn13.length > 0) {
                    citPart.identifiers.isbn13 = isbn13;
                }
            }

            // remove old field
            delete citPartISBN.ISBN;
        }
    }

    return citPartISBN;
}

/**
 * @param  {string}   isbn     citation object
 * @param  {boolean}  strict   whether or not to include unhyphenatable isbns; default false
 * @return {string}            isbn
 */

function validateISBN(isbn, strict) {
    if (!isbn) { return false; }
    strict = !!strict;

    const reDash = new RegExp('[\\-–]', 'g');

    const match = isbn.trim().replace(reDash, '').match(reISBN);
    if (!match) { return false; }

    const hyphenated = ISBN.hyphenate(match);
    if (strict && !hyphenated) {
        return false;
    }

    return match[0].replace(/ /g, '');
}

/**
 * Validate language codes
 *
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
 *
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
 *
 * @param  {Object} citation            Zotero citation
 * @param  {string} citationFieldName   field name for the date, i.e. 'date', 'dateEnacted'
 * @return {Object}                     Zotero citation
 */
function fixDate(citation, citationFieldName) {
    if (!citationFieldName) {
        citationFieldName = 'date';
    }
    if (!citation[citationFieldName]) {
        return citation;
    }
    try {
        let d;
        // Strip copyright symbol if date is in format c2009 or
        // ©2009 (common in Worldcat); also match year only
        const matched = citation[citationFieldName].trim().match(/^(?:c|©)?(\d{4})$/);
        if (matched) {
            citation[citationFieldName] = matched[1]; // Use second group; 0 index is full match
            return citation; // Return year if that's all that's available
        }

        // Try to parse with chrono first
        const p = customChrono.parse(citation[citationFieldName]); // Create ParsedResult object
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
                    citation[citationFieldName] = d.toISOString().split('T').shift();
                } else if (p[0].start.knownValues.year && p[0].start.knownValues.month) {
                    const monthStr = p[0].start.knownValues.month.toString().length === 2 ?
                        p[0].start.knownValues.month.toString() : `0${p[0].start.knownValues.month}`;
                    citation[citationFieldName] =
                    `${p[0].start.knownValues.year}-${monthStr}`;
                }
            }
        }
    } catch (e) {
        // Leave field as written if errors are thrown
    }
    return citation;
}

/**
 * If DOI cannot be found in field, delete
 *
 * @param  {Object} citation            Zotero citation
 * @return {Object}                     Zotero citation
 */
function fixDOI(citation) {
    if (citation.DOI) {
        const matched = citation.DOI.trim().match(reDOI);
        if (matched && matched[0]) {
            citation.DOI = matched[0];
        } else {
            delete citation.DOI;
        }
    }
    return citation;
}

/**
 * Replace and hyphen minuses with en dashes
 *
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
 *
 * @param  {string} url        Requested URL from zotero service- not always from cr
 * @param  {Object} citation   Citation object
 * @return {Object}            Citation object
 */
function validateZotero(url, citation) {
    delete citation.itemKey;
    delete citation.itemVersion;
    citation = stripCitation(citation);
    citation = fixDOI(citation);
    citation = fixURL(url, citation);
    citation = fixAccessDate(citation);
    citation = fixWebsiteTitle(citation);

    // TODO: Remove
    citation = fixLang(citation);
    citation = fixDate(citation);
    citation = fixPages(citation);

    // TODO: Add DOI
    return citation;
}

/**
 * The Exporter class
 */
class Exporter {

    /**
     * Constructor for Exporter object
     *
     * @param {Object} app The application object
     */
    constructor(app) {
        this.logger = app.logger;
        this.app = app;

        // ZoteroService and Exporter services refer to each other
        // so must be set outside of constructor
        this.zoteroService = null;

        this.pubMed = app.conf.pubmed;
        this.pubMedService = new PubMedService(app);

        // Zotero itemType and field definitions
        this.types = new CachedTypes();

    }

    export(citation, request) {
        if (!citation.format) {
            return BBPromise.reject('No format available to convert to');
        }
        const convert = this.selectFormatFcn(citation.format);
        if (!citation.content) {
            return BBPromise.reject('No citation available to convert');
        }
        return BBPromise.resolve(convert(citation, request));
    }

    /**
     * Selects the format function given format string
     *
     * @param  {string}   format   string describing format
     * @return {Object}
     */
    selectFormatFcn(format) {
        const formatFcns = {
            'mediawiki': this.convertToMediawiki,
            'zotero': this.convertToZotero,
            'bibtex': this.convertToBibtex,
            'mediawiki-basefields': this.convertToBaseFields,
            'wikibase': this.convertToWikibase
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
     *
     * @param  {Citation}   citation    Citation object to be formatted
     * @param  {Object}     request     original request object
     * @return {BBPromise}              promise for Citation object
     */
    convertToZotero(citation, request) {
        // Validation of Zotero type already done in ZoteroService.js in zoteroWebRequest
        citation.formattedContent = citation.content;
        return BBPromise.resolve(citation);
    }

    /**
     * Takes Zotero output, standardises, and exports to BibTex
     * TODO: Use to take any Zotero output format
     *
     * @param  {Citation}   citation    Citation object to be formatted
     * @param  {Object}     request     original request object
     * @return {BBPromise}              promise for Citation object
     */
    convertToBibtex(citation, request) {
        let content = citation.content;
        const format = citation.format;

        content = fixAccessDate(content);
        content = fixWebsiteTitle(content);

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

        return this.zoteroService.zoteroExportRequest([ content ], format)
        .then((response) => {
            // Don't reset response code; could be 520 or 200
            citation.formattedContent = response.body.toString();
            return BBPromise.resolve(citation);
        }, (response) => reject());

    }

    /**
     * Takes Zotero output and converts to 'mediawiki' format
     *
     * @param  {Citation}   citation    Citation object to be formatted
     * @param  {Object}     request     original request object
     * @return {BBPromise}              promise for Citation object
     */
    convertToMediawiki(citation, request) {
        // Don't directly modify cr.response.citation, this should remain in zotero format only.
        let content = extend(true, {}, citation.content);
        content = replaceCreators(content);
        content = fixISBN(content);
        content = fixISSN(content);
        content = fixLang(content);
        content = fixDate(content);
        content = fixAccessDate(content);
        content = fixWebsiteTitle(content);
        content = fixPages(content);

        citation.formattedContent = content;

        return this.addIDSToCitation(citation, request).then((cit) => {
            // Only add source field if one or more source listed
            if (cit.source && (cit.source.length > 0)) {
                // Add sources field to citation content
                const fc = cit.formattedContent;
                fc.source = cit.source;

                // backfill url from ids, if still missing
                if (!fc.url) {
                    if (fc.doi) {
                        fc.url = `https://doi.org/${fc.doi}`;
                    } else if (fc.PMCID) {
                        fc.url = `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${fc.PMCID}`;
                    } else if (fc.PMID) {
                        fc.url = `https://pubmed.ncbi.nlm.nih.gov/${fc.PMID}`;
                    } else if (fc.oclc) {
                        fc.url = `https://www.worldcat.org/title/mediawiki/oclc/${fc.oclc}`;
                    }
                }
            }
            return BBPromise.resolve(cit);
        });
    }

    /**
     * Convert all the specific fields names to the base field
     * names in a Zotero citation, i.e. websiteTitle -> publicationTitle
     *
     * @param  {Citation}   citation    Citation object to be formatted
     * @param  {Object}     request     original request object
     * @return {BBPromise}              promise for Citation object
     */
    convertToBaseFields(citation, request) {
        return this.convertToMediawiki(citation).then((citation) => {
            let content = citation.formattedContent;
            const baseFields = this.types.getBaseFields(content.itemType);
            content = fixAccessDate(content);
            content = fixWebsiteTitle(content);

            // TODO: check creators
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

    /**
     * Convert identifiers to 'wikibase' format
     *
     * @param  {Citation} citation    Citation object to be formatted
     * @param  {Object}   content     simple citation object to be formatted
     * @param  {Object}   request     original request object
     * @return {Object}               formatted simple citation object
     */
    identifiersToWikibase(citation, content) {
        content.identifiers = {};

        // URL
        if (citation.url) {
            content.identifiers.url = citation.url;
        }
        if (content.url) {
            delete content.url;
        }

        // DOI, use camel case in wikibase format
        if (citation.doi) {
            content.identifiers.doi = citation.doi;
        }
        if (content.DOI) {
            delete content.DOI;
        }

        // PMCID- not present in Zotero format, no need to delete; use camel case in wikibase format
        if (citation.pmcid) {
            content.identifiers.pmcid = citation.pmcid;
        }

        // PMID- not present in Zotero format, no need to delete; use camel case in wikibase format
        if (citation.pmid) {
            content.identifiers.pmid = citation.pmid;
        }

        // QID - not present in Zotero format, no need to delete
        if (citation.qid) {
            content.identifiers.qid = citation.qid;
        }

        // OCLC - not present in Zotero format, no need to delete
        if (citation.oclc) {
            content.identifiers.oclc = citation.oclc;
        }

        // TODO: ISSN

        // ISBN
        return splitISBN(content, content);
    }

    /**
     * Convert to 'wikibase' format
     *
     * @param  {Citation}   citation    Citation object to be formatted
     * @param  {Object}     request     original request object
     * @return {BBPromise}              promise for Citation object
     */
    convertToWikibase(citation, request) {
        // Don't directly modify citation.content, this should remain in zotero format only.
        let content = extend(true, {}, citation.content);

        // Move identifiers from the content into the Citation object
        addIdentifiersToCitation(citation, content);

        content = fixISSN(content);
        content = fixLang(content);
        content = fixDate(content);
        content = fixAccessDate(content);
        content = fixWebsiteTitle(content);
        content = fixPages(content);

        const baseFields = this.types.getBaseFields(content.itemType);

        // TODO: Check creators
        Object.keys(baseFields).forEach((field) => {
            if (content[field]) {
                // Add basefield
                content[baseFields[field]] = content[field];
                // Remove original field
                delete content[field];
            }
        });

        citation.formattedContent = this.identifiersToWikibase(citation, content);

        return BBPromise.resolve(citation);
    }

    /**
     * Promise for additional identifiers (doi, pmc, pmcid) from the NIH id converter app.
     * Can be very slow. Confusingly, we still run this even if pubmed is disabled in the conf,
     * but we don't wait for the results of it.
     *
     * @param  {Object}   citation  citation object with new functions added to getResults Array
     * @param  {Object}    request  original request object
     * @return {Object}             BBPromise object for modified Citation object from input
     */
    fetchPubMedIDs(citation, request) {
        let gotData = false;
        request.logger.log('trace/citoidRequest', "Requesting additional IDs from PubMed service");
        return this.pubMedService.convert((citation.doi || citation.pmcid || citation.pmid),
            request)
        .then((results) => {
            request.logger.log('trace/citoidRequest', "Request to PubMed service completed");
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
            request.logger.log('debug/citoidRequest', e);
        });
    }

    /**
     * Add PMID, PMCID, and DOI fields through PMID, PMCID or DOI lookup - mediawiki format only
     *
     * @param  {Object}      citation      Citation object to add ID to
     * @param  {Object}      request       original request object
     * @return {BBPromise}                 promise for Citation object
     */
    addIdentifiersToContent(citation, request) {
        const content = citation.formattedContent;
        let gotData = false; // Whether or not we retrieved any useful data from PubMed

        // Try to get PMCID or PMID or OCLC from extra field
        if ((!content.PMCID || !content.PMID || !content.oclc) && content.extra) {
            content.extra.split('\n').forEach((field) => {
                // could add them all, but let's not do this in case of conflicting fields
                const keyValue = field.split(': ');
                if (keyValue[0] === 'PMID' && keyValue[1].trim().match(rePMID)) {
                    content.PMID = keyValue[1].trim();
                } else if (keyValue[0] === 'PMCID' && keyValue[1].trim().match(rePMCID)) {
                    content.PMCID = keyValue[1].trim().replace(/^PMC/, '');
                } else if (keyValue[0] === 'OCLC') {
                    // Validate if coming from Library of Congress ISBN api
                    // Strip leading ocn string
                    content.oclc = keyValue[1].trim().replace('ocn', '');
                }
            });
        }

        // If waiting for pubmed request is disabled, return the citation
        if (!this.pubMed) {
            return BBPromise.resolve(citation);
        }

        // If no identifiers to check, return citation
        // All IDs present
        if ((content.PMID !== undefined && content.PMCID !== undefined && content.DOI !== undefined)
                // No IDs present
                || (content.PMID === undefined && content.PMCID === undefined &&
                content.DOI === undefined)) {
            return BBPromise.resolve(citation);
        }

        // If the pubmed identifiers haven't yet been requested, create new request
        if (!citation.hasRequestedPubMed) {
            return this.pubMedService.convert((content.DOI ||
                (content.PMCID ? content.PMCID : false) || content.PMID), request)
            .then((results) => {
                if (!content.PMID && results.records[0].pmid) {
                    gotData = true;
                    content.PMID = results.records[0].pmid;
                }
                if (!content.PMCID && results.records[0].pmcid) {
                    gotData = true;
                    content.PMCID = results.records[0].pmcid.trim().replace(/^PMC/, '');
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
                request.logger.log('debug/citoidRequest', e);
            });
        }
    }

    /**
     * Add all identifiers in CitoidRequest to an intermediate
     * converted citation currently in body Array.
     *
     * @param  {Citation}   citation    Citation object to be formatted
     * @param  {Object}     request     original request object
     * @return {BBPromise}              promise for Citation object
     */
    addIDSToCitation(citation, request) {

        // Pointer for code clarity
        const content = citation.formattedContent;

        if (!content.ISBN && citation.isbn) {
            content.ISBN = [ citation.isbn ];
        }

        if (!content.ISSN && citation.issn) {
            content.ISSN = [ citation.issn ];
        }

        if (!content.url && citation.url) {
            content.url = citation.url;
        }

        if (citation.oclc) {
            content.oclc = citation.oclc;
        }

        if (citation.qid) {
            content.qid = citation.qid;
        }

        if (citation.pmid) {
            content.PMID = citation.pmid;
        }

        if (citation.pmcid) {
            content.PMCID = citation.pmcid;
        }

        // Try to get doi from
        if (!content.DOI && citation.doi) {
            content.DOI = citation.doi;
        }

        // Get additional IDs
        return this.addIdentifiersToContent(citation, request);
    }

}

/* Exports */
module.exports = {
    Exporter,

    validateZotero,
    stripCitation,
    replaceCreators,

    fixDOI,
    fixDate,
    fixLang,
    fixISSN,
    fixISBN,
    fixPages,
    fixURL,

    validateISSN,
    validateISBN
};
