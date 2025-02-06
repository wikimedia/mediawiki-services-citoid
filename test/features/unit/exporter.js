'use strict';

const assert = require( '../../utils/assert.js' );
const exporter = require( '../../../lib/Exporter.js' );
const Citation = require( '../../../lib/Citation.js' );

describe( 'lib/Exporter.js functions: ', () => {

	let result;
	let expected;
	let input;

	describe( 'validation functions: ', () => {
		describe( 'fixURL: ', () => {
			let url;

			it( 'discards url with no host', () => {
				url = 'http://www.example.com/path/with/host';
				expected = { url: url };
				result = exporter.fixURL( url, { url: '/path/without/host' } );
				assert.deepEqual( result, expected );
			} );

			it( 'adds protocol to url when missing', () => {
				expected = { url: 'http://www.example.com/without/protocol' };
				result = exporter.fixURL( 'http://www.example.com/with/protocol', { url: 'www.example.com/without/protocol' } );
				assert.deepEqual( result, expected );
			} );
		} );

		describe( 'fixWebsiteTitle: ', () => {
			let url;

			it( 'Adds missing website title', () => {
				url = 'http://www.example.com';
				expected = { url: url, itemType: 'webpage', websiteTitle: 'www.example.com' };
				result = exporter.fixWebsiteTitle( { url: 'http://www.example.com', itemType: 'webpage' } );
				assert.deepEqual( result, expected );
			} );

			it( 'Does not add missing website title if itemType is missing', () => {
				url = 'http://www.example.com';
				expected = { url: url };
				result = exporter.fixWebsiteTitle( { url: 'http://www.example.com' } );
				assert.deepEqual( result, expected );
			} );

			it( 'Does not add missing website title if url is relative', () => {
				url = '/relative/path/';
				expected = { url: url };
				result = exporter.fixWebsiteTitle( { url: '/relative/path/' } );
				assert.deepEqual( result, expected );
			} );

		} );

		describe( 'addIDSToCitation: ', () => {
			let title;

			it( 'cleans script and html out of title', () => {
				title = 'f<script>alert(1);</script><i>taggytaggy</i></i>';
				expected = { title: 'falert(1);taggytaggy' };
				result = exporter.stripCitation( { title: title } );
				assert.deepEqual( result, expected );
			} );
		} );

		describe( 'stripCitation:', () => {
			let title;

			it( 'cleans script and html out of title', () => {
				title = 'f<script>alert(1);</script><i>taggytaggy</i></i>';
				expected = { title: 'falert(1);taggytaggy' };
				result = exporter.stripCitation( { title: title } );
				assert.deepEqual( result, expected );
			} );

			let doi;

			it( 'does not clean doi', () => {
				doi = '10.1175/1520-0485(1995)025<0855:IEODC>2.0.CO;2';
				expected = { DOI: '10.1175/1520-0485(1995)025<0855:IEODC>2.0.CO;2' };
				result = exporter.stripCitation( { DOI: doi } );
				assert.deepEqual( result, expected );
			} );
		} );

		describe( 'fixDate: ', () => {
			let date;

			it( 'Contains copyright symbol', () => {
				date = '©2010';
				expected = { date: '2010' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Is in brackets for some unfathomable reason', () => {
				date = '[2010]';
				expected = { date: '2010' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Contains copyright symbol & whitespace', () => {
				date = ' ©2010';
				expected = { date: '2010' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Contains c symbol', () => {
				date = 'c2010';
				expected = { date: '2010' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'sets year only date to year only date', () => {
				date = '2010';
				expected = { date: '2010' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'converts American style date to ISO', () => {
				date = '07/08/1999';
				expected = { date: '1999-07-08' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Unable to parse so leaves as written; season', () => { // Partial ISO?
				date = 'Fall 1975';
				expected = { date: 'Fall 1975' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Chooses worldcat publication year', () => {
				date = '2014, ©2010';
				expected = { date: '2014' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Multilingual date - Spanish - leaves as written', () => {
				date = 'Mayo de 2010';
				expected = { date: 'Mayo de 2010' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Multilingual date - Russian - leaves as written', () => {
				date = 'Май 2010 г.';
				expected = { date: 'Май 2010 г.' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Normal date', () => {
				date = 'May 8 2010';
				expected = { date: '2010-05-08' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Normal date with ordinal indicator', () => {
				date = 'May 8th, 2010';
				expected = { date: '2010-05-08' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly sets normal date with ordinal number', () => {
				date = 'May eighth, 2010';
				expected = { date: '2010-05-08' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Date on the fence: ISO with - notation', () => {
				date = '2013-04-02T20:00:03-07:00';
				expected = { date: '2013-04-02' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Date on the fence; ISO with + notation', () => {
				date = '2016-03-08T01:16:07+02:00';
				expected = { date: '2016-03-08' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Date on the fence; toString output', () => {
				date = 'Sat May 08 2010 00:16:07 GMT+0100 (BST)';
				expected = { date: '2010-05-08' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Date on the fence; ISO with Z notation', () => {
				date = '2010-05-08T00:16:00.060Z';
				expected = { date: '2010-05-08' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Year first date', () => {
				date = '1975 Nov-Dec';
				expected = { date: '1975-11' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Partial ISO date no preceeding 0', () => {
				date = '1975-2';
				expected = { date: '1975-02' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Full ISO date no preceeding 0', () => {
				date = '1975-2-01';
				expected = { date: '1975-02-01' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Full ISO date no preceeding 0 month or day', () => {
				date = '1975-2-1';
				expected = { date: '1975-02-01' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Slashes full date', () => {
				date = '1975/02/04';
				expected = { date: '1975-02-04' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Slashes partial date', () => {
				date = '1975/02';
				expected = { date: '1975-02' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Slashes partial date with 0 month', () => {
				date = '1975/00';
				expected = { date: '1975' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			// Feasibly a regression in the chrono-node library which needs update for security reasons
			it.skip( 'Slashes partial date with 00s', () => {
				date = '1975/02/00';
				expected = { date: '1975-02' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'Slashes partial year with 00s', () => {
				date = '1975/00/00';
				expected = { date: '1975' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'XX partial date', () => {
				date = '1975-02-XX';
				expected = { date: '1975-02' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'XX partial year', () => {
				date = '1975-XX-XX';
				expected = { date: '1975' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'unix timestamp', () => {
				date = '1660329624';
				expected = { date: '2022-08-12' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

			it( 'unix timestamp with space', () => {
				date = ' 1660329624 ';
				expected = { date: '2022-08-12' };
				result = exporter.fixDate( { date: date } );
				assert.deepEqual( result, expected );
			} );

		} );

		describe( 'fixDOI: ', () => {
			it( 'Correctly gets DOI from full citation', () => {
				input = 'Gatherer, D.  and Kohl, A.     (2016)  Zika virus: a previously slow pandemic spreads rapidly through the Americas.   Journal of General Virology , 97,  pp. 269-273.   (doi: 10.1099/jgv.0.000381 ) (PMID:26684466)"';
				expected = { DOI: '10.1099/jgv.0.000381' };
				result = exporter.fixDOI( { DOI: input } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly removes DOI that is not a DOI', () => {
				input = '10.1099gv.0.000381 ) (PMID:26684466)"';
				expected = {};
				result = exporter.fixDOI( { DOI: input } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly gets DOI when only DOI is present', () => {
				input = '10.1099/jgv.0.000381';
				expected = { DOI: '10.1099/jgv.0.000381' };
				result = exporter.fixDOI( { DOI: input } );
				assert.deepEqual( result, expected );
			} );
		} );

		describe( 'fixISBN: ', () => {
			let isbnStr;

			it( 'Correctly hyphenates single ISBN-10', () => {
				isbnStr = '0810935317';
				expected = { ISBN: [ '0-8109-3531-7' ] };
				result = exporter.fixISBN( { ISBN: isbnStr } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly handles ISBN-13s that have spaces in them', () => {
				isbnStr = '978 0810935310';
				expected = { ISBN: [ '978-0-8109-3531-0' ] };
				result = exporter.fixISBN( { ISBN: isbnStr } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly extracts two ISBN-10s', () => {
				isbnStr = '0-8109-3531-7 081093531X';
				expected = { ISBN: [ '0-8109-3531-7', '081093531X' ] };
				result = exporter.fixISBN( { ISBN: isbnStr } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly extracts ISBN-13', () => {
				isbnStr = '9780810935310 9780810935310';
				expected = { ISBN: [ '978-0-8109-3531-0', '978-0-8109-3531-0' ] };
				result = exporter.fixISBN( { ISBN: isbnStr } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly extracts ISBN-10 and ISBN-13', () => {
				isbnStr = '9780810935310 0810935317 007462542X 9780810935310';
				expected = { ISBN: [ '978-0-8109-3531-0', '0-8109-3531-7', '0-07-462542-X', '978-0-8109-3531-0' ] };
				result = exporter.fixISBN( { ISBN: isbnStr } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly handles and normalizes hyphenated ISBN', () => {
				isbnStr = '978-0-8109-3531-0 0-8109-3531-7';
				expected = { ISBN: [ '978-0-8109-3531-0', '0-8109-3531-7' ] };
				result = exporter.fixISBN( { ISBN: isbnStr } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly handles ISBNs with and without hyphens', () => {
				isbnStr = '978-0-8109-3531-0 0810935317';
				expected = { ISBN: [ '978-0-8109-3531-0', '0-8109-3531-7' ] };
				result = exporter.fixISBN( { ISBN: isbnStr } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly handles multiple ISBN-13s that have spaces in them', () => {
				isbnStr = '978 0810935310 007462542X 978 0810935310';
				expected = { ISBN: [ '978-0-8109-3531-0', '0-07-462542-X', '978-0-8109-3531-0' ] };
				result = exporter.fixISBN( { ISBN: isbnStr } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly handles out comma separated ISBNs', () => {
				isbnStr = '978 0810935310, 081093531X, 978-0-8109-3531-0, 9780810935310';
				expected = { ISBN: [ '978-0-8109-3531-0', '081093531X', '978-0-8109-3531-0', '978-0-8109-3531-0' ] };
				result = exporter.fixISBN( { ISBN: isbnStr } );
				assert.deepEqual( result, expected );
			} );
		} );

		describe( 'fixISSN: ', () => {
			let issn;

			it( 'Correctly ignores None ISSN', () => {
				issn = 'None';
				expected = {};
				result = exporter.fixISSN( { ISSN: issn } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly adds valid ISSN', () => {
				issn = '0317-8471';
				expected = { ISSN: [ '0317-8471' ] };
				result = exporter.fixISSN( { ISSN: issn } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly adds valid ISSN with X', () => {
				issn = '2434-561X';
				expected = { ISSN: [ '2434-561X' ] };
				result = exporter.fixISSN( { ISSN: issn } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly adds valid ISSN with x', () => {
				issn = '2434-561x';
				expected = { ISSN: [ '2434-561x' ] };
				result = exporter.fixISSN( { ISSN: issn } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly ignores invalid ISSN without hyphen', () => {
				issn = '12345678';
				expected = {};
				result = exporter.fixISSN( { ISSN: issn } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly ignores invalid ISSN', () => {
				issn = '123456789';
				expected = {};
				result = exporter.fixISSN( { ISSN: issn } );
				assert.deepEqual( result, expected );
			} );
		} );

		describe( 'fixPages: ', () => {
			it( 'converts hyphen minus to en dash', () => {
				expected = { pages: '15–44' };
				result = exporter.fixPages( { pages: '15-44' } );
				assert.deepEqual( result, expected );
			} );
		} );

		describe( 'replaceCreators:', () => {
			let creators;

			it( 'Correctly adds name with firstName and lastName present', () => {
				creators = [
					{ creatorType: 'author', lastName: 'Plath', firstName: 'Sylvia' },
					{ creatorType: 'author', lastName: 'Hughes', firstName: 'Langston' }
				];
				expected = { author: [
					[ 'Sylvia', 'Plath' ],
					[ 'Langston', 'Hughes' ]
				] };
				result = exporter.replaceCreators( { creators: creators } );
				assert.deepEqual( result, expected );
			} );

			it( 'Correctly adds names with only lastName or firstName present', () => {
				creators = [
					{ creatorType: 'author', lastName: '', firstName: 'Madonna' },
					{ creatorType: 'author', lastName: 'Prince', firstName: '' }
				];
				expected = { author: [
					[ 'Madonna', '' ],
					[ '', 'Prince' ]
				] };
				result = exporter.replaceCreators( { creators: creators } );
				assert.deepEqual( result, expected );
			} );

			it( 'Adds names with name field', () => {
				creators = [
					{ creatorType: 'author', name: 'Madonna' },
					{ creatorType: 'author', name: 'Prince' }
				];
				expected = { author: [
					[ '', 'Madonna' ],
					[ '', 'Prince' ]
				] };
				result = exporter.replaceCreators( { creators: creators } );
				assert.deepEqual( result, expected );
			} );

			it( 'Doesn\'t add names with incorrect field name', () => {
				creators = [
					{ creatorType: 'author', foo: 'Madonna' },
					{ creatorType: 'author', foo: 'Prince' }
				];
				expected = {};
				result = exporter.replaceCreators( { creators: creators } );
				assert.deepEqual( result, expected );
			} );

		} );
	} );

	describe( 'export formats: ', () => {
		let citation;
		let exp;

		before( () => {
			const app = { conf: {} };
			exp = new exporter.Exporter( app );
		} );

		describe( 'wikibase: ', () => {
			describe( 'different search term types ', () => {
				it( 'url from search, doi from result', () => {
					citation = new Citation( 'url', 'http://www.example.com' );
					citation.format = 'wikibase';
					citation.content = {
						title: 'Example Domain',
						itemType: 'webpage',
						DOI: '10.10/abc'
					};
					return exp.convertToWikibase( citation ).then( ( citation ) => {
						assert.deepEqual( citation.url, citation.formattedContent.identifiers.url );
						assert.deepEqual( citation.content.DOI, citation.formattedContent.identifiers.doi );
					} );
				} );

				it( 'doi from search, no url', () => {
					citation = new Citation( 'doi', '10.10/abc' );
					citation.format = 'wikibase';
					citation.content = {
						title: 'Example Domain',
						itemType: 'webpage',
						DOI: '10.10/def'
					};
					return exp.convertToWikibase( citation ).then( ( citation ) => {
						assert.deepEqual( undefined, citation.formattedContent.identifiers.url );
						assert.deepEqual( citation.doi, citation.formattedContent.identifiers.doi );
					} );
				} );

				it( 'qid, no url', () => {
					citation = new Citation( 'qid', 'Q1' );
					citation.format = 'wikibase';
					citation.content = {
						title: 'Example Domain',
						itemType: 'webpage'
					};
					return exp.convertToWikibase( citation ).then( ( citation ) => {
						assert.deepEqual( undefined, citation.formattedContent.identifiers.url );
						assert.deepEqual( citation.qid, citation.formattedContent.identifiers.qid );
					} );
				} );

				it( 'pmid, no url', () => {
					citation = new Citation( 'pmid', '1234567' );
					citation.format = 'wikibase';
					citation.content = {
						title: 'Example Domain',
						itemType: 'webpage'
					};
					return exp.convertToWikibase( citation ).then( ( citation ) => {
						assert.deepEqual( undefined, citation.formattedContent.identifiers.url );
						assert.deepEqual( citation.pmid, citation.formattedContent.identifiers.pmid );
					} );
				} );

				it( 'pmcid, no url', () => {
					citation = new Citation( 'pmcid', 'PMC1234567' );
					citation.format = 'wikibase';
					citation.content = {
						title: 'Example Domain',
						itemType: 'webpage'
					};
					return exp.convertToWikibase( citation ).then( ( citation ) => {
						assert.deepEqual( undefined, citation.formattedContent.identifiers.url );
						assert.deepEqual( citation.pmcid, citation.formattedContent.identifiers.pmcid );
					} );
				} );
			} );

			describe( 'different item types', () => {
				it( 'itemType webpage', () => {
					citation = new Citation( 'url', 'http://www.example.com' );
					citation.format = 'wikibase';
					citation.content = {
						title: 'Example Domain',
						itemType: 'webpage',
						url: 'http://www.example.com'
					};
					return exp.convertToWikibase( citation ).then( ( citation ) => {
						assert.deepEqual( citation.content.title, citation.formattedContent.title );
						assert.deepEqual( citation.formattedContent.identifiers.url, 'http://www.example.com' );
					} );
				} );

				it( 'itemType book', () => {
					citation = new Citation( 'url', 'http://www.example.com' );
					citation.format = 'wikibase';
					citation.content = {
						title: 'Title of a Book',
						itemType: 'book',
						ISBN: '978-0-8109-3531-0 081093531b 007462542X',
						extra: 'OCLC: 1234556',
						url: 'http://www.example.com'
					};
					return exp.convertToWikibase( citation ).then( ( citation ) => {
						assert.deepEqual( citation.formattedContent.identifiers.isbn10, [ '0-07-462542-X' ] );
						assert.deepEqual( citation.formattedContent.identifiers.isbn13, [ '978-0-8109-3531-0' ] );
						assert.deepEqual( citation.formattedContent.identifiers.url, 'http://www.example.com' );
						assert.deepEqual( citation.formattedContent.identifiers.oclc, '1234556' );
						assert.deepEqual( !!citation.formattedContent.ISBN, false );
					} );
				} );

				it( 'itemType journalArticle', () => {
					citation = new Citation( 'url', 'http://www.example.com' );
					citation.format = 'wikibase';
					citation.content = {
						title: 'Title of a Journal Article',
						itemType: 'journalArticle',
						DOI: '10.10/abc',
						extra: 'PMCID: PMC1234567\nPMID: 89101112',
						url: 'http://www.example.com'
					};
					return exp.convertToWikibase( citation ).then( ( citation ) => {
						assert.deepEqual( citation.formattedContent.identifiers.doi, '10.10/abc' );
						assert.deepEqual( citation.formattedContent.identifiers.pmcid, '1234567' );
						assert.deepEqual( citation.formattedContent.identifiers.pmid, '89101112' );
						assert.deepEqual( !!citation.formattedContent.DOI, false );
					} );
				} );
			} );
		} );
	} );

} );
