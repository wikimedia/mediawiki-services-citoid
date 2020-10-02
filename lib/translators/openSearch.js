'use strict';

// Use with WorldCat's OpenSearch API

const ex = require('../Exporter.js');
const ut = require('./util/index.js');

const makeTranslator = ut.makeTranslator;
const extendGeneral = ut.extendGeneral;
const makeCreatorsTranslator = ut.makeCreatorsTranslator;
const makeListTranslator = ut.makeListTranslator;

const vISBN = ex.validateISBN;

/**
 * bepress field values : translators made with Zotero type field values
 *
 * @type {Object}
 */

exports.general = {
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    id: makeTranslator('url')
};

// Shortcut for extendWithCreators utility
function extendWithCreators(creatorName) {
    return extendGeneral(exports.general, creatorName, 'author');
}

// Create a general type with the author in the creator field once since it is used many times.
exports.generalWithAuthor = extendWithCreators('author');

/* Complete list of Zotero types with field translators in the Object */
exports.artwork = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('artist'),
    'oclcterms:recordIdentifier': makeTranslator('oclc')
};
exports.attachment = {
    id: makeTranslator('url'),
    title: makeTranslator('title')
};
exports.audioRecording = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('performer'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    'dc:identifier': makeListTranslator('ISBN', vISBN, true)
};
exports.bill =  {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('sponsor'),
    'oclcterms:recordIdentifier': makeTranslator('oclc')
};
exports.blogPost = exports.generalWithAuthor;
exports.book = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    'dc:identifier': makeListTranslator('ISBN', vISBN, true)
};
exports.bookSection = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    'dc:identifier': makeListTranslator('ISBN', vISBN, true)
};
exports.case =  {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('caseName'),
    author: makeCreatorsTranslator('author'),
    'oclcterms:recordIdentifier': makeTranslator('oclc')
};
exports.computerProgram = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('programmer'),
    'dc:identifier': makeListTranslator('ISBN', vISBN, true),
    'oclcterms:recordIdentifier': makeTranslator('oclc')
};
exports.conferencePaper = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    'dc:identifier': makeListTranslator('ISBN', vISBN, true)
};
exports.dictionaryEntry = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    'dc:identifier': makeListTranslator('ISBN', vISBN, true)
};
exports.document = exports.generalWithAuthor;
exports.email = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('subject'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    author: makeCreatorsTranslator('author')
};
exports.encyclopediaArticle = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    'dc:identifier': makeListTranslator('ISBN', vISBN, true)
};
exports.film =  {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    author: makeCreatorsTranslator('director')
};
exports.forumPost = exports.blogPost;
exports.hearing = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    author: makeCreatorsTranslator('contributor'),
};
exports.instantMessage = exports.blogPost;
exports.interview = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('interviewee'),
    'oclcterms:recordIdentifier': makeTranslator('oclc')
};
exports.journalArticle = exports.generalWithAuthor;
exports.letter = exports.generalWithAuthor;
exports.magazineArticle = exports.generalWithAuthor;
exports.manuscript = exports.generalWithAuthor;
exports.map =  {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('cartographer'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    'dc:identifier': makeListTranslator('ISBN', vISBN, true)
};
exports.newspaperArticle = exports.magazineArticle;
exports.note = {}; // Has no fields
exports.patent =  {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    author: makeCreatorsTranslator('inventor'),
};
exports.podcast = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('podcaster'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
};
exports.presentation =  {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    author: makeCreatorsTranslator('presenter')
};
exports.radioBroadcast = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('director'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
};
exports.report = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    'oclcterms:recordIdentifier': makeTranslator('oclc')
};
exports.statute = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('nameOfAct'),
    author: makeCreatorsTranslator('author'),
    'oclcterms:recordIdentifier': makeTranslator('oclc')
};
exports.thesis = exports.generalWithAuthor;
exports.tvBroadcast = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('director'),
    'oclcterms:recordIdentifier': makeTranslator('oclc')
};
exports.videoRecording = {
    id: makeTranslator('url'),
    summary: makeTranslator('abstractNote'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('director'),
    'oclcterms:recordIdentifier': makeTranslator('oclc'),
    'dc:identifier': makeListTranslator('ISBN', vISBN, true)
};
exports.webpage = exports.generalWithAuthor;
