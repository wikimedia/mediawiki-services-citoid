'use strict';

var ex = require('../Exporter.js');
var makeTranslator = require('./util/index.js').makeTranslator;

var fixDate = ex.fixDate;
var fixLang = ex.fixLang;
var vISBN = ex.validateISBN;

/**
 * Open graph type field values : Zotero type field values
 * @type {Object}
 */
exports.types = {
    website: 'webpage',
    article: 'newspaperArticle', // Previously blogPost, could also be newspaperArticle or magazineArticle
    book: 'book',
    profile: 'webpage', // May be possible to obtain more information from this link a.k.a. names
    'music.song': 'audioRecording',
    'music.album': 'audioRecording',
    'music.playlist': 'webpage',
    'music.radiostation': 'webpage',
    'video.movie': 'videoRecording',
    'video.episode': 'videoRecording',
    'video.tv_show': 'videoRecording',
    'video.other' : 'videoRecording'
};

/**
 * Open graph general properties : Zotero properties
 * @type {Object}
 */

exports.general = {
    title: makeTranslator('title'), // general OG property, common to all Zotero types
    url: makeTranslator('url'), // general OG property, common to all Zotero types
    description: makeTranslator('abstractNote'), // general OG property, abstractNote common to all Zotero types
    locale: makeTranslator('language', fixLang), // general OG property, common to all Zotero types
};

// Includes both possible date fields- will overwrite if first if both are present
exports.generalWithDate = Object.assign({}, exports.general, {
    published_time: makeTranslator('date', fixDate),
    release_date: makeTranslator('date', fixDate)
});

/**
 * Translator for Zotero type: webpage
 * Open graph webpage properties : Zotero properties
 * webpage has no specific properties other than what is defined in general og properties
 * @type {Object}
 */
exports.artwork = exports.generalWithDate;
exports.attachment = {
    title: makeTranslator('title')
};
exports.audioRecording = Object.assign({}, exports.general, {
    release_date: makeTranslator('date',fixDate), // only present in music.album
    isbn: makeTranslator('ISBN', vISBN)
});
exports.bill = exports.generalWithDate;
exports.blogPost = {
    title: makeTranslator('title'), // general OG property, common to all Zotero types
    url: makeTranslator('url'), // general OG property, common to all Zotero types
    description: makeTranslator('abstractNote'), // general OG property, abstractNote common to all Zotero types
    locale: makeTranslator('language', fixLang), // general OG property, common to all Zotero types
    published_time: makeTranslator('date', fixDate),
    site_name: makeTranslator('blogTitle')
};
exports.book = Object.assign({}, exports.general, {
    release_date: makeTranslator('date', fixDate),
    isbn: makeTranslator('ISBN', vISBN)
});
exports.bookSection = exports.book;
exports['case'] = {
    title: makeTranslator('caseName'),
    url: makeTranslator('url'),
    description: makeTranslator('abstractNote'),
    locale: makeTranslator('language', fixLang)
};
exports.computerProgram = { // No language field
    title: makeTranslator('title'),
    url: makeTranslator('url'),
    description: makeTranslator('abstractNote'),
    isbn: makeTranslator('ISBN')
};
exports.conferencePaper = Object.assign({}, exports.general, {
    isbn: makeTranslator('ISBN', vISBN)
});
exports.dictionaryEntry = {
    title: makeTranslator('title'), // general OG property, common to all Zotero types
    url: makeTranslator('url'), // general OG property, common to all Zotero types
    description: makeTranslator('abstractNote'), // general OG property, abstractNote common to all Zotero types
    locale: makeTranslator('language', fixLang), // general OG property, common to all Zotero types
    published_time: makeTranslator('date', fixDate),
    site_name: makeTranslator('dictionaryTitle'),
    isbn: makeTranslator('ISBN', vISBN)
};
exports.document = exports.generalWithDate;
exports.email = {
    title: makeTranslator('subject'),
    url: makeTranslator('url'),
    description: makeTranslator('abstractNote'),
    locale: makeTranslator('language', fixLang),
    published_time: makeTranslator('date', fixDate),
    release_date: makeTranslator('date', fixDate)
};
exports.encyclopediaArticle = {
    title: makeTranslator('title'), // general OG property, common to all Zotero types
    url: makeTranslator('url'), // general OG property, common to all Zotero types
    description: makeTranslator('abstractNote'), // general OG property, abstractNote common to all Zotero types
    locale: makeTranslator('language', fixLang), // general OG property, common to all Zotero types
    published_time: makeTranslator('date', fixDate),
    site_name: makeTranslator('encyclopediaTitle'),
    isbn: makeTranslator('ISBN', vISBN)
};
exports.film = Object.assign({}, exports.general, {
    duration: makeTranslator('runningTime'),
    release_date: makeTranslator('date', fixDate)
});
exports.forumPost = {
    title: makeTranslator('title'), // general OG property, common to all Zotero types
    url: makeTranslator('url'), // general OG property, common to all Zotero types
    description: makeTranslator('abstractNote'), // general OG property, abstractNote common to all Zotero types
    locale: makeTranslator('language', fixLang), // general OG property, common to all Zotero types
    published_time: makeTranslator('date', fixDate),
    site_name: makeTranslator('forumTitle')
};
exports.hearing = exports.generalWithDate;
exports.instantMessage = exports.generalWithDate;
exports.interview = exports.generalWithDate;
exports.journalArticle = {
    title: makeTranslator('title'), // general OG property, common to all Zotero types
    url: makeTranslator('url'), // general OG property, common to all Zotero types
    description: makeTranslator('abstractNote'), // general OG property, abstractNote common to all Zotero types
    locale: makeTranslator('language', fixLang), // general OG property, common to all Zotero types
    published_time: makeTranslator('date', fixDate),
    site_name: makeTranslator('publicationTitle')
};
exports.letter = exports.generalWithDate;
exports.magazineArticle = exports.journalArticle;
exports.manuscript = exports.generalWithDate;
exports.map = Object.assign({}, exports.general, {
    isbn: makeTranslator('ISBN', vISBN)
});
exports.newspaperArticle = exports.journalArticle;
exports.note = {}; // Has no fields
exports.patent = exports.general;
exports.podcast = exports.general;
exports.presentation = exports.generalWithDate;
exports.radioBroadcast = exports.generalWithDate;
exports.report = exports.generalWithDate;
exports.statute = {
    title: makeTranslator('nameOfAct'),
    url: makeTranslator('url'),
    description: makeTranslator('abstractNote'),
    locale: makeTranslator('language', fixLang)
};
exports.thesis = exports.generalWithDate;
exports.tvBroadcast = exports.generalWithDate;
exports.videoRecording =  Object.assign({}, exports.film, {
    isbn: makeTranslator('ISBN', vISBN)
});
exports.webpage = Object.assign({}, exports.generalWithDate, {
    site_name: makeTranslator('websiteTitle') // prefix og: general property, but should only be assigned if type webpage is used
});
