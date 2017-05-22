'use strict';

var ut = require('./util/index.js');

var makeTranslator = ut.makeTranslator;
var addCreators = ut.addCreators;
var eg = ut.extendGeneral;
var makeCreatorsTranslator = ut.makeCreatorsTranslator;

/**
 * General field values : Zotero type field values
 * @type {Object}
 */

exports.general = {
    canonical: makeTranslator('url'),
    description: makeTranslator('abstractNote'),
    publisher: makeTranslator('publisher'),
    lang: makeTranslator('language'),
    title: makeTranslator('title')
};

// Shortcut for extendGeneral utility
function extendGeneral(creatorName){
    return eg(exports.general, creatorName, 'author');
}

// Create a general type with the author in the creator field once since it is used many times.
exports.generalWithAuthor = extendGeneral('author');
exports.generalNoPublisher = {
    author: makeCreatorsTranslator('author'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('title')
};

/* Complete list of Zotero types with field translators in the Object */
exports.artwork = {
    author: makeCreatorsTranslator('artist'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('title')
};
exports.attachment = {
    title: makeTranslator('title')
};
exports.audioRecording =  {
    author: makeCreatorsTranslator('performer'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('title')
};
exports.bill = {
    author: makeCreatorsTranslator('sponsor'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('title')
};
exports.blogPost = exports.generalNoPublisher;
exports.book = exports.generalWithAuthor;
exports.bookSection = exports.generalWithAuthor;
exports['case'] = {
    author: makeCreatorsTranslator('author'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('caseName')
};
exports.computerProgram = { // No language field
    title: makeTranslator('title'),
    creator: makeCreatorsTranslator('programmer')
};
exports.conferencePaper = exports.generalWithAuthor;
exports.dictionaryEntry = exports.generalWithAuthor;
exports.document = exports.generalWithAuthor;
exports.email =  {
    author: makeCreatorsTranslator('author'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('subject')
};
exports.encyclopediaArticle = exports.generalWithAuthor;
exports.film = {
    author: makeCreatorsTranslator('director'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('title')
};
exports.forumPost = exports.generalNoPublisher;
exports.hearing = extendGeneral('contributor');
exports.instantMessage = exports.generalNoPublisher;
exports.interview =  {
    author: makeCreatorsTranslator('interviewee'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('title')
};
exports.journalArticle = exports.generalNoPublisher;
exports.letter = exports.generalNoPublisher;
exports.magazineArticle = exports.generalNoPublisher;
exports.manuscript = exports.generalNoPublisher;
exports.map = extendGeneral('cartographer');
exports.newspaperArticle =  {
    author: makeCreatorsTranslator('author'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('title')
};
exports.note = {}; // Has no fields
exports.patent = {
    author: makeCreatorsTranslator('inventor'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('title')
};
exports.podcast =  {
    author: makeCreatorsTranslator('podcaster'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('title')
};
exports.presentation =  {
    author: makeCreatorsTranslator('presenter'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('title')
};
exports.radioBroadcast =  {
    author: makeCreatorsTranslator('director'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('title')
};
exports.report = exports.generalNoPublisher;
exports.statute = {
    author: makeCreatorsTranslator('author'),
    canonical: makeTranslator('url'),
    lang: makeTranslator('language'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('nameOfAct')
};
exports.thesis = exports.generalNoPublisher;
exports.tvBroadcast = exports.radioBroadcast;
exports.videoRecording = exports.tvBroadcast;
exports.webpage = exports.generalNoPublisher;