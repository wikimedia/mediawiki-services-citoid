
/**
 * Translate XML - currently translators only Worldcat Search API XML
 */

/**
 * Dependencies
 */
var dc = require('./translators/dublinCore.js');
var BBPromise = require('bluebird');
var marc = require('./translators/marcXML.js');
var xml2js = BBPromise.promisifyAll(require('xml2js'));

/**
 * XMLReader constructor
 */
var XMLReader = function(app, translator, worldCatService){
    this.logger = app.logger;
    this.worldCatService = worldCatService;
    this.translator = translator;
};

// Process XML which has been converted to a JS obj from DC metadata
function processDC(jsobj){
    var record = {};
    var recordIDS;
    var newKey;
    var newValue;
    Object.keys(jsobj).forEach(function(key) {
        // Get OCLC #
        if (key === 'oclcterms:recordIdentifier'){
            recordIDS = jsobj[key];
            if (Array.isArray(recordIDS)){
                recordIDS.forEach(function(element){
                    // Use regex to verify id is 9 digit number; likely to be OCLC #
                    if (typeof element === 'string' && element.match(new RegExp("^\\d{8,9}$"))) {
                        record.oclc = element;
                    }
                });
            }
        }
        // Process DC metadata
        newKey = key.split(':');
        if (newKey && Array.isArray(newKey) && newKey.length === 2 && newKey[0] === 'dc'){
            newKey = newKey[1];
            // Fix language obj so it can be recognised by translator
            if (newKey === 'language'){
                newValue = jsobj[key][0]['_'];
            } else {
                newValue = jsobj[key];
            }
            record[newKey] = newValue;
        } else {
            return;
        }
    });
    return record;
}

// Return an itemType given a record jsobj from DC metadata
function getItemType(record){
    var itemType;
    // Types for worldcat search API dublincore records
    var types = {
        Collection: 'book',
        Dataset: 'book',
        Event: 'book',
        Image: 'videoRecording', // DVDs are listed as 'Image' in worldcat dc data.
        'Image.Moving': 'videoRecording',
        'DVD-Video discs.': 'videoRecording', // Not a valid dc type, but appears in worldcate db
        InteractiveResource: 'webpage',
        MovingImage: 'videoRecording',
        PhysicalObject: 'book',
        Service: 'book',
        Software: 'computerProgram',
        Sound: 'audioRecording',
        StillImage: 'artwork',
        Text: 'book' // Books are listed as 'Text' in worldcat dc data.
    };
    if (record.type && Array.isArray(record.type) && record.type[0]){
        itemType = types[record.type[0]];
    }
    if (!itemType) { itemType = 'book'; }
    return itemType;
}

// Process MarcXML which has been converted to a JS obj
function processMARCXML(jsobj){
    var key;
    var value;
    var code;
    var record = {};
    var i;
    var j;
    var item;
    var subitem;
    var trailing = /\s*[\/:;.]*\s*$/; // Regex for trailing punct and white space
    for (i = 0; i < jsobj.length; i++){
        item = jsobj[i];
        var tag = item.$.tag;
        if (item.subfield){
            for (j = 0; j < item.subfield.length; j++){
                subitem = item.subfield[j];
                code = subitem.$.code;
                value = subitem._.replace(trailing, ''); //Remove trailing punctuation and white space

                key = code + tag; // Create key out of tag and subfield code
                if (!record[key]){ // If undef, def new key
                    record[key] = [value]; // Put in Array since same tag/code entry is allowed
                } else {
                    record[key].push(value); // If key already exists, add new value
                }
            }
        } else {
            key = tag;
            value = item._;
            if (!record[key]){ // If undef, def new key
                record[key] = [value]; // Put in Array since same tag/code entry is allowed
            } else {
                record[key].push(value); // If key already exists, add new value
            }
        }

    }
    return record;
}

// Return an itemType given a MarcXML record JS obj
function getMARCItemType(record){
    var itemType = 'book'; // MarcXML unfortnately does not report the item type, default to book
    return itemType;
}

XMLReader.prototype.translate = function(citationObj, cr, xml, wskeyFormat, creatorOverwrite){

    var content = citationObj.content;
    var translate = this.translator.translate;
    var message = 'Unable to retrieve data from ISBN ' + citationObj.isbn;
    var xmlreader = this;

    var itemType;
    var record;
    var controlfields;

    return xml2js.parseStringAsync(xml).then(function(result) {
        if (wskeyFormat === 'dc'){
            if (result && result.oclcdcs) {
                record = processDC(result.oclcdcs);
                if (!content.itemType) {
                    content.itemType = getItemType(record);
                }

                // dublinCore.js translator properties; won't overwrite previous values
                content = translate(content, record, dc[content.itemType], creatorOverwrite);

                // Add OCLC number to response, url, and oclc fields; may overwrite previous values
                if (record.oclc){
                    citationObj.oclc = record.oclc;
                    content.oclc = record.oclc;
                    content.url = 'https://www.worldcat.org/oclc/' + record.oclc;
                }

                return cr;
            } else {
                return BBPromise.reject(message);
            }
        } else if (wskeyFormat === 'marc'){
             if (result && result.record && result.record.datafield) {
                record = processMARCXML(result.record.datafield, record);
                if (!content.itemType){
                    content.itemType = getMARCItemType(record);
                }
                controlfields = processMARCXML(result.record.controlfield);
                content = translate(content, record, marc[content.itemType], creatorOverwrite);

                // Add OCLC number to response, url, and oclc fields
                content.oclc = controlfields['001'][0];
                content.url = 'https://www.worldcat.org/oclc/' + content.oclc;

                citationObj.oclc = content.oclc;

                return cr;
            } else {
                return BBPromise.reject(message);
            }
        }
    })
    .catch(function (err) {
        xmlreader.logger.log('debug/ISBN', err);
        return BBPromise.reject(message);
    });
};

exports = module.exports = XMLReader;