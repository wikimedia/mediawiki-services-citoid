'use strict';

/**
 * Translate XML - currently translators only Worldcat Search API XML
 */

/**
 * Dependencies
 */
const BBPromise = require('bluebird');
const dc = require('./translators/dublinCore.js');
const marc = require('./translators/marcXML.js');
const oSearch = require('./translators/openSearch.js');
const xml2js = BBPromise.promisifyAll(require('xml2js'));

// Process XML which has been converted to a JS obj from DC metadata
function processDC(jsobj) {
    const record = {};
    let recordIDS;
    let newKey;
    let newValue;
    Object.keys(jsobj).forEach((key) => {
        // Get OCLC #
        if (key === 'oclcterms:recordIdentifier') {
            recordIDS = jsobj[key];
            if (Array.isArray(recordIDS)) {
                recordIDS.forEach((element) => {
                    // Use regex to verify id is 9 digit number; likely to be OCLC #
                    if (typeof element === 'string' && element.match(new RegExp('^\\d{8,9}$'))) {
                        record.oclc = element;
                    }
                });
            }
        }
        // Process DC metadata
        newKey = key.split(':');
        if (newKey && Array.isArray(newKey) && newKey.length === 2 && newKey[0] === 'dc') {
            newKey = newKey[1];
            // Fix language obj so it can be recognised by translator
            if (newKey === 'language') {
                newValue = jsobj[key][0]._;
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
function getItemType(record) {
    let itemType;
    // Types for worldcat search API dublincore records
    const types = {
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
    if (record.type && Array.isArray(record.type) && record.type[0]) {
        itemType = types[record.type[0]];
    }
    if (!itemType) { itemType = 'book'; }
    return itemType;
}

// Process MarcXML which has been converted to a JS obj
function processMARCXML(jsobj) {
    let key;
    let value;
    let code;
    const record = {};
    let i;
    let j;
    let item;
    let subitem;
    const trailing = /\s*[/:;.]*\s*$/; // Regex for trailing punct and white space
    for (i = 0; i < jsobj.length; i++) {
        item = jsobj[i];
        const tag = item.$.tag;
        if (item.subfield) {
            for (j = 0; j < item.subfield.length; j++) {
                subitem = item.subfield[j];
                code = subitem.$.code;
                // Remove trailing punctuation and white space
                value = subitem._.replace(trailing, '');

                key = code + tag; // Create key out of tag and subfield code
                if (!record[key]) { // If undef, def new key
                    record[key] = [ value ]; // Put in Array since same tag/code entry is allowed
                } else {
                    record[key].push(value); // If key already exists, add new value
                }
            }
        } else {
            key = tag;
            value = item._;
            if (!record[key]) { // If undef, def new key
                record[key] = [ value ]; // Put in Array since same tag/code entry is allowed
            } else {
                record[key].push(value); // If key already exists, add new value
            }
        }

    }
    return record;
}

// Return an itemType given a MarcXML record JS obj
function getMARCItemType(record) {
    const itemType = 'book'; // MarcXML unfortnately does not report the item type, default to book
    return itemType;
}

/**
 * XMLReader class
 */
class XMLReader {

    constructor(app, translator, worldCatService) {
        this.worldCatService = worldCatService;
        this.translator = translator;
    }

    translate(citationObj, cr, xml, wskeyFormat, creatorOverwrite) {

        let content = citationObj.content;
        let message = `Unable to retrieve data from ISBN ${citationObj.isbn}`;

        let record;
        let controlfields;

        return xml2js.parseStringAsync(xml).then((result) => {
            if (wskeyFormat === 'dc') {
                if (result && result.oclcdcs) {
                    record = processDC(result.oclcdcs);
                    if (!content.itemType) {
                        content.itemType = getItemType(record);
                    }

                    // dublinCore.js translator properties; won't overwrite previous values
                    content = this.translator.translate(content, record, dc[content.itemType],
                        creatorOverwrite);

                    // Add OCLC number to response, url, and oclc fields;
                    // may overwrite previous values
                    if (record.oclc) {
                        citationObj.oclc = record.oclc;
                        content.oclc = record.oclc;
                        content.url = `https://www.worldcat.org/oclc/${record.oclc}`;
                    }

                    return cr;
                } else {
                    return BBPromise.reject(message);
                }
            } else if (wskeyFormat === 'marc') {
                if (result && result.record && result.record.datafield) {
                    record = processMARCXML(result.record.datafield, record);
                    if (!content.itemType) {
                        content.itemType = getMARCItemType(record);
                    }
                    controlfields = processMARCXML(result.record.controlfield);
                    content = this.translator.translate(content, record, marc[content.itemType],
                        creatorOverwrite);

                    // Add OCLC number to response, url, and oclc fields
                    content.oclc = controlfields['001'][0];
                    content.url = `https://www.worldcat.org/oclc/${content.oclc}`;

                    citationObj.oclc = content.oclc;

                    return cr;
                } else {
                    return BBPromise.reject(message);
                }
            } else if (wskeyFormat === 'open') {

                message = `Unable to retrieve data from search query ${citationObj.any}`;
                if (result.feed.entry === undefined) { return BBPromise.reject(message); }
                let con; // Temp storage of citation content

                record = result.feed.entry[0];
                con = {};
                con.itemType = 'book'; // Temporarily set this to book although others are possible

                // Fix author value structure to work with translator
                if (record.author) {
                    for (let j = 0; j < record.author.length; j++) {
                        record.author[j] = record.author[j].name[0];
                    }
                }

                con = this.translator.translate(con, record, oSearch[con.itemType]);

                // Request more info using dublinCore
                return this.worldCatService.singleRecordRequest(con.oclc, 'oclc', 'dc')
                .then((body) => {
                    return xml2js.parseStringAsync(body).then((result) => {

                        // Try to add additional info to citation from oclc search results
                        if (result.oclcdcs) {
                            record = processDC(result.oclcdcs);
                            // Overwrite book itemType

                            con.itemType = getItemType(record);
                            // dublinCore.js translator properties

                            con = this.translator.translate(con, record, dc[con.itemType]);

                        }
                        // Put contents into Citation objects in cr
                        citationObj.content = con;
                        citationObj.responseCode = 200;
                        citationObj.source.push('WorldCat');
                        return citationObj;
                    });
                });

            }

        })
        .catch((err) => {
            cr.logger.log('debug/XMLReader', err);
            return BBPromise.reject(message);
        });
    }

}

exports = module.exports = XMLReader;
