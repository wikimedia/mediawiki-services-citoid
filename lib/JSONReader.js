'use strict';

/**
 * Translate JSON - currently translators only xISBN JSON
 */

/**
 * Local dependencies
 */
const xisbn = require('./translators/xISBN.js');


class JSONReader {


    /**
    * JSONReader constructor
    */
    constructor(app, translator) {
        this.logger = app.logger;
        this.exporter = null;
        this.translator = translator;
    }

    addItemType(json, content) {

        // Set citation type from metadata
        // Don't overwrite itemtype; current use should never already have itemType assigned
        if (!content.itemType) {
            // Assumes xISBN since currently this is the only JSON being used
            if (json) {
                content.itemType = xisbn.returnItemType(json);
            } else {
                content.itemType = 'book'; // default itemType for items with ISBN
            }
        }
        return content;
    }

    translate(citationObj, cr, json) {
        // eslint-disable-next-line no-unused-vars
        let content = citationObj.content;
        content = this.addItemType(json, content);
        content = this.translator.translate(content, json.list[0], xisbn[content.itemType]);

        citationObj.responseCode = 200;

        return cr;
    }


}


module.exports = JSONReader;
