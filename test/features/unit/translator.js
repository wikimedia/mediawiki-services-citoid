'use strict';

/* External libraries */
const meta = require( 'html-metadata' );
const cheerio = require( 'cheerio' );
const fs = require( 'fs' );

/* Local dependancies */
const assert = require( '../../utils/assert.js' );
const CachedTypes = require( '../../../lib/zotero/cachedTypes.js' );
const itemTypes = require( '../../../lib/zotero/typeSchemaData.js' ).itemTypes;
const scraper = require( '../../../lib/Scraper.js' );
const Translator = require( '../../../lib/Translator.js' );

/* Translators */
const bp = require( '../../../lib/translators/bePress.js' );
const coins = require( '../../../lib/translators/coins.js' );
const cr = require( '../../../lib/translators/crossRef.js' );
const dc = require( '../../../lib/translators/dublinCore.js' );
const gen = require( '../../../lib/translators/general.js' );
const og = require( '../../../lib/translators/openGraph.js' );

/* Static files */
const movie = cheerio.load( fs.readFileSync( './node_modules/html-metadata/test/static/turtle_movie.html' ) );
const article = cheerio.load( fs.readFileSync( './node_modules/html-metadata/test/static/turtle_article.html' ) );
const song = cheerio.load( fs.readFileSync( 'test/utils/static/metacharset.html' ) );

const translators = [
	{ value: bp, name: 'bePress' },
	{ value: bp, name: 'highwirePress' }, // Use bp translator on highwire press metadata
	{ value: coins, name: 'coins' },
	{ value: dc, name: 'dublinCore' },
	{ value: gen, name: 'general' },
	{ value: og, name: 'openGraph' }
];

const htmlFiles = [
	{ value: movie, name: 'movie' },
	{ value: article, name: 'article' },
	{ value: song, name: 'song' }
];

const Logger = require( '../../../node_modules/service-runner/lib/logger.js' );
const logStream = require( '../../utils/logStream.js' );
// const conf = yaml.safeLoad(fs.readFileSync('./config.yaml'));

const app = {
	conf: {}
};

app.conf.logging = {
	name: 'test-log',
	level: 'trace',
	stream: logStream()
};

app.logger = new Logger( app.conf.logging );

const translator = new Translator( app );
const types = new CachedTypes();

