'use strict';

var eg = require('./util/index.js').extendGeneral;
var generateCreatorObj = require('./util/index.js').generateCreatorObj;
var fixDate = require('../Exporter.js').fixDate;
var fixPages = require('../Exporter.js').fixPages;
var makeTranslator = require('./util/index.js').makeTranslator;

/**
 * COinS 'genre' field values : Zotero type field values
 * @type {Object}
 */
exports.genre = {
    article: 'journalArticle',
    issue: 'book',
    proceeding: 'conferencePaper',
    conference: 'conferencePaper',
    preprint: 'journalArticle',
    unknown: 'journalArticle',
    book: 'book',
    bookitem: 'bookSection',
    report: 'report',
    document: 'document'
};

/**
 * Fields in common amongst types
 * @type {Object}
 */
exports.general = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate)
};

// Shortcut for extendGeneral utility
function extendGeneral(creatorName){
    return eg(exports.general, creatorName);
}

/**
 * Methods that are used by multiple types
 */

exports.other = {};

/**
 * Convert author fields to Zotero authors
 *
 * This function does not get used in the translate function-
 * it must be called explicitly
 *
 * @type {Function}
 */

exports.other.addCreators = function(citation, metadata){
    var creatorText;
    var creatorObj;
    var firstAuthor;
    var i;
    var creators = [];
    var creatorType = 'author'; // default creatorType

    // Map between type and the creator name- excludes those with no creator and those with type author
    var creatorTypeMap = {
        artwork: 'artist',
        audioRecording: 'performer',
        bill: 'sponsor',
        computerProgram: 'programmer',
        film: 'director',
        hearing: 'contributor',
        interview: 'interviewee',
        map: 'cartographer',
        patent: 'inventor',
        podcast: 'podcaster',
        presentation: 'presenter',
        radioBroadcast: 'director',
        tvBroadcast: 'director',
        videoRecording: 'director'
    };

    // Create empty citation if none supplied in argument
    if (!citation) {citation = {};}

    // Don't overwrite existing creators field or continue if no itemType set
    if (citation.creators || !citation.itemType){return citation;}

    // Return if itemType lacks creator field
    if (['note', 'attachment'].indexOf(citation.itemType) >= 0) {
        return citation;
    }

    // Determine creatorType - default 'author'
    if (creatorTypeMap[citation.itemType]){
        creatorType = creatorTypeMap[citation.itemType];
    }

    function namesEqual(creator1, creator2){
        var c1 = creator1.firstName + ' ' + creator1.lastName;
        var c2 = creator2.firstName + ' ' + creator2.lastName;
        return c2 === c1;
    }

    function addFirstAuthor(){
        firstAuthor = {creatorType: creatorType};

        firstAuthor.lastName = metadata.aulast || '';
        firstAuthor.lastName = firstAuthor.lastName.replace(/\s/, ' '); // Replace any white space character with space

        if (metadata.ausuffix){
            firstAuthor.lastName += ', ' + metadata.ausuffix;
        }

        if (metadata.aufirst !== undefined){
            firstAuthor.firstName = metadata.aufirst.replace(/\s/, ' '); // Replace any white space character with space
        } else if (metadata.auinit !== undefined) {
            firstAuthor.firstName = metadata.auinit;
        } else if (metadata.auinit1 !== undefined) {
            firstAuthor.firstName = metadata.auinit1;
            if (metadata.auinitm !== undefined){
                firstAuthor.firstName += ' ' + metadata.auinitm;
            }
        } else {
            firstAuthor.firstName = '';
        }

        if (!firstAuthor.firstName && !firstAuthor.lastName){
            return;
        }

        creators.push(firstAuthor);
    }

    // Add remaining authors in au field
    function addAu(){
        if (!metadata.au || !Array.isArray(metadata.au)){
            return;
        }
        for (i = 0; i < metadata.au.length; i++) {
            creatorText = metadata.au[i];
            creatorObj = generateCreatorObj(creatorText, creatorType);
            // Make sure name isn't the same as first author as sometimes first author is included in au
            if (!namesEqual(firstAuthor, creatorObj)) {
                creators.push(creatorObj);
            }

        }
    }

    function addAuCorp(){
        if (!metadata.aucorp || !Array.isArray(metadata.aucorp)){
            return;
        }
        for (i = 0; i < metadata.aucorp.length; i++) {
            creatorObj = {creatorType: creatorType};
            creatorText = metadata.aucorp[i];
            // Set entire corporation name as last name
            creatorObj.firstName = "";
            creatorObj.lastName = creatorText;
            // Make sure name isn't the same as first author as sometimes first author is included in au
            if (!namesEqual(firstAuthor, creatorObj)) {
                creators.push(creatorObj);
            }
        }
    }

    addFirstAuthor();
    addAu();
    addAuCorp();

    // Add non-empty array of creators to citation
    if (creators.length){
        citation.creators = creators;
    }
    return citation;
};

