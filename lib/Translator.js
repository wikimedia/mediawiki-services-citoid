
/**
 * General functions relating to translation
 * Useable by Scraper.js (html-scraping), JSONReader.js (JSON translation).
 */


/**
 * Translator constructor
 */
var Translator = function(app){
    this.logger = app.logger;
};


/**
 * Adds metadata to citation object given a metadata of a
 * specific type, and a translator specific to that metadata type
 * @param  {Object} metadata   flat metadata object (i.e. metadata.openGraph)
 * @param  {Object} translator
 */
Translator.prototype.translate = function(citation, metadata, translator){
	var logger = this.logger;
    if (!translator || !metadata){return citation;}
    var property;
    Object.keys(metadata).forEach(function(key){ // Loop through results
        property = translator[key]; // Look up property in translator
        if (property && !citation[property.name]){ // If it has a corresponding translation and won't overwrite properties already set
            try {
                citation = property.translate(citation, metadata, key);
            } catch (e) {
                logger.log('debug/scraper', "Failed to translate property " + property.name);
            }
        }
    });
    return citation;
};

exports = module.exports = Translator;