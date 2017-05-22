'use strict';

var ex = require('../Exporter.js');
var ut = require('./util/index.js');

var fixDate = ex.fixDate;
var fixLang = ex.fixLang;
var vISBN = ex.validateISBN;
var vISSN = ex.validateISSN;

var makeTranslator = ut.makeTranslator;
var makeCreatorsTranslator = ut.makeCreatorsTranslator;
var makeListTranslator = ut.makeListTranslator;
var makePagesTranslator = ut.makePagesTranslator;

/**
 * Translator for MARCXML
 */

exports.artwork = { // No publisher
    a520: makeTranslator('abstractNote'), // Summary, etc.
    c260: makeTranslator('date', fixDate), // Date of publication, distribution, etc.
    f100: makeTranslator('date', fixDate), // Date of a work
    b260: makeTranslator('publisher'), // Name of publisher, distributor, etc
    t100: makeTranslator('title'),
    a245: makeTranslator('title'),
    c245: makeCreatorsTranslator('artist'), // Personal name
    a100: makeCreatorsTranslator('artist'), // Personal name
    a700: makeCreatorsTranslator('contributor'),
    l100: makeTranslator('language', fixLang)
};
exports.attachment = {
    t100: makeTranslator('title'),
    a245: makeTranslator('title')
};
exports.audioRecording = {
    a520: makeTranslator('abstractNote'), // Summary, etc.
    c260: makeTranslator('date', fixDate), // Date of publication, distribution, etc.
    f100: makeTranslator('date', fixDate), // Date of a work
    b260: makeTranslator('label'), // Name of publisher, distributor, etc
    t100: makeTranslator('title'),
    a245: makeTranslator('title'),
    c245: makeCreatorsTranslator('performer'), // Personal name
    a100: makeCreatorsTranslator('performer'), // Personal name
    d773: makeTranslator('place'),
    a260: makeTranslator('place'), // Place of publication, distribution, etc.,
    a264: makeTranslator('place'), // Place of publication, distribution, etc.,
    a700: makeCreatorsTranslator('contributor'),
    l100: makeTranslator('language', fixLang),
    g773: makeTranslator('volume'),
    a020: makeListTranslator('ISBN', vISBN) // International Standard Book Number
};
exports.bill = {
    a520: makeTranslator('abstractNote'), // Summary, etc.
    c260: makeTranslator('date', fixDate), // Date of publication, distribution, etc.
    f100: makeTranslator('date', fixDate), // Date of a work
    b260: makeTranslator('label'), // Name of publisher, distributor, etc
    t100: makeTranslator('title'),
    a245: makeTranslator('title'),
    c245: makeCreatorsTranslator('sponsor'), // Personal name
    a100: makeCreatorsTranslator('sponsor'), // Personal name
    a700: makeCreatorsTranslator('contributor'),
    l100: makeTranslator('language', fixLang),
    a020: makeListTranslator('ISBN', vISBN) // International Standard Book Number
};
exports.blogPost = {
    t100: makeTranslator('title'), // Title of work
    a245: makeTranslator('title'), // Title
    c260: makeTranslator('date', fixDate), // Date of publication, distribution, etc.
    f100: makeTranslator('date', fixDate), // Date of a work
    l100: makeTranslator('language', fixLang), // Language of a work
    a520: makeTranslator('abstractNote'), // Summary, etc.
    c245: makeCreatorsTranslator('author'), // Personal name
    a100: makeCreatorsTranslator('author'), // Personal name
    t773: makeTranslator('blogTitle'),
    a700: makeCreatorsTranslator('contributor')
};
exports.book = {
    t100: makeTranslator('title'), // Title of work
    a245: makeTranslator('title'), // Title
    c260: makeTranslator('date', fixDate), // Date of publication, distribution, etc.
    f100: makeTranslator('date', fixDate), // Date of a work
    l100: makeTranslator('language', fixLang), // Language of a work
    a520: makeTranslator('abstractNote'), // Summary, etc.
    a250: makeTranslator('edition'), // Edition statement
    b773: makeTranslator('edition'),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'), // Place of publication, distribution, etc.,
    a020: makeListTranslator('ISBN', vISBN), // International Standard Book Number
    b260: makeTranslator('publisher'), // Name of publisher, distributor, etc.
    c245: makeCreatorsTranslator('author'), // Personal name
    //a100: makeCreatorsTranslator('author'), // Personal name
    a700: makeCreatorsTranslator('contributor'),
    g773: makeTranslator('volume'),
    a300: makeTranslator('numPages')
};
exports.bookSection = {
    t100: makeTranslator('title'), // Title of work
    a245: makeTranslator('title'), // Title
    c260: makeTranslator('date', fixDate), // Date of publication, distribution, etc.
    f100: makeTranslator('date', fixDate), // Date of a work
    l100: makeTranslator('language', fixLang), // Language of a work
    a520: makeTranslator('abstractNote'), // Summary, etc.
    a250: makeTranslator('edition'), // Edition statement
    b773: makeTranslator('edition'),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'), // Place of publication, distribution, etc.,
    a020: makeListTranslator('ISBN', vISBN), // International Standard Book Number
    b260: makeTranslator('publisher'), // Name of publisher, distributor, etc.
    c245: makeCreatorsTranslator('author'), // Personal name
    a100: makeCreatorsTranslator('author'), // Personal name
    a700: makeCreatorsTranslator('contributor'),
    t773: makeTranslator('bookTitle'),
    g773: makeTranslator('volume')
};
exports['case'] =  { // No publisher
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('caseName'),
    f100: makeTranslator('dateDecided'),
    c260: makeTranslator('dateDecided'),
    a100: makeCreatorsTranslator('author'),
    l100: makeTranslator('language', fixLang),
    q773: makeTranslator('firstPage')
};
exports.computerProgram = { // No language field
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('programmer'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    a020: makeListTranslator('ISBN', vISBN)
};
exports.conferencePaper = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('author'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    g773: makeTranslator('volume'),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    t773: makeTranslator('proceedingsTitle'),
    b260: makeTranslator('publisher'),
    l100: makeTranslator('language', fixLang),
    a020: makeListTranslator('ISBN', vISBN)
};
exports.dictionaryEntry = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('author'),
    f100: makeTranslator('date',fixDate),
    c260: makeTranslator('date', fixDate),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    t773: makeTranslator('dictionaryTitle'),
    b260: makeTranslator('publisher'),
    l100: makeTranslator('language', fixLang),
    a020: makeListTranslator('ISBN', vISBN)
};
exports.document = exports.generalWithAuthor;
exports.email = {
    a520: makeTranslator('abstractNote'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    t100: makeTranslator('subject'),
    l100: makeTranslator('language', fixLang),
    a100: makeCreatorsTranslator('author')
};
exports.encyclopediaArticle = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('author'),
    f100: makeTranslator('date', fixDate),
    t773: makeTranslator('encyclopediaTitle'),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    b260: makeTranslator('publisher'),
    l100: makeTranslator('language', fixLang),
    q773: makeTranslator('pages'),
    a020: makeListTranslator('ISBN', vISBN)
};
exports.film =  {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('director'),
    c260: makeTranslator('date', fixDate),
    f100: makeTranslator('date', fixDate)
};
exports.forumPost = exports.blogPost;
exports.hearing = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('contributor'),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    c260: makeTranslator('date', fixDate),
    f100: makeTranslator('date', fixDate),
    q773: makeTranslator('pages')
};
exports.instantMessage = exports.blogPost;
exports.interview = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('interviewee'),
    c260: makeTranslator('date', fixDate),
    f100: makeTranslator('date', fixDate),
    l100: makeTranslator('language', fixLang)
};
exports.journalArticle = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('author'),
    r773: makeTranslator('issue'),
    g773: makeTranslator('volume'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    a490: makeTranslator('seriesTitle'),
    t773: makeTranslator('publicationTitle'),
    x773: makeListTranslator('ISSN', vISSN),
    l100: makeTranslator('language', fixLang)
};
exports.letter = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('author'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    l100: makeTranslator('language', fixLang)
};
exports.magazineArticle = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('author'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    t773: makeTranslator('publicationTitle'),
    l100: makeTranslator('language', fixLang),
    x773: makeListTranslator('ISSN', vISSN)
};
exports.manuscript = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('author'),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    l100: makeTranslator('language', fixLang)
};
exports.map =  {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('cartographer'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    t773: makeTranslator('seriesTitle'),
    a490: makeTranslator('seriesTitle'),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    b260: makeTranslator('publisher'),
    l100: makeTranslator('language', fixLang),
    a020: makeListTranslator('ISBN', vISBN)
};
exports.newspaperArticle =  {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('author'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    t773: makeTranslator('publicationTitle'),
    l100: makeTranslator('language', fixLang),
    x773: makeListTranslator('ISSN', vISSN)
};
exports.note = {}; // Has no fields
exports.patent =  {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    l100: makeTranslator('language', fixLang),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    a100: makeCreatorsTranslator('inventor'),
    f100: makeTranslator('issueDate'),
    c260: makeTranslator('issueDate')
};
exports.podcast = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('podcaster'),
    t773: makeTranslator('seriesTitle'),
    a490: makeTranslator('seriesTitle'),
    l100: makeTranslator('language', fixLang)
};
exports.presentation =  {
    a520: makeTranslator('abstractNote'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    t100: makeTranslator('title'),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    l100: makeTranslator('language', fixLang),
    a100: makeCreatorsTranslator('presenter')
};
exports.radioBroadcast = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('director'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    l100: makeTranslator('language', fixLang)
};
exports.report = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('author'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    t773: makeTranslator('seriesTitle'),
    a490: makeTranslator('seriesTitle'),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    r773: makeTranslator('number'),
    u773: makeTranslator('number'),
    l100: makeTranslator('language', fixLang)
};
exports.statute = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('nameOfAct'),
    a100: makeCreatorsTranslator('author'),
    f100: makeTranslator('dateEnacted'),
    c260: makeTranslator('dateEnacted', fixDate),
    l100: makeTranslator('language', fixLang)
};
exports.thesis = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('author'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    a264: makeTranslator('place'),
    d773: makeTranslator('place'),
    a260: makeTranslator('place'),
    l100: makeTranslator('language', fixLang),
    b260: makeTranslator('university')
};
exports.tvBroadcast = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('director'),
    f100: makeTranslator('date', fixDate),
    c260: makeTranslator('date', fixDate),
    a264: makeTranslator('place'),
    a260: makeTranslator('place'),
    d773: makeTranslator('place'),
    l100: makeTranslator('language', fixLang)
};
exports.videoRecording = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('director'),
    f100: makeTranslator('date',fixDate),
    c260: makeTranslator('date', fixDate),
    t773: makeTranslator('seriesTitle'),
    a490: makeTranslator('seriesTitle'),
    a264: makeTranslator('place'),
    a260: makeTranslator('place'),
    d773: makeTranslator('place'),
    l100: makeTranslator('language', fixLang),
    a020: makeListTranslator('ISBN', vISBN)
};
exports.webpage = {
    a520: makeTranslator('abstractNote'),
    t100: makeTranslator('title'),
    a100: makeCreatorsTranslator('author'),
    f100: makeTranslator('date',fixDate),
    l100: makeTranslator('language', fixLang)
};