'use strict';

/* Utility functions used across translators */

/**
 * Utility function to map the keys directly
 * @param  {String}   property Zotero property name to add to citation
 * @param  {Function} validate Function to run on scraped value
 * @return {Object}            citation object
 */
exports.makeTranslator = function(property, validate) {
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
};

/* Adds creators when they're a string or an array */
exports.addCreators = function(citation, metadataValue, creatorFieldName){
	var creatorName;
	var i;

	if (!citation){citation = {};}

	if (!metadataValue) {return citation;}
	if (!Array.isArray(metadataValue)){
		// Case: creator is a string, not a list of strings
		if (typeof metadataValue === 'string'){
			creatorName = metadataValue.trim();
			if (creatorName){
				citation.creators = citation.creators || [];
				citation.creators.push(exports.generateCreatorObj(creatorName, creatorFieldName));
			}
		}
		// If neither a string nor a list, return citation unchanged
		return citation;
	}
	// Case: creator is a list of strings
	for (i = 0; i < metadataValue.length; i++) {
		creatorName = metadataValue[i].trim();
		if (!creatorName){
			return;
		} else {
			citation.creators = citation.creators || [];
		}
		citation.creators.push(exports.generateCreatorObj(creatorName, creatorFieldName));
	}
	return citation;
};

/* Generates creator object to add to creators list */
exports.generateCreatorObj = function(creatorName, creatorFieldName){
	var creatorObj = {creatorType: creatorFieldName};

	// Chunk authorText for portioning into first and lastnames
	creatorName = creatorName.trim().split(/\s/m);
	// Single name authors are set to last name
	if (creatorName.length === 1){
		creatorObj.firstName = "";
		creatorObj.lastName = creatorName[0];
	}
	// Two or more named authors are set with last word to last name and all others to first
	if (creatorName.length >= 2 ){
		creatorObj.lastName = creatorName[creatorName.length-1];
		creatorObj.firstName = creatorName.slice(0, creatorName.length-1).join(' ');
	}
	return creatorObj;
};

/* Similar to makeTranslator but for the creators field*/
exports.makeCreatorsTranslator = function(creatorType){
	function translateProp(citation, metadataValue) {
		citation = exports.addCreators(citation, metadataValue, creatorType);
		return citation;
	}
	return {
		name: 'creators',
		translate: translateProp
	};
};

/* Function to add arbitrary creator function to the exports.general obj*/
exports.extendGeneral = function(generalObj, creatorType){
	var extendedType = {};
	Object.assign(extendedType, generalObj, {creator: exports.makeCreatorsTranslator(creatorType)});
	return extendedType;
};
