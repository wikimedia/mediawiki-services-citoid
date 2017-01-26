
/**
 * Translate XML - currently translators only Worldcat Search API XML
 */

/**
 * Dependencies
 */
var dc = require('./translators/dublinCore.js');
var BBPromise = require('bluebird');
var xml2js = BBPromise.promisifyAll(require('xml2js'));

/**
 * XMLReader constructor
 */
var XMLReader = function(app, translator){
    this.logger = app.logger;
    this.exporter = null;
    this.translator = translator;
};

// Process XML which has been converted to a JS obj
function process(jsobj){
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

// Return an itemType given a record jsobj
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

XMLReader.prototype.translate = function(citationObj, cr, xml){

    var content = citationObj.content;
    var translate = this.translator.translate;
    var itemType;
    var xmlreader = this;
    var record;
    var message = 'Unable to retrieve data from ISBN ' + citationObj.isbn;
    var error = {Error: message};

    function reject(){
        citationObj.responseCode = 404;
        citationObj.error = error;
        return cr;
    }

    return xml2js.parseStringAsync(xml).then(function (result) {
        try {
            if (result.searchRetrieveResponse.records[0].record.length > 0) {
                record = process(result.searchRetrieveResponse.records[0].record[0].recordData[0].oclcdcs[0]);
                // TODO: Try to get OCLC number
                // Defaults to book
                content.itemType = getItemType(record);
                // dublinCore.js translator properties
                content = translate(content, record, dc[content.itemType]);
                // Add OCLC number to response, url, and oclc fields
                if (record.oclc){
                    citationObj.oclc = record.oclc;
                    content.oclc = record.oclc;
                    content.url = 'https://www.worldcat.org/oclc/' + record.oclc;
                }

                citationObj.responseCode = 200;
                citationObj.source.push('WorldCat');

                return cr;
            } else {
                return reject();
            }
        } catch (err) {
            return reject();
        }
    })
    .catch(function (err) {
        xmlreader.logger.log('debug/ISBN', err);
        return reject();
    });
};

exports = module.exports = XMLReader;