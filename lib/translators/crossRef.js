'use strict';

//  Used for crossRef REST API
//  https:// github.com/CrossRef/rest-api-doc

const chrono = require('chrono-node');

const ex = require('../Exporter.js');
const ut = require('./util/index.js');

const makeTranslator = ut.makeTranslator;
const makeListTranslator = ut.makeListTranslator;

const vISSN = ex.validateISSN;
const vISBN = ex.validateISBN;
const fixDate = ex.fixDate;

/* eslint-disable quote-props */
/**
 * CrossRef type values : Zotero type field values
 * From http://api.crossref.org/types
 *
 * @type {Object}
 */
exports.types = {
    'journal-article': 'journalArticle',
    'book-section': 'bookSection',
    'monograph': 'book',
    'report': 'report',
    'book-track': 'bookSection',
    'other': 'journalArticle',
    'journal-volume': 'book',
    'book-set': 'book',
    'reference-entry': 'encyclopediaArticle',
    'proceedings-article': 'conferencePaper',
    'journal': 'book',
    'component': 'webpage',
    'book-chapter': 'bookSection',
    'proceedings': 'book',
    'standard': 'document',
    'reference-book': 'book',
    'posted-content': 'webpage',
    'dissertation': 'thesis',
    'dataset': 'webpage',
    'book-series': 'book',
    'edited-book': 'book',
    'standard-series': 'webpage'
};
/* eslint-enable quote-props */

/* Utility functions */

// CAUTION: This function will merge 'creators' lists if one already exists
function addCreators(citation, metadataValue, creatorFieldName) {
    let i;
    let creatorObj;

    if (!citation) {
        citation = {};
    }
    if (!metadataValue) {
        return citation;
    }
    if (!creatorFieldName) {
        throw new Error('creatorFieldName is required');
    }

    //  Expect an Array of Objects
    if (!Array.isArray(metadataValue)) {
        return citation;
    }

    if (!citation.creators) {
        citation.creators = [];
    }

    for (i = 0; i < metadataValue.length; i++) {
        creatorObj = {
            creatorType: creatorFieldName,
            firstName: metadataValue[i].given,
            lastName: metadataValue[i].family
        };
        citation.creators.push(creatorObj);
    }
    return citation;
}

function makeCreatorsTranslator(creatorType) {
    function translateProp(citation, metadata, key) {
        citation = addCreators(citation, metadata[key], creatorType);
        return citation;
    }
    return {
        name: 'creators',
        subname: creatorType,
        translate: translateProp
    };
}

function addDate(citation, metadataValue, dateFieldName) {
    if (!metadataValue) {
        return citation;
    }
    if (!dateFieldName) {
        dateFieldName = 'date';
    }
    if (!citation[dateFieldName]) {
        let date;
        let dateParts;
        let dString;
        // Create largely empty chrono date
        // This creates values in implied but not known components
        const c = new chrono.ParsedComponents(null, '1970-01-01');
        if (metadataValue['date-parts'] && metadataValue['date-parts'][0] &&
            Array.isArray(metadataValue['date-parts'][0])) {
            dateParts = metadataValue['date-parts'][0];
        }
        // Year, month, & day included
        if (dateParts && dateParts[0] && dateParts[1] && dateParts[2]) {
            c.assign('year', dateParts[0]);
            c.assign('month', dateParts[1]);
            c.assign('day', dateParts[2]);
            c.assign('timezoneOffset', 0);
            date = c.date();
            if (date && isFinite(date)) {
                dString = date.toISOString().split('T').shift(); // Outputs format YYYY-MM-DD
            }
        // No day, year and month only
        } else if (dateParts && dateParts[0] && dateParts[1]) {
            c.assign('year', dateParts[0]);
            c.assign('month', dateParts[1]);
            c.assign('timezoneOffset', 0);
            date = c.date();
            if (date && isFinite(date)) {
                dString = date.toISOString().slice(0, 7); // Outputs format YYYY-MM
            }
        // Year only - uses regex instead
        } else if (dateParts && dateParts[0]) {
            const reYear = /^[1-9]\d{3,}$/;
            const yearString = dateParts[0].toString();
            const match = yearString.match(reYear);
            if (match && match[0]) {
                dString = match[0];
            }
        }

        if (dString) {
            citation[dateFieldName] = dString;
        }
    }
    return citation;
}

function makeDatePartsTranslator(dateFieldName) {
    function translateProp(citation, metadata, key) {
        if (metadata && key && metadata[key]) {
            citation = addDate(citation, metadata[key], dateFieldName);
        }
        citation = fixDate(citation, dateFieldName);
        return citation;
    }
    return {
        name: dateFieldName,
        translate: translateProp
    };
}

/**
 * crossRef field values : translators made with Zotero type field values
 *
 * @type {Object}
 */

