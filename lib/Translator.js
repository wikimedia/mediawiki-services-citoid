
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
 * @param  {Boolean} creatorOverwrite whether or not unique creator translators can be run multiply
 */
Translator.prototype.translate = function(citation, metadata, translator, creatorOverwrite){
	var logger = this.logger;
    if (!translator || !metadata){return citation;}
    var property;
    var creatorSubnames = []; // Store types of creators already added
    var useCreatorTranslator = false; // Bool for whether a creator translator should be used.

    for (var key in metadata) {
        if (metadata.hasOwnProperty(key)) { // Loop through properties of metadata Obj
            property = translator[key]; // Look up property in the translator to find the translator function specific to the field
            if (!property){continue;} // Skip rest of loop if undefined
            // Set bool to determine if current translator is a non-duplicate creators translator subname
            if (creatorOverwrite && property.name && property.name === 'creators' && property.subname){
                if (creatorSubnames.indexOf(property.subname)=== -1){ // Run translator if not already in array
                    useCreatorTranslator = true;
                    creatorSubnames.push(property.subname); // i.e. 'author' or 'contributor'
                }
            }
            // Don't overwrite properties already set; only allows translator to be run only if it's a non-duplicate creator subtype
            if (!citation[property.name] || useCreatorTranslator){
                try {
                    citation = property.translate(citation, metadata, key);
                    useCreatorTranslator = false; // Set to false for next iteration
                } catch (e) {
                    logger.log('debug/translator', "Failed to translate property " + property.name);
                }
            }
        }
    }
    return citation;
};

exports = module.exports = Translator;