exports.other.isbn = {
    name: 'ISBN',
    translate: function(citation, isbn) {
        return exports.other.addToList(citation, isbn, 'ISBN');
    }
};

exports.other.issn = {
    name: 'ISSN',
    translate: function(citation, issn) {
        return exports.other.addToList(citation, issn, 'ISSN');
    }
};

exports.other.eissn = {
    name: 'ISSN',
    translate: function(citation, eissn){
        return exports.other.addToList(citation, eissn, 'ISSN');
    }
};

/**
 * Convert spage and epage fields to Zotero pages
 *
 * This function does not get used in the translate function-
 * it must be called explicitly. Citation itemType must
 * already be set before calling.
 *
 * @type {Function}
 */
exports.other.spage = function(citation, metadata){
    if (!citation.itemType || metadata.pages || !metadata.spage || !metadata.epage ||
        typeof metadata.spage !== 'string' || typeof metadata.epage !== 'string'){
        return citation;
    }
    // Add page range if pages is a valid field for the type
    if (['journalArticle', 'book', 'conferencePaper','bookSection', 'report'].indexOf(citation.itemType) >= 0) {
        citation.pages = metadata.spage + '–' + metadata.epage;
    }
    return citation;
};


/**
 * Add parameters in a list to a string
 * @param {Object}    citation  citation object
 * @param {Array}     values    Array of string values
 * @param {String}    key       citation key name
 * @returns {Object}            citation
 */
exports.other.addToList = function(citation, values, key){
    if (!Array.isArray(values) || !values.length){
        return citation;
    }
    if (citation[key] === undefined){
        citation[key] = '';
    }
    var i;
    for (i = 0; i < values.length; i++) {
        if (!citation[key]){ // Empty string
            citation[key] += values[i];
        } else {
            citation[key] += ', ' + values[i];
        }
    }
    return citation;
};

/**
 * Translator for Zotero type: journalArticle
 * Can take fields from preprint, unknown, and article COinS genres
 * COinS article properties : Zotero journalArticle properties
 * @type {Object}
 */
exports.journalArticle = {
    atitle: makeTranslator('title'),
    title: makeTranslator('publicationTitle'), // Deprecated
    jtitle: makeTranslator('publicationTitle'),
    stitle: makeTranslator('journalAbbreviation'),
    volume: makeTranslator('volume'),
    issue: makeTranslator('issue'),
    artnum: null, // publisher assigned article number
    coden: null,
    sici: null, // Serial item and contribution id
    chron: null, // Date in non-date format i.e. 1st quarter
    ssn: null, // Season
    quarter: null,
    part: null,
    isbn: null, // Invalid Zotero field
    pages: makeTranslator('pages', fixPages),
    place: null, // Invalid Zotero field
    series: makeTranslator('series'),
    pub: makeTranslator('publisher')
};
exports.journalArticle.issn = exports.other.issn;
exports.journalArticle.eissn = exports.other.eissn;

