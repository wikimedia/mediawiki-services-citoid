/**
 * This file is modified from a file copied from Zotero below
 */

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2011 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

/**
 * Emulates very small parts of cachedTypes.js and itemFields.js APIs for use with connector
 */
var schema = require('./typeSchemaData.js');
var extend = require('extend');
/**
 * @namespace
 */
function Zotero () {
    this.schemaTypes = ["itemTypes", "creatorTypes", "fields"];
    this.schema = extend(true, {}, schema); // Deep copy schema
    this.uncachedSchema = schema; // Keep original schema

    // attach IDs and make referenceable by either ID or name
    for(var i=0; i<this.schemaTypes.length; i++) {
        var schemaType = this.schemaTypes[i];
        for(var id in this.schema[schemaType]) {
            var entry = this.schema[schemaType][id];
            entry.unshift(parseInt(id, 10));
            this.schema[schemaType][entry[1]/* name */] = entry;
        }
    }

    this.itemTypes = this.schema["itemTypes"];
    this.creatorTypes = this.schema["creatorTypes"];
    this.fields = this.schema["fields"];

    this.creatorTypesMethods = new CreatorTypes(this.creatorTypes, this.itemTypes);
    this.itemFieldsMethods = new ItemFields(this.fields, this.itemTypes);
}

/**
 * Gets object containing names of basefields for a given itemType
 * @param  {String} typeIdOrName itemType- in ID or Name
 * @return {Object}              typemap in {field:basefield} format
 */
Zotero.prototype.getBaseFields = function(typeIdOrName) {
    var self = this;
    var baseField;
    var field;
    var baseFieldObj = this.itemTypes[typeIdOrName][5];
    var creatorsList = this.itemTypes[typeIdOrName][3];
    var firstCreator = creatorsList[0];
    var typeMap = {};

    // Regular base fields
    Object.keys(baseFieldObj).forEach(function(itemTypeID){ // Loop through all item types
        field = self.itemFieldsMethods.cachedTypeMethods.getName(itemTypeID);
        baseField = self.itemFieldsMethods.cachedTypeMethods.getName(baseFieldObj[itemTypeID]);
        typeMap[field] = baseField;
    });

    // Creator base fields
    if (firstCreator && firstCreator !== 1){ // If first creator in the list is not author
        field = self.creatorTypesMethods.cachedTypeMethods.getName(firstCreator);
        baseField = self.creatorTypesMethods.cachedTypeMethods.getName(1); // Basefield is always author
        typeMap[field] = baseField;
    }

    if (Object.keys(typeMap).length > 0){
        return typeMap;
    } else {
        return false;
    }
};


/**
 * Request info from a cached type
 * @param {Object} schemaByType type specific schema segment
 */
function CachedTypes(schemaByType) {
    this.thisType = schemaByType;
}

CachedTypes.prototype.getID = function(idOrName) {
    var type = this.thisType[idOrName];
    return (type ? type[0]/* id */ : false);
};

CachedTypes.prototype.getName = function(idOrName) {
    var type = this.thisType[idOrName];
    return (type ? type[1]/* name */ : false);
};

CachedTypes.prototype.getLocalizedString = function(idOrName) {
    var type = this.thisType[idOrName];
    return (type ? type[2]/* localizedString */ : false);
};


function CreatorTypes(creatorTypes, itemTypes) {
    this.schemaType = "creatorTypes";
    this.itemTypes = itemTypes;
    this.creatorTypes = creatorTypes;
    this.cachedTypeMethods = new CachedTypes(creatorTypes);
}

CreatorTypes.prototype.getTypesForItemType = function(idOrName) {
    var itemType = this.itemTypes[idOrName];
    if(!itemType) {return false;}

    var itemCreatorTypes = itemType[3]/* creatorTypes */,
        n = itemCreatorTypes.length,
        outputTypes = new Array(n);

    for(var i=0; i<n; i++) {
        var creatorType = this.creatorTypes[itemCreatorTypes[i]];
        if (creatorType){
            outputTypes[i] = {"id":creatorType[0]/* id */,
            "name":creatorType[1]/* name */};
        }
    }
    return outputTypes;
};

CreatorTypes.prototype.getPrimaryIDForType = function(idOrName) {
    var itemType = this.itemTypes[idOrName];
    if(!itemType) {return false;}
    return itemType[3]/* creatorTypes */[0];
};

function ItemFields(fields, itemTypes) {
    this.schemaType = "fields";
    this.fields = fields;
    this.itemTypes = itemTypes;
    this.cachedTypeMethods = new CachedTypes(fields);
}

ItemFields.prototype.isValidForType = function(fieldIdOrName, typeIdOrName) {
    var field = this.fields[fieldIdOrName], itemType = this.itemTypes[typeIdOrName];

    // mimics itemFields.js
    if(!field || !itemType) {return false;}

           /* fields */        /* id */
    return itemType[4].indexOf(field[0]) !== -1;
};

ItemFields.prototype.getFieldIDFromTypeAndBase = function(typeIdOrName, fieldIdOrName) {
    var baseField = this.fields[fieldIdOrName], itemType = this.itemTypes[typeIdOrName];

    if(!baseField || !itemType) {return false;}

    // get as ID
    baseField = baseField[0]/* id */;

    // loop through base fields for item type
    var baseFields = itemType[5];
    for(var i in baseFields) {
        if(baseFields[i] === baseField) {
            return i;
        }
    }

    return false;
};

ItemFields.prototype.getBaseIDFromTypeAndField = function(typeIdOrName, fieldIdOrName) {
    var field = this.fields[fieldIdOrName], itemType = this.itemTypes[typeIdOrName];
    if(!field || !itemType) {
        throw new Error("Invalid field or type ID");
    }

    var baseField = itemType[5]/* baseFields */[field[0]/* id */];
    return baseField ? baseField : false;
};

ItemFields.prototype.getItemTypeFields = function(typeIdOrName) {
    return this.itemTypes[typeIdOrName][4]/* fields */.slice();
};

module.exports = Zotero;
