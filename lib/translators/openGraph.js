'use strict';


var makeTranslator = require('./general').util.makeTranslator;
var fixDate = require('../Exporter.js').fixDate;
var fixLang = require('../Exporter.js').fixLang;

/**
 * Open graph type field values : Zotero type field values
 * @type {Object}
 */
exports.types = {
	website: 'webpage',
	article: 'blogPost', // May change to journalArticle, newspaperArticle, magazineArticle
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
	image: null, // general OG property, unused in any Zotero type //could possible put in archive location?
	audio: null, // general OG property, unused in Zotero in any Zotero type //could possibly put in archive location?
	description: makeTranslator('abstractNote'), // general OG property, abstractNote common to all Zotero types
	locale: makeTranslator('language', fixLang), // general OG property, common to all Zotero types
	determiner: null,  // general OG property, unused in any Zotero type
	'locale:alternate': null, // general OG property, unused in any Zotero type
	site_name: null, // general OG property, only used in webpage types - translate there
	video: null // general OG property, unused in Zotero in any Zotero type //could possibly put in archive location?
};

/**
 * Translator for Zotero type: webpage
 * Open graph webpage properties : Zotero properties
 * webpage has no specific properties other than what is defined in general og properties
 * @type {Object}
 */
exports.webpage = {
	site_name: makeTranslator('websiteTitle'), // prefix og: general property, but should only be assigned if type webpage is used
};

exports.videoRecording = {
	duration: makeTranslator('runningTime'),
	release_date: makeTranslator('date', fixDate)
};

exports.audioRecording = {
	release_date: makeTranslator('date',fixDate) // only present in music.album
};

exports.blogPost = {
	published_time: makeTranslator('date', fixDate),
};

exports.book = {
	release_date: makeTranslator('date', fixDate),
	isbn: makeTranslator('ISBN'),
};

/** Not currently used */
exports.journalArticle = {
	published_time: makeTranslator('date', fixDate),
};

/** Not currently used */
exports.newspaperArticle = {
	published_time: makeTranslator('date', fixDate),
};