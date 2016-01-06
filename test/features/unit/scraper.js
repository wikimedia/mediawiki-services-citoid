var assert = require('../../utils/assert.js');
var scraper = require('../../../lib/Scraper.js');
var coins = require('../../../lib/translators/coins.js');
var dc = require('../../../lib/translators/dublinCore.js');
var gen = require('../../../lib/translators/general.js');
var og = require('../../../lib/translators/openGraph.js');
var CachedTypes = require('../../../lib/zotero/cachedTypes.js');
var itemTypes = require('../../../lib/zotero/typeSchemaData.js').itemTypes;

var meta = require('html-metadata');
var cheerio = require('cheerio');
var fs = require('fs');

var movie = cheerio.load(fs.readFileSync('./node_modules/html-metadata/test/static/turtle_movie.html'));
var article = cheerio.load(fs.readFileSync('./node_modules/html-metadata/test/static/turtle_article.html'));

var translators = [
    {value:coins, name:'coins'},
    {value:dc, name:'dublinCore'},
    {value:gen, name:'general'},
    {value:og, name:'openGraph'}
];
var htmlFiles = [
    {value:movie, name:'movie'},
    {value:article, name:'article'}
];

describe('lib/Scraper.js translate function: ', function() {
    var types = new CachedTypes();
    var citation;
    var result;
    var expected;
    var itemTypeName;
    var metadataType;

    // Cycle through every translator
    for (var t in translators){
        metadataType = translators[t];
        // Cycle through every sample html file
        for (var file in htmlFiles){
            it('translates '+ metadataType.name +' metadata from ' + htmlFiles[file].name + ' file', function() {
                // Get metadata from html file
                return meta.parseAll(htmlFiles[file].value).then(function(metadata){
                    // For every valid Zotero item type, check corresponding translator on file
                    Object.keys(itemTypes).forEach(function(key){
                        itemTypeName = types.itemTypeMethods.getName(key);
                        citation = scraper.translate({}, metadata[metadataType.name], metadataType.value[itemTypeName]);
                        // Check that every key in citation is a valid field for given type
                        Object.keys(citation).forEach(function(citationField){
                            result = types.itemFieldsMethods.isValidForType(citationField, itemTypeName);
                            assert.deepEqual(result, true, 'Citation field "' + citationField + '" is not valid for itemType "' + itemTypeName + '"');
                        });
                    });
                });
            });
        }
    }
});