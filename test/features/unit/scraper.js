var assert = require('../../utils/assert.js');
var scraper = require('../../../lib/Scraper.js');
var bp = require('../../../lib/translators/bePress.js');
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
    {value:bp, name: 'bePress'},
    {value:bp, name: 'highwirePress'}, // Use bp translator on highwire press metadata
    {value:coins, name:'coins'},
    {value:dc, name:'dublinCore'},
    {value:gen, name:'general'},
    {value:og, name:'openGraph'}
];
var htmlFiles = [
    {value:movie, name:'movie'},
    {value:article, name:'article'}
];

describe('translate function: ', function() {
    var types = new CachedTypes();
    var citation;
    var result;
    var expected;
    var itemTypeName;

    // Cycle through every translator
    translators.forEach(function(metadataType) {
        // Cycle through every sample html file
        htmlFiles.forEach(function(file) {
            it('translates '+ metadataType.name +' metadata from ' + file.name + ' file', function() {
                // Get metadata from html file
                return meta.parseAll(file.value).then(function(metadata){
                    // For every valid Zotero item type, check corresponding translator on file
                    Object.keys(itemTypes).forEach(function(key){
                        itemTypeName = types.itemTypeMethods.getName(key);
                        // Ensure every itemType has a corresponding translator
                        if (!metadataType.value[itemTypeName]){
                            throw new Error('No translator found for itemType ' + itemTypeName);
                        }
                        // Only test citation if metadata exists for the given translator type
                        if(metadata[metadataType.name]){
                            citation = scraper.translate({itemType:itemTypeName}, metadata[metadataType.name], metadataType.value[itemTypeName]);
                            // Check that every key in citation is a valid field for given type
                            Object.keys(citation).forEach(function(citationField){
                                result = types.itemFieldsMethods.isValidForType(citationField, itemTypeName);
                                assert.deepEqual(result, true, 'Citation field "' + citationField + '" is not valid for itemType "' + itemTypeName + '"');
                            });
                            if (citation.creators){
                                for (var c in citation.creators){
                                    result = types.creatorTypesMethods.isValidForType(citation.creators[c].creatorType, itemTypeName);
                                    assert.deepEqual(result, true, 'Citation field "' + citation.creators[c].creatorType + '" is not valid for itemType "' + itemTypeName + '"');
                                }
                            }
                        }
                    });
                });
            });
        });
    });
});

describe('addItemType function: ', function() {
    it('sets videoRecording itemType', function() {
        return meta.parseAll(movie).then(function(metadata){
            var itemType = scraper.addItemType(metadata, {}).itemType;
            assert.deepEqual(itemType, 'videoRecording', 'Expected itemType videoRecording, got itemType ' + itemType);
        });
    });

    it('sets article itemType', function() {
        return meta.parseAll(article).then(function(metadata){
            var itemType = scraper.addItemType(metadata, {}).itemType;
            assert.deepEqual(itemType, 'journalArticle', 'Expected itemType journalArticle, got itemType ' + itemType);
        });
    });

    it('sets itemType webpage if no relevant metadata available', function() {
        var metadata = {general:{title:'Example domain'}};
        var itemType = scraper.addItemType(metadata, {}).itemType;
        assert.deepEqual(itemType, 'webpage', 'Expected itemType webpages, got itemType ' + itemType);

    });
});
