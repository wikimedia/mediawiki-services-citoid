'use strict';

/* Worldcat Utility functions used across translators */

exports.extractNames = function (nameString) {
    const names = [ '', '' ];
    // Remove content in parentheses
    let pattern = / \([^)]*\)/;
    nameString = nameString.replace(pattern, '');
    // Remove years
    pattern = / [\d\-.,]+/;
    nameString = nameString.replace(pattern, '');
    // Remove trailing commas
    pattern = /,$/;
    nameString = nameString.replace(pattern, '');
    // Remove trailing periods except when they are for abbreviations such as Jr., Sr., or A.
    if (!nameString.match(/ Jr\.$/) && !nameString.match(/ Sr\.$/)) {
        // Remove trailing periods preceded by 2 or more letters
        pattern = /(\w{2,})\.$/;
        if (nameString.match(pattern)) {
            nameString = nameString.replace(/\.$/, '');
        }
    }
    // Find first name and last name
    pattern = /([^,]+), (.+)/;
    const namesFound = nameString.match(pattern);
    if (namesFound) {
        names[0] = namesFound[2]; // first name
        names[1] = namesFound[1]; // last name
    // Set non matching data as last name; possible organisation
    } else {
        names[1] = nameString;
    }
    return names;
};

/* Generates creator object to add to creators list */
exports.generateCreatorObj = function (creatorName, creatorFieldName) {
    const creatorObj = { creatorType: creatorFieldName };
    // Chunk authorText for portioning into first and lastnames
    const names = exports.extractNames(creatorName);
    creatorObj.firstName = names[0];
    creatorObj.lastName = names[1];

    return creatorObj;
};

/* Adds creators when they're a string or an array */
exports.addCreators = function (citation, metadataValue, creatorFieldName) {
    let creatorName;
    let i;

    if (!citation) { citation = {}; }
    if (!metadataValue) { return citation; }
    if (!creatorFieldName) { creatorFieldName = 'author'; }

    if (!Array.isArray(metadataValue)) {
        // Case: creator is a string, not a list of strings
        if (typeof metadataValue === 'string') {
            creatorName = metadataValue.trim();
            if (creatorName) {
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
        if (!creatorName) {
            return;
        } else {
            citation.creators = citation.creators || [];
        }
        citation.creators.push(exports.generateCreatorObj(creatorName, creatorFieldName));
    }
    return citation;
};

/* Similar to makeTranslator but for the creators field */
exports.makeCreatorsTranslator = function (creatorType) {
    function translateProp(citation, metadata, key) {
        citation = exports.addCreators(citation, metadata[key], creatorType);
        return citation;
    }
    return {
        name: 'creators',
        subname: creatorType,
        translate: translateProp
    };
};
