'use strict';

/**
 * Translator for xISBN service from WorldCat
 * JSON translator
 */

var ex = require('../Exporter.js');
var ut = require('./util/index.js');

var makeTranslator = ut.makeTranslator;
var makeListTranslator = ut.makeListTranslator;
var generateCreatorObj = ut.generateCreatorObj;

var fixDate = ex.fixDate;
var fixLang = ex.fixLang;
var vISBN = ex.validateISBN;

/**
 * xisbnfield values : translators made with Zotero type field values
 * @type {Object}
 */

exports.returnItemType = function(json){
    var type;
    var types = {
        AA:'audioRecording', //might be audioBook!
        DA:'book', // Digital- not really sure what this mostly likely to be, ebook?
        FA:'document', // Film or transparency - could be image or document
        MA:'newspaperArticle', // Microfiche - likely to be news article
        VA:'videoRecording'
    };
    var typeList = json.list[0].form;
    var t;
    if (typeList && typeList.length) {
        for(t = 0; t < typeList.length; t++) {
            if (['BA','BB','BC'].indexOf(typeList[t]) >= 0){ // If a book code is anywhere in the list, typecast as book
                return 'book';
            } else {
                type = types[typeList[t]]; // otherwise use last code to determine type
            }
        }
    }
    return type || 'book'; // if type isn't set, select book
 };


/* Adds creators from a worldcat xisbn string */
exports.addCreators = function(citation, metadataValue, creatorFieldName){
    var creatorNameList;
    var creatorName;
    var i;
    var j;

    // The following regex are used after the author field is split by ';'
    var illustrator = new RegExp(/illustrations by/i);
    var translator = new RegExp(/translated/i);
    var randomCreator = /(?:[A-Za-z]*[\s])*by[\s]/i; // Regex for a creator type we don't know about, like "edited by J. Smith"

    var chunkNaturalLanguage = function(naturalLangString, creatorType){
        var list = naturalLangString.split(/ and /); // split by 'and' only
        for (j = 0; j < list.length; j++){
            creatorName = list[j].trim();
            citation.creators.push(generateCreatorObj(creatorName, creatorType));
        }
    };

    if (!citation){citation = {};}

    if (!metadataValue) {return citation;}
    if (typeof metadataValue === 'string'){
        creatorNameList = metadataValue.trim().replace(/\.$/, "").split(";"); // Remove period from end of string and split by ;
        citation.creators = citation.creators || [];
        for (i = 0; i < creatorNameList.length; i++) {
            creatorName = creatorNameList[i].trim();
            // set illustrations by string to a contributor, since no illustrator field is available
            if (illustrator.test(creatorName)){
                chunkNaturalLanguage(creatorName.replace(/illustrations by /i, ""), 'contributor'); // Removes 'ilustrations by ' and adds remaining names
            // set translators as to itemType translator
            } else if (translator.test(creatorName)){
                chunkNaturalLanguage(creatorName.replace(/translated (?:[A-Za-z]*[\s])*by[\s]/i, ""), 'translator'); // Removes 'translated [from] [the] [language] by ' and adds remaining names
            } else if (!randomCreator.test(creatorName)){
                chunkNaturalLanguage(creatorName, creatorFieldName); // Adds primary author type that aren't preceded by '[creatorType] by'
            }
        }
    }
    return citation;
};

/* Similar to makeTranslator but for the creators field*/
var makeCreatorsTranslator = function(creatorType){
    function translateProp(citation, metadata, key) {
        citation = exports.addCreators(citation, metadata[key], creatorType);
        return citation;
    }
    return {
        name: 'creators',
        translate: translateProp
    };
};

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
exports['case'] =  { // No publisher
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