/* Complete list of Zotero types with field translators in the Object */
exports.artwork = { //  No publisher
    title: makeTranslator('title'),
    issued: makeDatePartsTranslator('date'),
    URL: makeTranslator('url'),
    author: makeCreatorsTranslator('artist')
};
exports.attachment = {
    title: makeTranslator('title')
};
exports.audioRecording = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    author: makeCreatorsTranslator('performer'),
    issued: makeDatePartsTranslator('date'),
    volume: makeTranslator('volume'),
    publisher: makeTranslator('label'),
    'publisher-location': makeTranslator('place'),
    'container-title': makeTranslator('seriesTitle'),
    ISBN: makeListTranslator('ISBN', vISBN)
};
exports.bill = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    issue: makeTranslator('billNumber'),
    page: makeTranslator('codePages'),
    author: makeCreatorsTranslator('sponsor'),
    issued: makeDatePartsTranslator('date'),
    volume: makeTranslator('codeVolume')
};
exports.blogPost = {
    issued: makeDatePartsTranslator('date'),
    URL: makeTranslator('url'),
    title: makeTranslator('title'),
    'container-title': makeTranslator('blogTitle'),
    author: makeCreatorsTranslator('author')
};
exports.book = {
    issued: makeDatePartsTranslator('date'),
    URL: makeTranslator('url'),
    publisher: makeTranslator('publisher'),
    'publisher-location': makeTranslator('place'),
    author: makeCreatorsTranslator('author'),
    editor: makeCreatorsTranslator('editor'),
    'container-title': makeTranslator('series'),
    title: makeTranslator('title'),
    volume: makeTranslator('volume'),
    ISBN: makeListTranslator('ISBN', vISBN)
};
exports.bookSection = {
    issued: makeDatePartsTranslator('date'),
    URL: makeTranslator('url'),
    publisher: makeTranslator('publisher'),
    'publisher-location': makeTranslator('place'),
    page: makeTranslator('pages'),
    'container-title': makeTranslator('bookTitle'),
    author: makeCreatorsTranslator('author'),
    editor: makeCreatorsTranslator('editor'),
    title: makeTranslator('title'),
    volume: makeTranslator('volume'),
    ISBN: makeListTranslator('ISBN', vISBN)
};
exports.case = {
    title: makeTranslator('caseName'),
    URL: makeTranslator('url'),
    issued: makeDatePartsTranslator('dateDecided'),
    issue: makeTranslator('docketNumber'),
    volume: makeTranslator('reporterVolume'),
    author: makeCreatorsTranslator('author'),
    page: makeTranslator('firstPage')
};
exports.computerProgram = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    issued: makeDatePartsTranslator('date'),
    publisher: makeTranslator('company'),
    'publisher-location': makeTranslator('place'),
    author: makeCreatorsTranslator('programmer'),
    ISBN: makeListTranslator('ISBN', vISBN)
};
exports.conferencePaper = {
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    URL: makeTranslator('url'),
    DOI: makeTranslator('DOI'),
    editor: makeCreatorsTranslator('editor'),
    issued: makeDatePartsTranslator('date'),
    volume: makeTranslator('volume'),
    'container-title': makeTranslator('proceedingsTitle'),
    conference: makeTranslator('conferenceName'),
    publisher: makeTranslator('publisher'),
    'publisher-location': makeTranslator('place'),
    ISBN: makeListTranslator('ISBN', vISBN),
    page: makeTranslator('pages')
};
exports.dictionaryEntry = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    author: makeCreatorsTranslator('author'),
    editor: makeCreatorsTranslator('editor'),
    'container-title': makeTranslator('dictionaryTitle'),
    publisher: makeTranslator('publisher'),
    'publisher-location': makeTranslator('place'),
    page: makeTranslator('pages'),
    ISBN: makeListTranslator('ISBN', vISBN)
};
exports.document = {
    author: makeCreatorsTranslator('author'),
    URL: makeTranslator('url'),
    editor: makeCreatorsTranslator('editor'),
    issued: makeDatePartsTranslator('date'),
    publisher: makeTranslator('publisher'),
    title: makeTranslator('title')
};
exports.email = {
    issued: makeDatePartsTranslator('date'),
    URL: makeTranslator('url'),
    title: makeTranslator('subject'),
    author: makeCreatorsTranslator('author')
};
exports.encyclopediaArticle = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    author: makeCreatorsTranslator('author'),
    editor: makeCreatorsTranslator('editor'),
    issued: makeDatePartsTranslator('date'),
    'container-title': makeTranslator('encyclopediaTitle'),
    publisher: makeTranslator('publisher'),
    'publisher-location': makeTranslator('place'),
    page: makeTranslator('pages'),
    ISBN: makeListTranslator('ISBN', vISBN)
};
exports.film = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    issued: makeDatePartsTranslator('date'),
    author: makeCreatorsTranslator('director')
};
exports.forumPost = {
    issued: makeDatePartsTranslator('date'),
    URL: makeTranslator('url'),
    title: makeTranslator('title'),
    'container-title': makeTranslator('forumTitle'),
    author: makeCreatorsTranslator('author')
};
exports.hearing = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    author: makeCreatorsTranslator('contributor'),
    publisher: makeTranslator('publisher'),
    'publisher-location': makeTranslator('place'),
    issued: makeDatePartsTranslator('date'),
    page: makeTranslator('pages')
};
exports.instantMessage = {
    issued: makeDatePartsTranslator('date'),
    URL: makeTranslator('url'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author')
};
exports.interview = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    issued: makeDatePartsTranslator('date'),
    author: makeCreatorsTranslator('interviewee')
};
exports.journalArticle = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    DOI: makeTranslator('DOI'),
    author: makeCreatorsTranslator('author'),
    editor: makeCreatorsTranslator('editor'),
    issue: makeTranslator('issue'),
    volume: makeTranslator('volume'),
    page: makeTranslator('pages'),
    issued: makeDatePartsTranslator('date'),
    'container-title': makeTranslator('publicationTitle'),
    ISSN: makeListTranslator('ISSN', vISSN)
};
exports.letter = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    issued: makeDatePartsTranslator('date'),
    author: makeCreatorsTranslator('author')
};
exports.magazineArticle = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    author: makeCreatorsTranslator('author'),
    page: makeTranslator('pages'),
    issued: makeDatePartsTranslator('date'),
    'container-title': makeTranslator('publicationTitle'),
    ISSN: makeListTranslator('ISSN', vISSN)
};
exports.manuscript = {
    title: makeTranslator('title'),
    'publisher-location': makeTranslator('place'),
    URL: makeTranslator('url'),
    issued: makeDatePartsTranslator('date'),
    author: makeCreatorsTranslator('author')
};
exports.map = {
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('cartographer'),
    URL: makeTranslator('url'),
    editor: makeCreatorsTranslator('seriesEditor'),
    issued: makeDatePartsTranslator('date'),
    'container-title': makeTranslator('seriesTitle'),
    publisher: makeTranslator('publisher'),
    'publisher-location': makeTranslator('place'),
    ISBN: makeListTranslator('ISBN', vISBN)
};
exports.newspaperArticle = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    author: makeCreatorsTranslator('author'),
    page: makeTranslator('pages'),
    'publisher-location': makeTranslator('place'),
    issued: makeDatePartsTranslator('date'),
    'container-title': makeTranslator('publicationTitle'),
    ISSN: makeListTranslator('ISSN', vISSN)
};
exports.note = {}; //  Has no fields
exports.patent = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    issue: makeTranslator('patentNumber'),
    page: makeTranslator('pages'),
    'publisher-location': makeTranslator('place'),
    issued: makeDatePartsTranslator('issueDate'),
    author: makeCreatorsTranslator('inventor')
};
exports.podcast = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    author: makeCreatorsTranslator('podcaster'),
    issue: makeTranslator('episodeNumber'),
    'container-title': makeTranslator('seriesTitle')
};
exports.presentation = {
    issued: makeDatePartsTranslator('date'),
    URL: makeTranslator('url'),
    title: makeTranslator('title'),
    'publisher-location': makeTranslator('place'),
    author: makeCreatorsTranslator('presenter')
};
exports.radioBroadcast = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    issued: makeDatePartsTranslator('date'),
    publisher: makeTranslator('network'),
    'publisher-location': makeTranslator('place'),
    'container-title': makeTranslator('programTitle'),
    issue: makeTranslator('episodeNumber'),
    author: makeCreatorsTranslator('director')
};
exports.report = {
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    URL: makeTranslator('url'),
    editor: makeCreatorsTranslator('seriesEditor'),
    issue: makeTranslator('reportNumber'),
    page: makeTranslator('pages'),
    issued: makeDatePartsTranslator('date'),
    'container-title': makeTranslator('seriesTitle'),
    'publisher-location': makeTranslator('place'),
    publisher: makeTranslator('institution')
};
exports.statute = {
    title: makeTranslator('nameOfAct'),
    URL: makeTranslator('url'),
    issue: makeTranslator('publicLawNumber'),
    page: makeTranslator('pages'),
    issued: makeDatePartsTranslator('dateEnacted'),
    author: makeCreatorsTranslator('author')
};
exports.thesis = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    publisher: makeTranslator('university'),
    'publisher-location': makeTranslator('place'),
    issued: makeDatePartsTranslator('date'),
    author: makeCreatorsTranslator('author')
};
exports.tvBroadcast = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    issue: makeTranslator('episodeNumber'),
    'container-title': makeTranslator('programTitle'),
    'publisher-location': makeTranslator('place'),
    publisher: makeTranslator('network'),
    issued: makeDatePartsTranslator('date'),
    author: makeCreatorsTranslator('director')
};
exports.videoRecording = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    author: makeCreatorsTranslator('director'),
    publisher: makeTranslator('studio'),
    'publisher-location': makeTranslator('place'),
    issued: makeDatePartsTranslator('date'),
    'container-title': makeTranslator('seriesTitle'),
    ISBN: makeListTranslator('ISBN', vISBN)
};
exports.webpage = {
    title: makeTranslator('title'),
    URL: makeTranslator('url'),
    issued: makeDatePartsTranslator('date'),
    'container-title': makeTranslator('websiteTitle'),
    author: makeCreatorsTranslator('author')
};
