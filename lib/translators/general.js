'use strict';


/**
 * Utility function to map the keys directly
 */
function makeTranslator(property) {
	function translateProp(citation, metadataValue) {
		citation = citation || {};
		if (typeof metadataValue === 'string') {
			// add the string value
			citation[property] = metadataValue;
		} else if (Array.isArray(metadataValue)) {
			// choose the first value
			translateProp(citation, metadataValue[0]);
		}
		return citation;
	}
	return {
		name: property,
		translate: translateProp
	};
}

exports.util = {
	makeTranslator: makeTranslator
};

/**
 * General field values : Zotero type field values
 * @type {Object}
 */

exports.general = {
		authorlink: null,
		canonical: makeTranslator('url'),
		description: makeTranslator('abstractNote'),
		publisher: null,
		robots: null,
		shortlink: null,
		title: makeTranslator('title')
};

/**
 * Converts the property 'author' to Zotero creator field
 * @param  {String} authorText Text in author field
 */

exports.general.author = {
	name: 'author',
	translate: function(citation, authorText) {
		if (!authorText || typeof authorText !== 'string'){
			return citation;
		}
		var creatorObj = {creatorType: 'author'};
		if (!citation) {citation = {};}
		authorText = authorText.trim().split(/\s/m);

		if (authorText.length === 1){
			creatorObj.firstName = "";
			creatorObj.lastName = authorText[0];
		}
		if (authorText.length >= 2) {
			creatorObj.lastName = authorText[authorText.length-1];
			creatorObj.firstName = authorText.slice(0, authorText.length-1).join(' ');
		}
		if (!citation.creators){
			citation.creators = [];
		}
		citation.creators.push(creatorObj);
		return citation;
	}
};

