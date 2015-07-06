'use strict';


var fixDate = require('../Exporter.js').fixDate;
var makeTranslator = require('./general').util.makeTranslator;

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
 * No simple fields in common among types-
 * Declared for consistency across translators
 * @type {Object}
 */
exports.general = {};

/**
 * Date field- in common with all coins types and zotero types
 * @type {Function}
 */
exports.general.date = {
	name: 'date',
	translate: function(citation, date) {
		if (!date) {return citation;}
		citation.date = date;
		citation = fixDate(citation);
		return citation;
	}
};

/**
 * Convert author fields to Zotero authors
 *
 * This function does not get used in the translate function-
 * it must be called explicitly
 *
 * @type {Function}
 */
exports.general.addAuthors = function(citation, metadata){
	var authorText;
	var creatorObj;
	var firstAuthor;
	var i;
	var creators = [];

	if (!citation) {citation = {};}

	function namesEqual(creator1, creator2){
		var c1 = creator1.firstName + ' ' + creator1.lastName;
		var c2 = creator2.firstName + ' ' + creator2.lastName;
		return c2 === c1;
	}

	function addFirstAuthor(){
		firstAuthor = {creatorType: 'author'};

		firstAuthor.lastName = metadata.aulast || '';

		if (metadata.ausuffix){
			firstAuthor.lastName += ', ' + metadata.ausuffix;
		}

		if (metadata.aufirst !== undefined){
			firstAuthor.firstName = metadata.aufirst;
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

	function addAu(){
		if (!metadata.au || !Array.isArray(metadata.au)){
			return;
		}
		for (i = 0; i < metadata.au.length; i++) {
			creatorObj = {creatorType: 'author'};
			authorText = metadata.au[i];
			if (!authorText){
				return;
			}
			// Chunk authorText for portioning into first and lastnames
			authorText = authorText.trim().split(/\s/m);
			// Single name authors are set to last name
			if (authorText.length === 1){
				creatorObj.firstName = "";
				creatorObj.lastName = authorText[0];
			}
			// Two or more named authors are set with last word to last name and all others to first
			if (authorText.length >= 2 ){
				creatorObj.lastName = authorText[authorText.length-1];
				creatorObj.firstName = authorText.slice(0, authorText.length-1).join(' ');
			}
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
			creatorObj = {creatorType: 'author'};
			authorText = metadata.aucorp[i];
			if (!authorText){
				return;
			}
			// Set entire corporation name as last name
			creatorObj.firstName = "";
			creatorObj.lastName = authorText;
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

/**
 * Methods that are used by multiple types
 */

exports.other = {};
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
	spage: null, // Start page // TODO: Add function to use this
	epage: null, // end page // TODO: Add function to use this
	pages: makeTranslator('pages'),
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
	spage: null, // Start page // TODO: Add function to use this
	epage: null, // end page // TODO: Add function to use this
	pages: makeTranslator('pages'),
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
	spage: null, // Start page // TODO: Add function to use this
	epage: null, // end page // TODO: Add function to use this
	pages: makeTranslator('pages'),
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
	spage: null, // Start page // TODO: Add function to use this
	epage: null, // end page // TODO: Add function to use this
	pages: makeTranslator('pages'),
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
	spage: null, // Start page // TODO: Add function to use this
	epage: null, // end page // TODO: Add function to use this
	pages: makeTranslator('pages'),
	place: makeTranslator('place'),
	series: makeTranslator('seriesTitle'),
	pub: makeTranslator('institution'),
};
