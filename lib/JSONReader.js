
/**
 * Translate JSON - currently translators only xISBN JSON
 */

/**
 * Local dependencies
 */
var xisbn = require('./translators/xISBN.js');

/**
 * JSONReader constructor
 */
var JSONReader = function(app, translator){
    this.logger = app.logger;
    this.exporter = null;
    this.translator = translator;
};

JSONReader.prototype.addItemType = function(json, content){

    // Set citation type from metadata
    if (!content.itemType){ // Don't overwrite itemtype; current use should never already have itemType assigned, however.
        // Assumes xISBN since currently this is the only JSON being used
        if (json) {
            content.itemType = xisbn.returnItemType(json);
        } else {
            content.itemType = 'book'; //default itemType for items with ISBN
        }
    }
    return content;
};

JSONReader.prototype.translate = function(citationObj, cr, json){
    var content = citationObj.content;
    content = this.addItemType(json, content);
    content = this.translator.translate(content, json.list[0], xisbn[content.itemType]);

    citationObj.responseCode = 200;

    return cr;
};

exports = module.exports = JSONReader;