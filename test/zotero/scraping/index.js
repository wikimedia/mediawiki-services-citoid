'use strict';

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'uses zotero', function () {

	this.timeout( 20000 );
	const server = new Server();

	before( () => server.start( { pubmed: true, zotero: true } ) );

	after( () => server.stop() );

	describe( 'URL', () => {
		it( 'example domain', () => server.query( 'example.com' ).then( ( res ) => {
			assert.status( res, 200 );
			assert.checkZotCitation( res, 'Example Domain' );
		} ) );

		it( 'dublinCore data but no highWire metadata', () => server.query( 'https://tools.ietf.org/html/draft-kamath-pppext-peapv0-00' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Microsoft\'s PEAP version 0 (Implementation in Windows XP SP1)' );
			assert.deepEqual( res.body[ 0 ].itemType, 'report' );
			assert.deepEqual( res.body[ 0 ].publicationTitle, undefined ); // TODO: Investigate why this is undefined
		} ) );

		it( 'bad DOI from zotero', () => server.query( 'http://eprints.gla.ac.uk/113711/' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Zika virus: a previously slow pandemic spreads rapidly through the Americas' );
			assert.deepEqual( res.body[ 0 ].DOI, '10.1099/jgv.0.000381' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
		} ) );

		it( 'DOI in restricted url', () => server.query( 'http://localhost/10.1086/378695' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Salaries, Turnover, and Performance in the Federal Criminal Justice System' );
			assert.deepEqual( res.body[ 0 ].DOI, '10.1086/378695' );
			assert.deepEqual( res.body[ 0 ].author.length, 1 );
		} ) );

		// Ensure html tags are stripped out of title
		it( 'zotero previously gave us html tags in title', () => server.query( 'http://fr.wikipedia.org/w/index.php?title=Ninja_Turtles_(film)&oldid=115125238' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Ninja Turtles (film)' );
			assert.deepEqual( res.body[ 0 ].itemType, 'encyclopediaArticle', 'Wrong itemType; expected encyclopediaArticle, got' + res.body[ 0 ].itemType );
		} ) );

		// No longer comes from Zotero, doi results instead
		it.skip( 'fixes en dash in zotero results', () => server.query( 'https://bpspsychub.onlinelibrary.wiley.com/doi/abs/10.1111/j.2044-835X.1998.tb00748.x' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Emotional instability as an indicator of strictly timed infantile developmental transitions' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].pages, '15–44' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'removes null issn', () => server.query( 'http://chroniclingamerica.loc.gov/lccn/sn85040224/' ).then( ( res ) => {
			assert.checkZotCitation( res, 'The Daily Palo Alto times. [volume]' );
			assert.deepEqual( res.body[ 0 ].ISSN, undefined, 'ISSN found' );
			assert.deepEqual( res.body[ 0 ].itemType, 'newspaperArticle', 'Wrong itemType; expected newspaperArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'Has PMCID, PMID, DOI', () => server.query( 'https://royalsocietypublishing.org/doi/abs/10.1098/rspb.2000.1188' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Moth hearing in response to bat echolocation calls manipulated independently in time and frequency' );
			assert.deepEqual( res.body[ 0 ].PMCID, 'PMC1690724' );
			assert.deepEqual( !!res.body[ 0 ].PMID, true, 'Missing PMID' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		// Regression: Google now gives 403s for this
		it.skip( 'Google books search link', () => server.query( 'https://www.google.co.uk/search?tbm=bks&hl=en&q=isbn%3A9781851244881' ).then( ( res ) => {
			assert.checkZotCitation( res, 'isbn:9781851244881 - Google Search' );
		} ) );

		it( 'dublinCore data with multiple identifiers in array - previously had empty result from zotero', () => server.query( 'http://apps.who.int/iris/handle/10665/70863' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
			assert.deepEqual( res.body[ 0 ].publisher, undefined ); // TODO: Investigate why this is undefined
			assert.deepEqual( res.body[ 0 ].publicationTitle, undefined ); // TODO: Investigate why this is undefined
		} ) );

		it( 'PDF url unsupported', () => {
			const url = 'https://upload.wikimedia.org/wikipedia/commons/9/98/Coloring_page_for_Wikipedia_Day_2019_in_NYC.pdf';
			return server.query( url, 'mediawiki', 'en' )
				.then( ( res ) => {
					assert.status( res, 415 );
				}, ( err ) => {
					assert.status( err, 415 );
					assert.deepEqual( err.body.Error, 'The remote document is not in a supported format' );
				} );
		} );

	} );

	describe( 'DOI  - uses /search endpoint', () => {
		// Times out
		it( 'DOI has poor resolving time', () => server.query( '10.1098/rspb.2000.1188' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Moth hearing in response to bat echolocation calls manipulated independently in time and frequency' );
			assert.deepEqual( res.body[ 0 ].PMCID, 'PMC1690724', 'Missing PMCID' );
			assert.deepEqual( !!res.body[ 0 ].PMID, true, 'Missing PMID' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		// DOI which points directly to a resource which can be scraped by Zotero
		it( 'direct DOI', () => server.query( '10.1017/s0305004100013554' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Discussion of Probability Relations between Separated Systems' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].pages, '555–563', 'Wrong pages item; expected 555–563, got ' + res.body[ 0 ].pages );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		// DOI with angle brackets
		it( 'DOI with angle brackets', () => server.query( '10.1002/1096-8628(20000612)96:3<302::aid-ajmg13>3.0.co;2-i' ).then( ( res ) => {
			assert.checkZotCitation( res, 'The TaqI A1 allele of the dopamine D2 receptor gene and alcoholism in Brazil: Association and interaction with stress and harm avoidance on severity prediction' );
			assert.deepEqual( res.body[ 0 ].DOI, '10.1002/1096-8628(20000612)96:3<302::AID-AJMG13>3.0.CO;2-I', 'Incorrect DOI' );
		} ) );

		// DOI extracted from within a string
		it( 'DOI with space', () => server.query( 'DOI: 10.1017/s0305004100013554' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Discussion of Probability Relations between Separated Systems' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].pages, '555–563', 'Wrong pages item; expected 555–563, got ' + res.body[ 0 ].pages );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		// DOI which points to a link which contains further redirects to the Zotero-scrapable resource
		it( 'DOI with redirect', () => server.query( '10.1371/journal.pcbi.1002947' ).then( ( res ) => {
			assert.checkZotCitation( res );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].pages, 'e1002947', 'Wrong pages item; expected e1002947, got ' + res.body[ 0 ].pages );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'DOI with User-Agent set', () => server.query( '10.1088/0004-637X/802/1/65' ).then( ( res ) => {
			assert.checkZotCitation( res, 'THE 2012 FLARE OF PG 1553+113 SEEN WITH H.E.S.S. AND FERMI -LAT' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].pages, '65', 'Wrong pages item; expected 65, got ' + res.body[ 0 ].pages );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'Needs to follow several redirects before Zotero request', () => server.query( '10.1016/S0305-0491(98)00022-4' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Energetics and biomechanics of locomotion by red kangaroos (Macropus rufus)' );
			assert.deepEqual( res.body[ 0 ].date, '1998-05' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle' );
		} ) );

		// Ensure DOI is present in zotero scraped page when requested from link containing DOI
		it( 'non-dx.DOI link with DOI pointing to resource in zotero with no DOI', () => server.query( 'http://link.springer.com/chapter/10.1007/11926078_68' ).then( ( res ) => {
			assert.checkZotCitation( res );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
		} ) );

		// Ensure DOI is present in zotero scraped page when requested from DOI
		it( 'DOI pointing to resource in zotero with no DOI', () => server.query( '10.1007/11926078_68' ).then( ( res ) => {
			assert.checkZotCitation( res );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
		} ) );

		// Ensure DOI is present in non-zotero scraped page when request from DOI link
		it( 'DOI.org link pointing to resource in zotero with no DOI', () => server.query( 'http://DOI.org/10.1007/11926078_68' ).then( ( res ) => {
			assert.checkZotCitation( res );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
		} ) );

		// Ensure DOI is present in non-zotero scraped page when request from DOI link
		it( 'DOI which requires cookie to properly follow redirect to Zotero; no results from crossRef', () => server.query( '10.1642/0004-8038(2005)122[0673:PROAGP]2.0.CO;2' ).then( ( res ) => {
			assert.checkZotCitation( res, 'PHYLOGENETIC RELATIONSHIPS OF ANTPITTA GENERA (PASSERIFORMES: FORMICARIIDAE)' );
			assert.deepEqual( res.body[ 0 ].publicationTitle, 'The Auk', 'Incorrect publicationTitle; Expected The Auk, got' + res.body[ 0 ].publicationTitle );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( !!res.body[ 0 ].issue, true, 'Missing issue' );
			assert.deepEqual( !!res.body[ 0 ].volume, true, 'Missing volume' );
		} ) );

		it( 'DOI pointing to conferencePaper', () => server.query( '10.1007/11926078_68' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Semantic MediaWiki' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].itemType, 'bookSection', 'Wrong itemType; expected bookSection, got' + res.body[ 0 ].itemType );
		} ) );

		// Regression: phab:T388517. Fake url but with info in cross ref that can be pulled from doi in url - uses requestFromDOI & zotero
		it.skip( 'DOI in url with query parameters- uses Zotero', () => server.query( 'example.com/10.1542/peds.2007-2362?uid=3739832&uid=2&uid=4&uid=3739256&sid=21105503736473' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Management of Children With Autism Spectrum Disorders' );
			assert.deepEqual( res.body[ 0 ].DOI, '10.1542/peds.2007-2362' );
		} ) );

		it( 'DOI with US style date', () => server.query( '10.1542/peds.2007-2362' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Management of Children With Autism Spectrum Disorders' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].date, '2007-11-01', 'Incorrect date; expected 2007-11-01, got ' + res.body[ 0 ].date );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );

		} ) );

		// Restricted url but with info in that can be pulled from doi in url
		it( 'DOI in restricted url', () => server.query( 'http://localhost/10.1086/378695' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Salaries, Turnover, and Performance in the Federal Criminal Justice System' );
			assert.deepEqual( res.body[ 0 ].url, 'https://www.journals.uchicago.edu/doi/10.1086/378695' );
			assert.deepEqual( res.body[ 0 ].DOI, '10.1086/378695' );
			assert.deepEqual( res.body[ 0 ].author.length, 1 );
		} ) );

		// phab:T214766
		it( 'Natively resolved url does not work', () => server.query( '10.1080/00288306.1980.10424125' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Tholeiitic basalt from the Monowai seamount, Tonga-Kermadec ridge (Note)' );
			assert.deepEqual( res.body[ 0 ].url, 'http://www.tandfonline.com/doi/abs/10.1080/00288306.1980.10424125' );
			assert.deepEqual( res.body[ 0 ].DOI, '10.1080/00288306.1980.10424125' );
			assert.deepEqual( res.body[ 0 ].author.length, 4 );
		} ) );
	} );

	describe( 'PMCID ', () => {
		it( 'with prefix', () => server.query( 'PMC3605911' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Viral Phylodynamics' );
			assert.deepEqual( res.body[ 0 ].url, 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3605911/' );
			assert.deepEqual( res.body[ 0 ].PMCID, '3605911' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		// REGRESSION: 405 method not allowed. phab:T388519
		it.skip( 'from pmc url', () => server.query( 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3605911/' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Viral Phylodynamics' );
			assert.deepEqual( res.body[ 0 ].url, 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3605911/' );
			assert.deepEqual( res.body[ 0 ].PMCID, '3605911' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'with trailing space', () => server.query( 'PMC3605911 ' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Viral Phylodynamics' );
			assert.deepEqual( res.body[ 0 ].PMCID, '3605911' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'with encoded space', () => server.query( 'PMC3605911%20' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Viral Phylodynamics' );
			assert.deepEqual( res.body[ 0 ].PMCID, '3605911' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'which requires PMC prefix to retrieve DOI from id converter', () => server.query( 'PMC1690724' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Moth hearing in response to bat echolocation calls manipulated independently in time and frequency.' );
			assert.deepEqual( !!res.body[ 0 ].PMID, true, 'Missing PMID' );
			assert.deepEqual( res.body[ 0 ].PMCID, '1690724' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

	} );

	describe( 'PMID ', () => {

		// PMID on NIH website that is not found in the id converter api
		it( 'not in id converter', () => server.query( '14656957' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Seventh report of the Joint National Committee on Prevention, Detection, Evaluation, and Treatment of High Blood Pressure' );
			assert.deepEqual( res.body.length, 1, 'Unexpected number of citations in body' );
			assert.deepEqual( !!res.body[ 0 ].PMID, true, 'Missing PMID' ); // From Zotero
			assert.deepEqual( res.body[ 0 ].url, 'https://pubmed.ncbi.nlm.nih.gov/14656957' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' ); // From Zotero
			assert.deepEqual( !!res.body[ 0 ].PMCID, false, 'Missing PMCID' ); // Missing PMC as unable to retrieve from ID converter api
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		// PMID on NIH website that is not found in the id converter api
		it( 'returns citation interpreted as both pmid and pmcid', () => server.query( '14656' ).then( ( res ) => {
			assert.checkZotCitation( res ); // Which citation is first is unpredictable
			assert.deepEqual( res.body.length, 2, 'Unexpected number of citations in body' );
			assert.deepEqual( !!res.body[ 0 ].PMID, true, 'Missing first PMID' ); // From Zotero
			assert.deepEqual( !!res.body[ 1 ].PMID, true, 'Missing second PMID' ); // From Zotero
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'with space ', () => server.query( 'PMID 14656957' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Seventh report of the Joint National Committee on Prevention, Detection, Evaluation, and Treatment of High Blood Pressure' );
			assert.deepEqual( !!res.body[ 0 ].PMID, true, 'Missing PMID' ); // From Zotero
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' ); // From Zotero
			assert.deepEqual( !!res.body[ 0 ].PMCID, false, 'Missing PMCID' ); // Missing PMC as unable to retrieve from ID converter api
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'from url', () => server.query( 'http://pubmed.ncbi.nlm.nih.gov/20729678/56567' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Zotero: harnessing the power of a personal bibliographic manager' );
			assert.deepEqual( !!res.body[ 0 ].PMID, true, 'Missing PMID' ); // From Zotero
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' ); // From Zotero
			assert.deepEqual( !!res.body[ 0 ].PMCID, false, 'Missing PMCID' ); // Missing PMC as unable to retrieve from ID converter api
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'with less than eight digits', () => server.query( '123' ).then( ( res ) => {
			assert.deepEqual( res.body.length, 1, 'Unexpected number of citations in body' );
			assert.checkZotCitation( res, 'The importance of an innervated and intact antrum and pylorus in preventing postoperative duodenogastric reflux and gastritis' );
			assert.deepEqual( !!res.body[ 0 ].PMCID, false, 'Missing PMCID' );
			assert.deepEqual( !!res.body[ 0 ].PMID, true, 'Missing PMID' );
			// assert.deepEqual(!!res.body[0].DOI, false, 'Missing DOI');
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'has PMCID, DOI, PMID', () => server.query( '11467425' ).then( ( res ) => {
			assert.deepEqual( res.body.length, 2, 'Unexpected number of citations in body' );
			assert.checkZotCitation( res, 'Moth hearing in response to bat echolocation calls manipulated independently in time and frequency' );
			assert.deepEqual( !!res.body[ 0 ].PMCID, true, 'Missing PMCID' );
			assert.deepEqual( !!res.body[ 0 ].PMID, true, 'Missing PMID' );
			assert.deepEqual( !!res.body[ 0 ].DOI, true, 'Missing DOI' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );
	} );

	describe( 'QID ', () => {
		it( 'is a journal article', () => server.query( 'Q33415777' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Growth of Weil-Petersson Volumes and Random Hyperbolic Surface of Large Genus' );
			assert.deepEqual( res.body[ 0 ].DOI, '10.4310/JDG/1367438650' );
			assert.deepEqual( res.body[ 0 ].qid, 'Q33415777' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'has trailing space', () => server.query( 'Q33415777 ' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Growth of Weil-Petersson Volumes and Random Hyperbolic Surface of Large Genus' );
			assert.deepEqual( res.body[ 0 ].DOI, '10.4310/JDG/1367438650' );
			assert.deepEqual( res.body[ 0 ].qid, 'Q33415777' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'should be case insensitive', () => server.query( 'q33415777' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Growth of Weil-Petersson Volumes and Random Hyperbolic Surface of Large Genus' );
			assert.deepEqual( res.body[ 0 ].DOI, '10.4310/JDG/1367438650' );
			assert.deepEqual( res.body[ 0 ].qid, 'Q33415777' );
			assert.deepEqual( res.body[ 0 ].itemType, 'journalArticle', 'Wrong itemType; expected journalArticle, got' + res.body[ 0 ].itemType );
		} ) );

		it( 'is a person', () => server.query( 'Q1771279' ).then( ( res ) => {
			assert.checkZotCitation( res, 'Maryam Mirzakhani' );
			assert.deepEqual( res.body[ 0 ].qid, 'Q1771279' );
			assert.deepEqual( res.body[ 0 ].itemType, 'webpage', 'Wrong itemType; expected webpage, got' + res.body[ 0 ].itemType );
		} ) );
	} );

} );
