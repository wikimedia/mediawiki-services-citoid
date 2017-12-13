'use strict';

/**
 * Translator for xISBN service from WorldCat
 * JSON translator
 */

const ex = require('../Exporter.js');
const ut = require('./util/index.js');

const makeTranslator = ut.makeTranslator;
const makeListTranslator = ut.makeListTranslator;
const generateCreatorObj = ut.generateCreatorObj;

const fixDate = ex.fixDate;
const fixLang = ex.fixLang;
const vISBN = ex.validateISBN;

/**
 * xisbnfield values : translators made with Zotero type field values
 * @type {Object}
 */

exports.returnItemType = function(json) {
    let type;
    const types = {
        AA:'audioRecording', // might be audioBook!
        DA:'book', // Digital- not really sure what this mostly likely to be, ebook?
        FA:'document', // Film or transparency - could be image or document
        MA:'newspaperArticle', // Microfiche - likely to be news article
        VA:'videoRecording'
    };
    const typeList = json.list[0].form;
    let t;
    if (typeList && typeList.length) {
        for (t = 0; t < typeList.length; t++) {
            if (['BA','BB','BC'].indexOf(typeList[t]) >= 0) {
                // If a book code is anywhere in the list, typecast as book
                return 'book';
            } else {
                // otherwise use last code to determine type
                type = types[typeList[t]];
            }
        }
    }
    return type || 'book'; // if type isn't set, select book
};


/* Adds creators from a worldcat xisbn string */
exports.addCreators = function(citation, metadataValue, creatorFieldName) {
    let creatorNameList;
    let creatorName;
    let i;
    let j;

    // The following regex are used after the author field is split by ';'
    const illustrator = new RegExp(/illustrations by/i);
    const translator = new RegExp(/translated/i);
    // Regex for a creator type we don't know about, like "edited by J. Smith"
    const randomCreator = /(?:[A-Za-z]*[\s])*by[\s]/i;

    function chunkNaturalLanguage(naturalLangString, creatorType) {
        const list = naturalLangString.split(/ and /); // split by 'and' only
        for (j = 0; j < list.length; j++) {
            creatorName = list[j].trim();
            citation.creators.push(generateCreatorObj(creatorName, creatorType));
        }
    }

    if (!citation) { citation = {}; }

    if (!metadataValue) { return citation; }
    if (typeof metadataValue === 'string') {
        // Remove period from end of string and split by ;
        creatorNameList = metadataValue.trim().replace(/\.$/, "").split(";");
        citation.creators = citation.creators || [];
        for (i = 0; i < creatorNameList.length; i++) {
            creatorName = creatorNameList[i].trim();
            // set illustrations by string to a contributor, since no illustrator field is available
            if (illustrator.test(creatorName)) {
                // Removes 'ilustrations by ' and adds remaining names
                chunkNaturalLanguage(creatorName.replace(/illustrations by /i, ""), 'contributor');
            // set translators as to itemType translator
            } else if (translator.test(creatorName)) {
                // Removes 'translated [from] [the] [language] by ' and adds remaining names
                chunkNaturalLanguage(
                    creatorName.replace(/translated (?:[A-Za-z]*[\s])*by[\s]/i, ""), 'translator');
            } else if (!randomCreator.test(creatorName)) {
                // Adds primary author type that aren't preceded by '[creatorType] by'
                chunkNaturalLanguage(creatorName, creatorFieldName);
            }
        }
    }
    return citation;
};

/* Similar to makeTranslator but for the creators field*/
function makeCreatorsTranslator(creatorType) {
    function translateProp(citation, metadata, key) {
        citation = exports.addCreators(citation, metadata[key], creatorType);
        return citation;
    }
    return {
        name: 'creators',
        translate: translateProp
    };
}

