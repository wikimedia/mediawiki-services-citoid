'use strict';

const ex = require('../Exporter.js');
const ut = require('./util/index.js');

const fixDate = ex.fixDate;
const fixLang = ex.fixLang;

const makeTranslator = ut.makeTranslator;
const makeCreatorsTranslator = ut.makeCreatorsTranslator;

/**
 * Dublin core type values : Zotero type field values
 *
 * @type {Object}
 */
exports.types = {
    Collection: 'webpage',
    Dataset: 'webpage',
    Event: 'webpage',
    Image: 'artwork',
    'Image.Moving': 'videoRecording',
    InteractiveResource: 'webpage',
    MovingImage: 'videoRecording',
    PhysicalObject: 'webpage',
    Service: 'webpage',
    Software: 'computerProgram',
    Sound: 'audioRecording',
    StillImage: 'artwork',
    Text: 'webpage'
};

/**
 * Object with fields common to all but a few types
 *
 * @type {Object}
 */
exports.generalWithAuthor = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('author'),
    contributor: makeCreatorsTranslator('contributor')
};

exports.generalWithAuthorAndPublisher = Object.assign({}, exports.generalWithAuthor, {
    publisher: makeTranslator('publisher')
});

/* Complete list of Zotero types with field translators in the Object */
exports.artwork = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('artist'),
    contributor: makeCreatorsTranslator('contributor')
};
exports.attachment = {
    title: makeTranslator('title')
};
exports.audioRecording = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('performer'),
    contributor: makeCreatorsTranslator('contributor'),
    publisher: makeTranslator('label')
};
exports.bill = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('sponsor'),
    contributor: makeCreatorsTranslator('contributor')
};
exports.blogPost = exports.generalWithAuthor;
exports.book = exports.generalWithAuthorAndPublisher;
exports.bookSection = exports.generalWithAuthorAndPublisher;
exports.case = {
    creator: makeCreatorsTranslator('author'),
    contributor: makeCreatorsTranslator('contributor'),
    title: makeTranslator('caseName'),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote')
};
exports.computerProgram = { // No language field
    abstract: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    creator: makeCreatorsTranslator('programmer'),
    contributor: makeCreatorsTranslator('contributor'),
    publisher: makeTranslator('company')
};
exports.conferencePaper = exports.generalWithAuthorAndPublisher;
exports.dictionaryEntry = exports.generalWithAuthorAndPublisher;
exports.document = exports.generalWithAuthorAndPublisher;
exports.email = {
    author: makeCreatorsTranslator('author'),
    contributor: makeCreatorsTranslator('contributor'),
    title: makeTranslator('subject'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote')
};
exports.encyclopediaArticle = exports.generalWithAuthorAndPublisher;
exports.film = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('director'),
    contributor: makeCreatorsTranslator('contributor'),
    publisher: makeTranslator('distributor')
};
exports.forumPost = exports.generalWithAuthor;
exports.hearing = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('contributor'),
    contributor: makeCreatorsTranslator('contributor'),
    publisher: makeTranslator('publisher')
};
exports.instantMessage = exports.generalWithAuthor;
exports.interview = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('interviewee'),
    contributor: makeCreatorsTranslator('contributor'),
    publisher: makeTranslator('publisher')
};
exports.journalArticle = exports.generalWithAuthor;
exports.letter = exports.generalWithAuthor;
exports.magazineArticle = exports.generalWithAuthor;
exports.manuscript = exports.generalWithAuthor;
exports.map = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('cartographer'),
    contributor: makeCreatorsTranslator('contributor'),
    publisher: makeTranslator('publisher')
};
exports.newspaperArticle = exports.generalWithAuthor;
exports.note = {}; // Has no fields
exports.patent = {
    creator: makeCreatorsTranslator('inventor'),
    contributor: makeCreatorsTranslator('contributor'),
    title: makeTranslator('title'),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote')
};
exports.podcast = {
    creator: makeCreatorsTranslator('podcaster'),
    contributor: makeCreatorsTranslator('contributor'),
    title: makeTranslator('title'),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote')
};
exports.presentation = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('presenter'),
    contributor: makeCreatorsTranslator('contributor')
};
exports.radioBroadcast = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('director'),
    publisher: makeTranslator('network')
};
exports.report = Object.assign({}, exports.generalWithAuthor, {
    publisher: makeTranslator('institution')
});
exports.statute = {
    creator: makeCreatorsTranslator('author'),
    contributor: makeCreatorsTranslator('contributor'),
    title: makeTranslator('nameOfAct'),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote')
};
exports.thesis = Object.assign({}, exports.generalWithAuthor, {
    publisher: makeTranslator('university')
});
exports.tvBroadcast = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('director'),
    contributor: makeCreatorsTranslator('contributor'),
    publisher: makeTranslator('network')
};
exports.videoRecording = {
    title: makeTranslator('title'),
    date: makeTranslator('date', fixDate),
    language: makeTranslator('language', fixLang),
    abstract: makeTranslator('abstractNote'),
    creator: makeCreatorsTranslator('director'),
    contributor: makeCreatorsTranslator('contributor'),
    publisher: makeTranslator('studio')
};
exports.webpage = exports.generalWithAuthor;
