'use strict';



/**
 * Utility function to map the keys directly
 * @param  {String}   property Zotero property name to add to citation
 * @param  {Function} validate Function to run on scraped value
 * @return {Object}            citation object
 */
function makeTranslator(property, validate) {
	function translateProp(citation, metadataValue) {
		citation = citation || {};
		if (typeof metadataValue === 'string') {
			// Add the string value and trim whitespace
			citation[property] = metadataValue.trim();
		} else if (Array.isArray(metadataValue)) {
			// Choose the first value
			translateProp(citation, metadataValue[0]);
		}
		if (validate) {
			return validate(citation);
		} else {
			return citation;
		}
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
 * @type {Object}
 */

exports.general.author = {
	name: 'author',
	/**
	 * Converts the property 'author' to Zotero creator field
	 * @param  {String} authorText Text in author field
	 */
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