/* Complete list of Zotero types with field translators in the Object */
exports.artwork = { // No publisher
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('artist'),
    year: makeTranslator('date', fixDate),
    lang: makeTranslator('language', fixLang),
    url: makeTranslator('url')
};
exports.attachment = {
    url: makeTranslator('url'),
    title: makeTranslator('title')
};
exports.audioRecording = {
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('performer'),
    year: makeTranslator('date', fixDate),
    volume: makeTranslator('volume'),
    publisher: makeTranslator('label'),
    lang: makeTranslator('language', fixLang),
    isbn: makeListTranslator('ISBN', vISBN)
};
exports.bill =  {
    url: makeTranslator('url'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('sponsor'),
    year: makeTranslator('date', fixDate),
    volume: makeTranslator('codeVolume'),
    lang: makeTranslator('language', fixLang)
};
exports.blogPost = {
    url: makeTranslator('url'),
    year: makeTranslator('date', fixDate),
    title: makeTranslator('title'),
    lang: makeTranslator('language', fixLang),
    author: makeCreatorsTranslator('author')
};
exports.book = {
    url: makeTranslator('url'),
    ed: makeTranslator('edition'),
    city: makeTranslator('place'),
    year: makeTranslator('date', fixDate),
    publisher: makeTranslator('publisher'),
    title: makeTranslator('title'),
    volume: makeTranslator('volume'),
    lang: makeTranslator('language', fixLang),
    isbn: makeListTranslator('ISBN', vISBN),
    author: makeCreatorsTranslator('author')
};
exports.bookSection = {
    url: makeTranslator('url'),
    ed: makeTranslator('edition'),
    city: makeTranslator('place'),
    year: makeTranslator('date', fixDate),
    publisher: makeTranslator('publisher'),
    title: makeTranslator('bookTitle'),
    volume: makeTranslator('volume'),
    lang: makeTranslator('language', fixLang),
    isbn: makeListTranslator('ISBN', vISBN),
    author: makeCreatorsTranslator('author')
};
exports.case =  { // No publisher
    url: makeTranslator('url'),
    title: makeTranslator('caseName'),
    year: makeTranslator('dateDecided'),
    author: makeCreatorsTranslator('author'),
    lang: makeTranslator('language', fixLang),
    firstpage: makeTranslator('firstPage') // Use regular translator since only first page is used
};
exports.computerProgram = { // No language field
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('programmer'),
    isbn: makeListTranslator('ISBN', vISBN)
};
exports.conferencePaper = {
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    year: makeTranslator('date', fixDate),
    volume: makeTranslator('volume'),
    publisher: makeTranslator('publisher'),
    lang: makeTranslator('language', fixLang),
    isbn: makeListTranslator('ISBN', vISBN),
};
exports.dictionaryEntry = {
    url: makeTranslator('url'),
    ed: makeTranslator('edition'),
    city: makeTranslator('place'),
    author: makeCreatorsTranslator('author'),
    year: makeTranslator('date',fixDate),
    title: makeTranslator('dictionaryTitle'),
    publisher: makeTranslator('publisher'),
    lang: makeTranslator('language', fixLang),
    isbn: makeListTranslator('ISBN', vISBN)
};
exports.document =  {
    url: makeTranslator('url'),
    publisher: makeTranslator('publisher'),
    lang: makeTranslator('language', fixLang),
    ed: makeTranslator('edition'),
    year: makeTranslator('date', fixDate),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author')
};
exports.email = {
    url: makeTranslator('url'),
    year: makeTranslator('date', fixDate),
    title: makeTranslator('subject'),
    lang: makeTranslator('language', fixLang),
    author: makeCreatorsTranslator('author')
};
exports.encyclopediaArticle = {
    url: makeTranslator('url'),
    ed: makeTranslator('edition'),
    city: makeTranslator('place'),
    author: makeCreatorsTranslator('author'),
    year: makeTranslator('date', fixDate),
    title: makeTranslator('encyclopediaTitle'),
    publisher: makeTranslator('publisher'),
    lang: makeTranslator('language', fixLang),
    isbn: makeListTranslator('ISBN', vISBN)
};
exports.film =  {
    url: makeTranslator('url'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('director'),
    year: makeTranslator('date', fixDate)
};
exports.forumPost = exports.blogPost;
exports.hearing = {
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('contributor'),
    year: makeTranslator('date', fixDate),
};
exports.instantMessage = exports.blogPost;
exports.interview = {
    url: makeTranslator('url'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('interviewee'),
    year: makeTranslator('date', fixDate),
    lang: makeTranslator('language', fixLang)
};
exports.journalArticle = {
    url: makeTranslator('url'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    issue: makeTranslator('issue'),
    volume: makeTranslator('volume'),
    year: makeTranslator('date', fixDate),
    lang: makeTranslator('language', fixLang)
};
exports.letter = {
    url: makeTranslator('url'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    year: makeTranslator('date', fixDate),
    lang: makeTranslator('language', fixLang)
};
exports.magazineArticle = {
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    year: makeTranslator('date', fixDate),
    lang: makeTranslator('language', fixLang)
};
exports.manuscript = {
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    year: makeTranslator('date', fixDate),
    lang: makeTranslator('language', fixLang)
};
exports.map =  {
    url: makeTranslator('url'),
    ed: makeTranslator('edition'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('cartographer'),
    year: makeTranslator('date', fixDate),
    publisher: makeTranslator('publisher'),
    lang: makeTranslator('language', fixLang),
    isbn: makeListTranslator('ISBN', vISBN)
};
exports.newspaperArticle = {
    url: makeTranslator('url'),
    ed: makeTranslator('edition'),
    city: makeTranslator('place'),
    author: makeCreatorsTranslator('author'),
    year: makeTranslator('date', fixDate),
    title: makeTranslator('publicationTitle'),
    lang: makeTranslator('language', fixLang)
};
exports.note = {}; // Has no fields
exports.patent =  {
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    lang: makeTranslator('language', fixLang),
    author: makeCreatorsTranslator('inventor'),
    year: makeTranslator('issueDate')
};
exports.podcast = {
    url: makeTranslator('url'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('podcaster'),
    lang: makeTranslator('language', fixLang)
};
exports.presentation =  {
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    year: makeTranslator('date', fixDate),
    title: makeTranslator('title'),
    lang: makeTranslator('language', fixLang),
    author: makeCreatorsTranslator('presenter')
};
exports.radioBroadcast = {
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('director'),
    year: makeTranslator('date', fixDate),
    lang: makeTranslator('language', fixLang)
};
exports.report = {
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    year: makeTranslator('date', fixDate),
    lang: makeTranslator('language', fixLang)
};
exports.statute = {
    url: makeTranslator('url'),
    title: makeTranslator('nameOfAct'),
    author: makeCreatorsTranslator('author'),
    year: makeTranslator('dateEnacted'),
    lang: makeTranslator('language', fixLang)
};
exports.thesis = {
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    year: makeTranslator('date', fixDate),
    lang: makeTranslator('language', fixLang)
};
exports.tvBroadcast = {
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('director'),
    year: makeTranslator('date', fixDate),
    lang: makeTranslator('language', fixLang)
};
exports.videoRecording = {
    url: makeTranslator('url'),
    city: makeTranslator('place'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('director'),
    year: makeTranslator('date',fixDate),
    lang: makeTranslator('language', fixLang),
    isbn: makeListTranslator('ISBN', vISBN)
};
exports.webpage = {
    url: makeTranslator('url'),
    title: makeTranslator('title'),
    author: makeCreatorsTranslator('author'),
    year: makeTranslator('date',fixDate),
    lang: makeTranslator('language', fixLang)
};
