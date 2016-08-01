/* Unit tests for the xISBN translator */

var assert = require('../../../utils/assert.js');
var xISBN = require('../../../../lib/translators/xISBN.js');

describe('xISBN translator unit tests: ', function() {

    var result;
    var expected;
    var input;

    describe('returnItemType: ', function() {

        it('Returns book when AA is in list', function() {
            input = {
                stat:"ok",
                list:[{
                    url:["http://www.worldcat.org/oclc/234299293?referer=xid"],
                    publisher:"O'Reilly Media",
                    form:["BC", "AA"],
                    lccn:["2009280526"],
                    lang:"eng",
                    city:"Sebastapool, Calif.",
                    author:"Daniel J. Barrett.",
                    ed:"1st ed.",
                    year:"2009",
                    isbn:["978-0-596-51979-7"],
                    title:"MediaWiki",
                    oclcnum:["234299293",
                     "474668158",
                     "477104844",
                     "502255330",
                     "610760085",
                     "612055223",
                     "633982508",
                     "663432591",
                     "775598769",
                     "851076579",
                     "876576658"]}
                 ]};
            expected = 'book';
            result = xISBN.returnItemType(input);
            assert.deepEqual(result, expected);
        });

        it('Returns audioRecording when AA is 2nd in list', function() {
            input = {
                stat:"ok",
                list:[{
                    url:["http://www.worldcat.org/oclc/234299293?referer=xid"],
                    publisher:"O'Reilly Media",
                    form:["MA", "AA"],
                    lccn:["2009280526"],
                    lang:"eng"}
                 ]
             };
            expected = 'audioRecording';
            result = xISBN.returnItemType(input);
            assert.deepEqual(result, expected);
        });

        it('Returns book when form is missing', function() {
            input = {
                stat:"ok",
                list:[{
                    url:["http://www.worldcat.org/oclc/234299293?referer=xid"],
                    publisher:"O'Reilly Media"}
                 ]};
            expected = 'book';
            result = xISBN.returnItemType(input);
            assert.deepEqual(result, expected);
        });
    });

    describe('addCreatorTranslator: ', function() {

        it('Returns book when AA is in list', function() {
            input = {
                stat:"ok",
                list:[{
                    url:["http://www.worldcat.org/oclc/234299293?referer=xid"],
                    publisher:"O'Reilly Media",
                    form:["BC", "AA"],
                    lccn:["2009280526"],
                    lang:"eng",
                    city:"Sebastapool, Calif.",
                    author:"Daniel J. Barrett.",
                    ed:"1st ed.",
                    year:"2009",
                    isbn:["978-0-596-51979-7"],
                    title:"MediaWiki",
                    oclcnum:["234299293",
                     "474668158",
                     "477104844",
                     "502255330",
                     "610760085",
                     "612055223",
                     "633982508",
                     "663432591",
                     "775598769",
                     "851076579",
                     "876576658"]}
                 ]};
            expected = 'book';
            result = xISBN.returnItemType(input);
            assert.deepEqual(result, expected);
        });

        it('Correctly adds single author', function() {
            citation = {
                itemType: 'book'
            };
            metadata = {
                form:["BC", "AA"],
                author:"Daniel J. Barrett.",
                isbn:["978-0-596-51979-7"],
                title:"MediaWiki"
             };
            expected = {
                itemType: 'book',
                creators: [{
                    'creatorType':'author',
                    'firstName': 'Daniel J.',
                    'lastName': 'Barrett'
                }]
            };
            result = xISBN.book.author.translate(citation, metadata, 'author');
            assert.deepEqual(result, expected);
        });

        it('Correctly adds two authors', function() {
            citation = {
                itemType: 'book'
            };
            metadata = {
                form:["BC", "AA"],
                author:"Daniel J. Barrett and Some Other Person.",
                isbn:["978-0-596-51979-7"],
                title:"MediaWiki"
             };
            expected = {
                itemType: 'book',
                creators: [{
                    'creatorType':'author',
                    'firstName': 'Daniel J.',
                    'lastName': 'Barrett'
                },
                {
                    'creatorType':'author',
                    'firstName': 'Some Other',
                    'lastName': 'Person'
                }]
            };
            result = xISBN.book.author.translate(citation, metadata, 'author');
            assert.deepEqual(result, expected);
        });

        it('Correctly adds 2 authors including illustrator', function() {
            citation = {
                itemType: 'book'
            };
            metadata = {
                form:["AA", "BB"],
                author:"J.K. Rowling ; illustrations by Mary GrandPré.",
                isbn:["9780439784542"],
                title:"Harry Potter and the half-blood prince",
            };
            expected = {
                itemType: 'book',
                creators: [{
                    'creatorType':'author',
                    'firstName': 'J.K.',
                    'lastName': 'Rowling'
                },
                {
                    'creatorType':'contributor',
                    'firstName': 'Mary',
                    'lastName': 'GrandPré'
                }]
            };
            result = xISBN.book.author.translate(citation, metadata, 'author');
            assert.deepEqual(result, expected);
        });

        it('Correctly adds 3 creators including translator', function() {
            citation = {
                itemType: 'book'
            };
            metadata = {
                "form":["BB"],
                "author":"Haruki Murakami ; translated from the Japanese by Jay Rubin and Philip Gabriel.",
                "isbn":["9780307593313"],
                "title":"1Q84"
            };
            expected = {
                itemType: 'book',
                creators: [{
                    'creatorType':'author',
                    'firstName': 'Haruki',
                    'lastName': 'Murakami'
                },
                {
                    'creatorType':'translator',
                    'firstName': 'Jay',
                    'lastName': 'Rubin'
                },
                {
                    'creatorType':'translator',
                    'firstName': 'Philip',
                    'lastName': 'Gabriel'
                }]
            };
            result = xISBN.book.author.translate(citation, metadata, 'author');
            assert.deepEqual(result, expected);
        });

        it('Rather badly adds 3 creators with trailing titles', function() {
            citation = {
                itemType: 'book'
            };
            metadata = {
                "form":["BB"],
                "author":"Encyclopaedia Britannica, Inc. ; Jacob E. Safra, chairman of the board ; Ilan Yeshua, chief executive officer.",
                "isbn":["9780852297872"],
                "title":"Encyclopaedia Britannica"
            };
            expected = {
                itemType: 'book',
                creators: [{
                    'creatorType':'author',
                    'firstName': 'Encyclopaedia Britannica,',
                    'lastName': 'Inc.'
                },
                {
                    'creatorType':'author',
                    'firstName': 'Jacob E. Safra, chairman of the',
                    'lastName': 'board'
                },
                {
                    'creatorType':'author',
                    'firstName': 'Ilan Yeshua, chief executive',
                    'lastName': 'officer'
                }]
            };
            result = xISBN.book.author.translate(citation, metadata, 'author');
            assert.deepEqual(result, expected);
        });

        it('Rather badly adds 1 creators with many titles', function() {
            citation = {
                itemType: 'book'
            };
            metadata = {
                "form":["BB"],
                "author":"editor-in-Chief, Robert A. Scott, University of Georgia, Athens, GA, USA.",
                "isbn":["9781119951438"],
                "title":"of Inorganic and Bioinorganic Chemistry"
            };
            expected = {
                itemType: 'book',
                creators: [{
                    'creatorType':'author',
                    'firstName': 'editor-in-Chief, Robert A. Scott, University of Georgia, Athens, GA,',
                    'lastName': 'USA'
                }]
            };
            result = xISBN.book.author.translate(citation, metadata, 'author');
            assert.deepEqual(result, expected);
        });

        it('Quite badly adds editors', function() {
            citation = {
                itemType: 'book'
            };
            metadata = {
                "form":["BB"],
                "author":"editors, Robert A. Scott, Charles M. Lukehart.",
                "isbn":["9781119951438"],
                "title":"of Inorganic and Bioinorganic Chemistry"
            };
            expected = {
                itemType: 'book',
                creators: [{
                    'creatorType':'author',
                    'firstName': 'editors, Robert A. Scott, Charles M.',
                    'lastName': 'Lukehart'
                }]
            };
            result = xISBN.book.author.translate(citation, metadata, 'author');
            assert.deepEqual(result, expected);
        });

        it('Correctly adds 1 creator and discards arbitrary creator', function() {
            citation = {
                itemType: 'book'
            };
            metadata = {
                "form":["BB"],
                "author":"Haruki Murakami ; edited by Philip Gabriel.",
                "isbn":["9780307593313"],
                "title":"1Q84"
            };
            expected = {
                itemType: 'book',
                creators: [{
                    'creatorType':'author',
                    'firstName': 'Haruki',
                    'lastName': 'Murakami'
                }]
            };
            result = xISBN.book.author.translate(citation, metadata, 'author');
            assert.deepEqual(result, expected);
        });

        it('Correctly adds 1 creator and discards arbitrary creator with multiple adjectives', function() {
            citation = {
                itemType: 'book'
            };
            metadata = {
                "form":["BB"],
                "author":"Haruki Murakami ; converted into pixels by Philip Gabriel.",
                "isbn":["9780307593313"],
                "title":"1Q84"
            };
            expected = {
                itemType: 'book',
                creators: [{
                    'creatorType':'author',
                    'firstName': 'Haruki',
                    'lastName': 'Murakami'
                }]
            };
            result = xISBN.book.author.translate(citation, metadata, 'author');
            assert.deepEqual(result, expected);
        });

        it('Correctly adds name with missing firstname', function() {
            citation = {
                itemType: 'book'
            };
            metadata = {
                "form":["BB"],
                "author":"Murakami",
                "isbn":["9780307593313"],
                "title":"1Q84"
            };
            expected = {
                itemType: 'book',
                creators: [{
                    'creatorType':'author',
                    'firstName': '',
                    'lastName': 'Murakami'
                }]
            };
            result = xISBN.book.author.translate(citation, metadata, 'author');
            assert.deepEqual(result, expected);
        });

        it('Correctly adds different creator type other than author', function() {
            citation = {
                itemType: 'computerProgram'
            };
            metadata = {
                "author":"Some Coder",
                "title":"Some Program"
            };
            expected = {
                itemType: 'computerProgram',
                creators: [{
                    'creatorType':'programmer',
                    'firstName': 'Some',
                    'lastName': 'Coder'
                }]
            };
            result = xISBN.computerProgram.author.translate(citation, metadata, 'author');
            assert.deepEqual(result, expected);
        });

    });

});