/**
 * Translator for Zotero type: book
 * Can take fields from book and issue COinS genres
 * COinS book properties : Zotero book properties
 * @type {Object}
 */
exports.book = {
    btitle: makeTranslator('title'),
    title: makeTranslator('title'),
    edition: makeTranslator('edition'),
    tpages: null, // Total pages
    bici: null, // Book item and component identifier
    pages: makeTranslator('pages', fixPages),
    place: makeTranslator('place'),
    series: makeTranslator('series'),
    pub: makeTranslator('publisher')
};
exports.book.isbn = exports.other.isbn;

/**
 * Translator for Zotero type: conferencePaper
 * Can take fields from proceeding and conference COinS genres
 * COinS proceeding and conference properties : Zotero conferencePaper properties
 * @type {Object}
 */
exports.conferencePaper = {
    atitle: makeTranslator('title'),
    title: makeTranslator('proceedingsTitle'), // Deprecated
    jtitle: makeTranslator('proceedingsTitle'),
    pages: makeTranslator('pages', fixPages),
    place: makeTranslator('place'),
    series: makeTranslator('series'),
    pub: makeTranslator('publisher')
};
exports.conferencePaper.isbn = exports.other.isbn;

/**
 * Translator for Zotero type: bookSection
 * Can take fields from bookitem COinS genres
 * COinS bookitem properties : Zotero bookSection properties
 * @type {Object}
 */
exports.bookSection = {
    atitle: makeTranslator('title'),
    btitle: makeTranslator('bookTitle'),
    stitle: makeTranslator('shortTitle'),
    edition: makeTranslator('edition'),
    pages: makeTranslator('pages', fixPages),
    place: makeTranslator('place'),
    series: makeTranslator('series'),
    pub: makeTranslator('publisher')
};
exports.bookSection.isbn = exports.other.isbn;


/**
 * Translator for Zotero type: document
 * Can take fields from proceeding and conference COinS genres
 * COinS proceeding and conference properties : Zotero book properties
 * @type {Object}
 */
exports.document = {
    atitle: makeTranslator('title'),
    pub: makeTranslator('publisher')
};

/**
 * Translator for Zotero type: report
 * Can take fields from report COinS genre
 * COinS report properties : Zotero book properties
 * @type {Object}
 */
exports.report = {
    atitle: makeTranslator('title'),
    jtitle: makeTranslator('seriesTitle'),
    stitle: makeTranslator('shortTitle'),
    title: makeTranslator('seriesTitle'),
    pages: makeTranslator('pages', fixPages),
    place: makeTranslator('place'),
    series: makeTranslator('seriesTitle'),
    pub: makeTranslator('institution'),
};

exports.artwork = exports.general;
exports.attachment = {
    title: makeTranslator('title')
};
exports.audioRecording = exports.general;
exports.bill = exports.general;
exports.blogPost = exports.general;
exports['case'] = {
    title: makeTranslator('caseName'),
    date: makeTranslator('date', fixDate)
};
exports.computerProgram = exports.general;
exports.dictionaryEntry = exports.general;
exports.email = {
    title: makeTranslator('subject'),
    date: makeTranslator('date', fixDate)
};
exports.encyclopediaArticle = exports.general;
exports.film = exports.general;
exports.forumPost = exports.general;
exports.hearing = exports.general;
exports.instantMessage = exports.general;
exports.interview = exports.general;
exports.letter = exports.general;
exports.magazineArticle = exports.general;
exports.manuscript = exports.general;
exports.map = exports.general;
exports.newspaperArticle = exports.general;
exports.note = {};
exports.patent = exports.general;
exports.podcast = exports.general;
exports.presentation = exports.general;
exports.radioBroadcast = exports.general;
exports.statute = {
    title: makeTranslator('nameOfAct'),
    date: makeTranslator('date', fixDate)
};
exports.thesis = exports.general;
exports.tvBroadcast = exports.general;
exports.videoRecording = exports.general;
exports.webpage = exports.general;