describe( 'Tests for Translator.js : ', function () {

	describe( 'translate function on html: ', function () {

		let citation;
		let result;
		let itemTypeName;

		// Cycle through every translator
		// eslint-disable-next-line mocha/no-setup-in-describe
		translators.forEach( function ( metadataType ) {
			// Cycle through every sample html file
			htmlFiles.forEach( function ( file ) {
				it( 'translates ' + metadataType.name + ' metadata from ' + file.name + ' file', function () {
					// Get metadata from html file
					return meta.parseAll( file.value ).then( function ( metadata ) {
						// For every valid Zotero item type, check corresponding translator on file
						Object.keys( itemTypes ).forEach( function ( key ) {
							itemTypeName = types.itemTypeMethods.getName( key );
							// Ensure every itemType has a corresponding translator
							if ( !metadataType.value[ itemTypeName ] ) {
								throw new Error( 'No translator found for itemType ' + itemTypeName );
							}
							// Only test citation if metadata exists for the given translator type
							if ( metadata[ metadataType.name ] ) {
								citation = translator.translate( { itemType: itemTypeName }, metadata[ metadataType.name ], metadataType.value[ itemTypeName ] );
								// Check that every key in citation is a valid field for given type
								Object.keys( citation ).forEach( function ( citationField ) {
									result = types.itemFieldsMethods.isValidForType( citationField, itemTypeName );
									assert.deepEqual( result, true, 'Citation field "' + citationField + '" is not valid for itemType "' + itemTypeName + '"' );
								} );
								if ( citation.creators ) {
									for ( const c in citation.creators ) {
										result = types.creatorTypesMethods.isValidForType( citation.creators[ c ].creatorType, itemTypeName );
										assert.deepEqual( result, true, 'Citation field "' + citation.creators[ c ].creatorType + '" is not valid for itemType "' + itemTypeName + '"' );
									}
								}
							}
						} );
					} );
				} );
			} );
		} );
	} );

	describe( 'translate function on json: ', function () {
		let crossRefJSON;
		let citation;
		let expected;
		let itemTypeName;
		let result;

		before( () => {
			crossRefJSON = JSON.parse( fs.readFileSync( './test/utils/static/crossRef.json' ) );
		} );

		it( 'sets right info from journal-article crossRef metadata', function () {
			citation = { itemType: 'journalArticle' };
			citation = translator.translate( citation, crossRefJSON[ 0 ], cr.journalArticle );
			expected = {
				itemType: 'journalArticle',
				creators:
				[ {
					creatorType: 'author',
					firstName: 'Rachel C.',
					lastName: 'Glade'
				},
				{
					creatorType: 'author',
					firstName: 'Robert S.',
					lastName: 'Anderson'
				},
				{
					creatorType: 'author',
					firstName: 'Gregory E.',
					lastName: 'Tucker'
				} ],
				issue: '4',
				volume: '45',
				pages: '311-314',
				date: '2017-01-23',
				ISSN: '0091-7613, 1943-2682',
				publicationTitle: 'Geology',
				DOI: '10.1130/g38665.1',
				url: 'http://dx.doi.org/10.1130/g38665.1',
				title: 'Block-controlled hillslope form and persistence of topography in rocky landscapes'
			};
			assert.deepEqual( citation, expected );
		} );

		it( 'sets right info from book-section crossRef metadata', function () {
			citation = { itemType: 'bookSection' };
			citation = translator.translate( citation, crossRefJSON[ 1 ], cr.bookSection );
			expected = {
				itemType: 'bookSection',
				publisher: 'Presses Universitaires de France',
				ISBN: '9782130565727',
				creators:
[ {
	creatorType: 'author',
	firstName: 'Johanne',
	lastName: 'Prud’homme'
} ],
				date: '2007',
				pages: '87',
				bookTitle: 'Harry Potter, ange ou démon ?',
				url: 'http://dx.doi.org/10.3917/puf.tsch.2007.01.0087',
				title: 'Harry Potter à l’école des juvénistes'
			};
			assert.deepEqual( citation, expected );
		} );

		it( 'tests every itemType for crossRef translator on every sample crossRef file', function () {
			// Cycle through every crossRef sample metadata in file
			crossRefJSON.forEach( function ( metadata ) {
				// For every valid Zotero item type, check corresponding object in the crossRef translator
				Object.keys( cr ).forEach( function ( key ) {
					itemTypeName = types.itemTypeMethods.getName( key );
					// Ensure every itemType has a corresponding translator
					if ( !cr[ itemTypeName ] && key !== 'types' ) { // Don't throw error for types obj
						throw new Error( 'No translator found for itemType ' + itemTypeName );
					}
					if ( metadata ) {
						citation = translator.translate( { itemType: itemTypeName }, metadata, cr[ itemTypeName ] );
						// Check that every key in citation is a valid field for given type
						Object.keys( citation ).forEach( function ( citationField ) {
							result = types.itemFieldsMethods.isValidForType( citationField, itemTypeName );
							assert.deepEqual( result, true, 'Citation field "' + citationField + '" is not valid for itemType "' + itemTypeName + '"' );
						} );
						if ( citation.creators ) {
							for ( const c in citation.creators ) {
								result = types.creatorTypesMethods.isValidForType( citation.creators[ c ].creatorType, itemTypeName );
								assert.deepEqual( result, true, 'Citation field "' + citation.creators[ c ].creatorType + '" is not valid for itemType "' + itemTypeName + '"' );
							}
						}
					}
				} );
			} );
		} );
	} );

	describe( 'addItemType function: ', function () {
		it( 'sets videoRecording itemType', function () {
			return meta.parseAll( movie ).then( function ( metadata ) {
				const itemType = scraper.addItemType( metadata, {} ).itemType;
				assert.deepEqual( itemType, 'videoRecording', 'Expected itemType videoRecording, got itemType ' + itemType );
			} );
		} );

		it( 'sets article itemType', function () {
			return meta.parseAll( article ).then( function ( metadata ) {
				const itemType = scraper.addItemType( metadata, {} ).itemType;
				assert.deepEqual( itemType, 'journalArticle', 'Expected itemType journalArticle, got itemType ' + itemType );
			} );
		} );

		it( 'sets audioRecording itemType from openGraph', function () {
			return meta.parseAll( song ).then( function ( metadata ) {
				const itemType = scraper.addItemType( metadata, {} ).itemType;
				assert.deepEqual( itemType, 'audioRecording', 'Expected itemType audioRecording, got itemType ' + itemType );
			} );
		} );

		it( 'sets itemType webpage if no relevant metadata available', function () {
			const metadata = { general: { title: 'Example domain' } };
			const itemType = scraper.addItemType( metadata, {} ).itemType;
			assert.deepEqual( itemType, 'webpage', 'Expected itemType webpages, got itemType ' + itemType );

		} );
	} );

	describe( 'check specific results: ', function () {
		it( 'sets right info from webpage for general metadata', function () {
			return meta.parseAll( article ).then( function ( metadata ) {
				const citation = translator.translate( { itemType: 'webpage' }, metadata.general, gen.webpage );
				const expected = {
					itemType: 'webpage',
					creators: [
						{
							creatorType: 'author',
							lastName: 'Lvr',
							firstName: 'Turtle'
						}
					],
					url: 'http://example.com/turtles',
					abstractNote: 'Exposition on the awesomeness of turtles',
					title: 'Turtles are AWESOME!!1 | Awesome Turtles Website',
					language: 'en'
				};
				assert.deepEqual( citation, expected );
			} );
		} );

		it( 'sets right info from webpage for bepress metadata', function () {
			return meta.parseAll( article ).then( function ( metadata ) {
				const citation = translator.translate( { itemType: 'webpage' }, metadata.bePress, bp.webpage );
				const expected = {
					itemType: 'webpage',
					creators: [
						{
							creatorType: 'author',
							lastName: 'Lvr',
							firstName: 'Turtle'
						}
					],
					date: '2012',
					title: 'Turtles are AWESOME!!1'
				};
				assert.deepEqual( citation, expected );
			} );
		} );
	} );

} );
