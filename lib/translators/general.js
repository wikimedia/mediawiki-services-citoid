'use strict';

/**
 * General field values : Zotero type field values
 * @type {Object}
 */

exports.general = {
		authorlink: null,
		canonical: 'url',
		description: 'abstract',
		publisher: null,
		robots: null,
		shortlink: null,
		title:  'title',
};

/**
 * Converts the property 'author' to Zotero creator field
 * @param  {String} authorText Text in author field
 */

exports.general.author = function(authorText, citation){
	var creatorObj;
	if (!authorText){
		return citation;
	}
	if (!citation) {citation = {};}
	authorText = authorText.trim().split(/\s/m);
	creatorObj = {creatorType: 'author'};
	creatorObj.creatorType = 'author';
	if (authorText.length >= 1){
		creatorObj.firstName = authorText[0];
		creatorObj.lastName = "";
	}
	if (authorText.length >= 2 ){
		creatorObj.lastName = authorText[authorText.length-1];
	}
	if (!citation.creators){
		citation.creators = [];
	}
	citation.creators.push(creatorObj);
	return citation;
};


/*Test methods in main */
if (require.main === module) {
	console.log(exports.general.author("Taylor Turtle"));
}
