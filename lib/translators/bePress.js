'use strict';

// Used for both highwire and bepress data

const ex = require( '../Exporter.js' );
const ut = require( './util/index.js' );

const makeTranslator = ut.makeTranslator;
const makeCreatorsTranslator = ut.makeCreatorsTranslator;
const makePagesTranslator = ut.makePagesTranslator;
const makeListTranslator = ut.makeListTranslator;

const fixDate = ex.fixDate;
const fixLang = ex.fixLang;
const vISSN = ex.validateISSN;
const vISBN = ex.validateISBN;

/**
 * bepress field values : translators made with Zotero type field values
 *
 * @type {Object}
 */

/* Complete list of Zotero types with field translators in the Object */
exports.artwork = { // No publisher
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'artist' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	language: makeTranslator( 'language', fixLang )
};
exports.attachment = {
	title: makeTranslator( 'title' )
};
exports.audioRecording = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'performer' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	volume: makeTranslator( 'volume' ),
	publisher: makeTranslator( 'label' ),
	series_title: makeTranslator( 'seriesTitle' ),
	language: makeTranslator( 'language', fixLang ),
	isbn: makeListTranslator( 'ISBN', vISBN )
};
exports.bill = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'sponsor' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	volume: makeTranslator( 'codeVolume' ),
	language: makeTranslator( 'language', fixLang )
};
exports.blogPost = {
	abstract: makeTranslator( 'abstractNote' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	title: makeTranslator( 'title' ),
	language: makeTranslator( 'language', fixLang ),
	author: makeCreatorsTranslator( 'author' )
};
exports.book = {
	abstract: makeTranslator( 'abstractNote' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	publisher: makeTranslator( 'publisher' ),
	title: makeTranslator( 'title' ),
	book_title: makeTranslator( 'title' ),
	volume: makeTranslator( 'volume' ),
	language: makeTranslator( 'language', fixLang ),
	isbn: makeListTranslator( 'ISBN', vISBN )
};
exports.bookSection = {
	abstract: makeTranslator( 'abstractNote' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	publisher: makeTranslator( 'publisher' ),
	book_title: makeTranslator( 'bookTitle' ),
	title: makeTranslator( 'title' ),
	volume: makeTranslator( 'volume' ),
	language: makeTranslator( 'language', fixLang ),
	isbn: makeListTranslator( 'ISBN', vISBN )
};
exports.case = { // No publisher
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'caseName' ),
	date: makeTranslator( 'dateDecided' ),
	publication_date: makeTranslator( 'dateDecided' ),
	author: makeCreatorsTranslator( 'author' ),
	language: makeTranslator( 'language', fixLang ),
	firstpage: makeTranslator( 'firstPage' ) // Use regular translator since only first page is used
};
exports.computerProgram = { // No language field
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'programmer' ),
	isbn: makeListTranslator( 'ISBN', vISBN )
};
exports.conferencePaper = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'author' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	volume: makeTranslator( 'volume' ),
	series_title: makeTranslator( 'proceedingsTitle' ),
	conference: makeTranslator( 'conferenceTitle' ),
	publisher: makeTranslator( 'publisher' ),
	language: makeTranslator( 'language', fixLang ),
	isbn: makeListTranslator( 'ISBN', vISBN ),
	firstpage: makePagesTranslator( 'pages', 'firstpage', 'lastpage' )
};
exports.dictionaryEntry = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'author' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	series_title: makeTranslator( 'dictionaryTitle' ),
	publisher: makeTranslator( 'publisher' ),
	language: makeTranslator( 'language', fixLang ),
	firstpage: makePagesTranslator( 'pages', 'firstpage', 'lastpage' ),
	isbn: makeListTranslator( 'ISBN', vISBN )
};
exports.document = {
	abstract: makeTranslator( 'abstractNote' ),
	author: makeCreatorsTranslator( 'author' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	publisher: makeTranslator( 'publisher' ),
	title: makeTranslator( 'title' ),
	language: makeTranslator( 'language', fixLang )
};
exports.email = {
	abstract: makeTranslator( 'abstractNote' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	title: makeTranslator( 'subject' ),
	language: makeTranslator( 'language', fixLang ),
	author: makeCreatorsTranslator( 'author' )
};
exports.encyclopediaArticle = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'author' ),
	date: makeTranslator( 'date', fixDate ),
	series_title: makeTranslator( 'encyclopediaTitle' ),
	publisher: makeTranslator( 'publisher' ),
	language: makeTranslator( 'language', fixLang ),
	firstpage: makePagesTranslator( 'pages', 'firstpage', 'lastpage' ),
	isbn: makeListTranslator( 'ISBN', vISBN )
};
exports.film = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'director' ),
	publication_date: makeTranslator( 'date', fixDate ),
	date: makeTranslator( 'date', fixDate )
};
exports.forumPost = exports.blogPost;
exports.hearing = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'contributor' ),
	publication_date: makeTranslator( 'date', fixDate ),
	date: makeTranslator( 'date', fixDate ),
	firstpage: makePagesTranslator( 'pages', 'firstpage', 'lastpage' )
};
exports.instantMessage = exports.blogPost;
exports.interview = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'interviewee' ),
	publication_date: makeTranslator( 'date', fixDate ),
	date: makeTranslator( 'date', fixDate ),
	language: makeTranslator( 'language', fixLang )
};
exports.journalArticle = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'author' ),
	issue: makeTranslator( 'issue' ),
	volume: makeTranslator( 'volume' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	series_title: makeTranslator( 'seriesTitle' ),
	journal_title: makeTranslator( 'publicationTitle' ),
	journal_abbrev: makeTranslator( 'journalAbbreviation' ),
	issn: makeListTranslator( 'ISSN', vISSN ),
	eIssn: makeListTranslator( 'ISSN', vISSN ),
	language: makeTranslator( 'language', fixLang )
};
exports.letter = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'author' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	language: makeTranslator( 'language', fixLang )
};
exports.magazineArticle = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'author' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	series_title: makeTranslator( 'publicationTitle' ),
	language: makeTranslator( 'language', fixLang ),
	issn: makeListTranslator( 'ISSN', vISSN ),
	eIssn: makeListTranslator( 'ISSN', vISSN )
};
exports.manuscript = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'author' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	language: makeTranslator( 'language', fixLang )
};
exports.map = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'cartographer' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	series_title: makeTranslator( 'seriesTitle' ),
	publisher: makeTranslator( 'publisher' ),
	language: makeTranslator( 'language', fixLang ),
	isbn: makeListTranslator( 'ISBN', vISBN )
};
exports.newspaperArticle = exports.magazineArticle;
exports.note = {}; // Has no fields
exports.patent = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	language: makeTranslator( 'language', fixLang ),
	author: makeCreatorsTranslator( 'inventor' ),
	date: makeTranslator( 'issueDate' ),
	publication_date: makeTranslator( 'issueDate' )
};
exports.podcast = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'podcaster' ),
	series_title: makeTranslator( 'seriesTitle' ),
	language: makeTranslator( 'language', fixLang )
};
exports.presentation = {
	abstract: makeTranslator( 'abstractNote' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	title: makeTranslator( 'title' ),
	language: makeTranslator( 'language', fixLang ),
	author: makeCreatorsTranslator( 'presenter' )
};
exports.radioBroadcast = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'director' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	language: makeTranslator( 'language', fixLang )
};
exports.report = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'author' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	series_title: makeTranslator( 'seriesTitle' ),
	technical_report_institution: makeTranslator( 'institution' ),
	technical_report_number: makeTranslator( 'number' ),
	language: makeTranslator( 'language', fixLang )
};
exports.statute = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'nameOfAct' ),
	author: makeCreatorsTranslator( 'author' ),
	date: makeTranslator( 'dateEnacted' ),
	publication_date: makeTranslator( 'dateEnacted', fixDate ),
	language: makeTranslator( 'language', fixLang )
};
exports.thesis = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'author' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	language: makeTranslator( 'language', fixLang ),
	dissertation_institution: makeTranslator( 'university' )
};
exports.tvBroadcast = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'director' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	language: makeTranslator( 'language', fixLang )
};
exports.videoRecording = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'director' ),
	date: makeTranslator( 'date', fixDate ),
	publication_date: makeTranslator( 'date', fixDate ),
	series_title: makeTranslator( 'seriesTitle' ),
	language: makeTranslator( 'language', fixLang ),
	isbn: makeListTranslator( 'ISBN', vISBN )
};
exports.webpage = {
	abstract: makeTranslator( 'abstractNote' ),
	title: makeTranslator( 'title' ),
	author: makeCreatorsTranslator( 'author' ),
	date: makeTranslator( 'date', fixDate ),
	language: makeTranslator( 'language', fixLang )
};
