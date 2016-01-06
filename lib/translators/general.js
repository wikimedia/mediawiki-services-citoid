'use strict';

var makeTranslator = require('./util/index.js').makeTranslator;
var addCreators = require('./util/index.js').addCreators;
var eg = require('./util/index.js').extendGeneral;
var makeCreatorsTranslator = require('./util/index.js').makeCreatorsTranslator;

/**
 * General field values : Zotero type field values
 * @type {Object}
 */

exports.general = {
    canonical: makeTranslator('url'),
    description: makeTranslator('abstractNote'),
    publisher: makeTranslator('publisher'),
    title: makeTranslator('title')
};

// Shortcut for extendGeneral utility
function extendGeneral(creatorName){
    return eg(exports.general, creatorName);
}

// Create a general type with the author in the creator field once since it is used many times.
exports.generalWithAuthor = extendGeneral('author');

/* Complete list of Zotero types with field translators in the Object */
exports.artwork = extendGeneral('artist');
exports.attachment = {
    title: makeTranslator('title')
};
exports.audioRecording = extendGeneral('performer');
exports.bill = extendGeneral('sponsor');
exports.blogPost = exports.generalWithAuthor;
exports.book = exports.generalWithAuthor;
exports.bookSection = exports.generalWithAuthor;
exports['case'] = {
	author: makeCreatorsTranslator('author'),
    canonical: makeTranslator('url'),
    description: makeTranslator('abstractNote'),
    publisher: makeTranslator('publisher'),
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
    description: makeTranslator('abstractNote'),
    title: makeTranslator('subject')
};
exports.encyclopediaArticle = exports.generalWithAuthor;
exports.film = extendGeneral('director');
exports.forumPost = exports.generalWithAuthor;
exports.hearing = extendGeneral('contributor');
exports.instantMessage = exports.generalWithAuthor;
exports.interview = extendGeneral('interviewee');
exports.journalArticle = exports.generalWithAuthor;
exports.letter = exports.generalWithAuthor;
exports.magazineArticle = exports.generalWithAuthor;
exports.manuscript = exports.generalWithAuthor;
exports.map = extendGeneral('cartographer');
exports.newspaperArticle = exports.generalWithAuthor;
exports.note = {}; // Has no fields
exports.patent = extendGeneral('inventor');
exports.podcast = extendGeneral('podcaster');
exports.presentation = extendGeneral('presenter');
exports.radioBroadcast = extendGeneral('director');
exports.report = exports.generalWithAuthor;
exports.statute = {
    author: makeCreatorsTranslator('author'),
    canonical: makeTranslator('url'),
    description: makeTranslator('abstractNote'),
    title: makeTranslator('nameOfAct')
};
exports.thesis = exports.generalWithAuthor;
exports.tvBroadcast = extendGeneral('director');
exports.videoRecording = extendGeneral('director');
exports.webpage = exports.generalWithAuthor;