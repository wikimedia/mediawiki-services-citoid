
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

JSONReader.prototype.addItemType = function(json, citation){
    citation = citation || {};

    // Set citation type from metadata
    if (!citation.itemType){ // Don't overwrite itemtype; current use should never already have itemType assigned, however.
        // Assumes xISBN since currently this is the only JSON being used
        if (json) {
            citation.itemType = xisbn.returnItemType(json);
        } else {
            citation.itemType = 'book'; //default itemType for items with ISBN
        }
    }
    return citation;
};

JSONReader.prototype.translate = function(cr, json){
    var cit = cr.response.citation[0];
    cit = this.addItemType(json, cit);
    cit = this.translator.translate(cit, json.list[0], xisbn[cit.itemType]);
    cr.response.responseCode = 200;
    return cr;
};

exports = module.exports = JSONReader;