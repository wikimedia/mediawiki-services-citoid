
/**
 * Tests ISBN which uses worldcat service
 */

'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');

if (!server.stopHookAdded) {
    server.stopHookAdded = true;
    after(() => server.stop());
}

describe('ISBN tests: ', function() {

    this.timeout(40000);

    // Use zotero search endpoint for isbn
    describe('zotero isbn only: ', function() {

        before(function () { return server.start({
            wskey:false,
            zotero:true
        }); });

        it('valid ISBN', function() {
            return server.query('978-0-596-51979-7').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'MediaWiki');
                assert.deepEqual(!!res.body[0].oclc, true, 'Missing OCLC');
                assert.deepEqual(res.body[0].author, [['Daniel J.', 'Barrett']], 'Unexpected value; expected [[\'Daniel J.\'], [\'Barrett.\']] ' + res.body[0].author);
                assert.deepEqual(res.body[0].publisher, 'O\'Reilly Media', 'Unexpected value; expected O\'Reilly Media, got ' + res.body[0].publisher);
                assert.deepEqual(res.body[0].place, 'Sebastapool, Calif', 'Unexpected value; expected Sebastapool, Calif., got ' + res.body[0].place);
                assert.deepEqual(res.body[0].edition, '1st ed', 'Unexpected value; expected 1st ed., got ' + res.body[0].edition);
                assert.deepEqual(res.body[0].date, '2009', 'Unexpected value; expected 2009, got ' + res.body[0].date);
                assert.isInArray(res.body[0].ISBN, '978-0-596-51979-7');
                assert.deepEqual(res.body[0].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[0].itemType);
            });
        });

        it('valid ISBN with funky author field', function() {
            return server.query('978043-9784542').then(function(res) {
                assert.status(res, 200);
        //        assert.checkZotCitation(res, 'Harry Potter and the half-blood prince'); // No url
                assert.deepEqual(res.body[0].title, 'Harry Potter and the Half-Blood Prince', 'Unexpected value; expected "Harry Potter and the Half-blood Prince," got ' + res.body[0].title);
        //        assert.deepEqual(!!res.body[0].oclc, true, 'Missing OCLC');
                assert.deepEqual(res.body[0].author, [['J. K.', 'Rowling'], ['Mary','GrandPré']]);
                assert.deepEqual(res.body[0].place, 'New York, NY', 'Unexpected value; expected New York, NY, got ' + res.body[0].place);
                assert.deepEqual(res.body[0].edition, '1st American ed', 'Unexpected value; expected 1st ed., got ' + res.body[0].edition);
                assert.isInArray(res.body[0].ISBN, '978-0-439-78454-2');
                assert.deepEqual(res.body[0].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[0].itemType);
            });
        });

        it('valid DVD ISBN - type Image', function() {
            return server.query('978-0756662967').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Eyewitness DVD.'); // Not great
                assert.deepEqual(!!res.body[0].oclc, true, 'Missing OCLC');
        //        assert.deepEqual(!!res.body[0].author, true, 'Missing author');
                assert.deepEqual(res.body[0].publisher, 'DK Pub.', 'Unexpected value; expected DK Pub., got ' + res.body[0].publisher);
        //        assert.deepEqual(res.body[0].place, 'New York', 'Unexpected value; expected New York, got ' + res.body[0].place);
                assert.deepEqual(res.body[0].date, '2010', 'Unexpected value; expected 2010, got ' + res.body[0].date);
                assert.isInArray(res.body[0].ISBN, '978-0-7566-6296-7');
                assert.deepEqual(res.body[0].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[0].itemType);
            });
        });

        it('ISBN with 979 prefix; not as good data as worldcat', function() {
            return server.query('9791029801297').then(function(res) {
                assert.status(res, 200);
                assert.checkZotCitation(res, 'Mon jardin tropical: [guide de jardinage');
                assert.deepEqual(!!res.body[0].oclc, true, 'Missing OCLC');
                assert.deepEqual(res.body[0].date, '2016', 'Unexpected value; expected 2002, got ' + res.body[0].date);
                assert.isInArray(res.body[0].ISBN, '979-10-298-0129-7');
                assert.deepEqual(res.body[0].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[0].itemType);
            });
        });

        it('invalid ISBN', function() {
            var isbn = '9780596519798';
            return server.query(isbn, 'mediawiki', 'en')
            .then(function(res) {
                assert.status(res, 404);
            }, function(err) {
                assert.checkError(err, 404, 'Unable to retrieve data from ISBN ' + isbn,
                    'Unexpected error message ' + err.body.Error);
            });
        });
    });

    // Uses worldcat search api. This requires a working wskey in your config.yaml file. Free temporary keys available here:
    // https://platform.worldcat.org/wskey/keys/manage
    describe.skip('worldcat search api only: ', function() {

        before(function () { return server.start({
            zotero: false
        }); });

        it('book ISBN with dashes, type Text', function() {
            return server.query('978-0-596-51979-7').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'MediaWiki');
                assert.deepEqual(!!res.body[0].oclc, true, 'Missing OCLC');
                assert.isInArray(res.body[0].source, 'WorldCat');
                assert.deepEqual(res.body[0].author, [['', 'Barrett, Daniel J.']], 'Unexpected value:' + res.body[0].author);
                assert.deepEqual(res.body[0].publisher, 'O\'Reilly', 'Unexpected value; expected O\'Reilly, got ' + res.body[0].publisher);
                //assert.deepEqual(res.body[0].place, 'Sebastapool, Calif.', 'Unexpected value; expected Sebastapool, Calif., got ' + res.body[0].place); // Not currently working with Worldcat Search API - not present in results
                //assert.deepEqual(res.body[0].edition, '1st ed.', 'Unexpected value; expected 1st ed., got ' + res.body[0].edition); // Not currently working with Worldcat Search API - present in description tag
                assert.deepEqual(res.body[0].date, '2009', 'Unexpected value; expected 2009, got ' + res.body[0].date);
                assert.isInArray(res.body[0].ISBN, '978-0-596-51979-7');
                assert.deepEqual(res.body[0].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[0].itemType);
            });
        });

        it('ISBN with 979 prefix', function() {
            return server.query('9791029801297').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res, 'Mon jardin tropical : [guide de jardinage : Antilles [et] Réunion]');
                assert.deepEqual(!!res.body[0].oclc, true, 'Missing OCLC');
                assert.isInArray(res.body[0].source, 'WorldCat');
                assert.deepEqual(res.body[0].date, '2002', 'Unexpected value; expected 2002, got ' + res.body[0].date);
                assert.isInArray(res.body[0].ISBN, '979-10-298-0129-7');
                assert.deepEqual(res.body[0].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[0].itemType);
            });
        });

        it('DVD ISBN - type Image', function() {
            return server.query('978-0756662967').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res); // Returns either 'Seashore' or 'Eyewitness DVD. Seashore.' as title
                assert.deepEqual(!!res.body[0].oclc, true, 'Missing OCLC');
                assert.isInArray(res.body[0].source, 'WorldCat');
                //assert.deepEqual(res.body[0].contributor, [['Sheen,','Martin.'],['Cohen,','Bonni.'],['Thomson,','Richard.'],['DK Publishing,','Inc.']], 'Unexpected value:' + res.body[0].author); // only get this sometimes
                assert.deepEqual(res.body[0].studio, 'DK Pub', 'Unexpected value; expected DK Pub, got ' + res.body[0].studio);
                //assert.deepEqual(res.body[0].place, 'New York', 'Unexpected value; expected New York, got ' + res.body[0].place);
                //assert.deepEqual(res.body[0].date, '2010-01-01', 'Unexpected value; expected 2010-01-01, got ' + res.body[0].date); // Not currently working with worldcat; date is returned to us as '2010, ©1996'
                assert.isInArray(res.body[0].ISBN, '978-0-7566-6296-7');
                assert.deepEqual(res.body[0].itemType, 'videoRecording', 'Wrong itemType; expected videoRecording, got ' + res.body[0].itemType);
            });
        });

        it('DVD ISBN - invalid Type', function() {
            return server.query('9780783244396').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res); // Title varies: 'Jaws' or 'Jaws'
                assert.deepEqual(!!res.body[0].oclc, true, 'Missing OCLC');
                assert.isInArray(res.body[0].source, 'WorldCat');
                assert.deepEqual(!!res.body[0].contributor, true, 'Missing contributor');
                //assert.deepEqual(res.body[0].studio, 'Universal', 'Unexpected value; expected Universal, got ' + res.body[0].studio);
                //assert.deepEqual(res.body[0].date, '2000', 'Unexpected value; expected 2000, got ' + res.body[0].date);
                assert.isInArray(res.body[0].ISBN, '978-0-7832-4439-6');
                assert.deepEqual(res.body[0].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[0].itemType);
            });
        });

        it('valid ISBN with funky author field', function() {
            return server.query('9780439784542').then(function(res) {
                assert.status(res, 200);
                assert.checkCitation(res); // Title varies, , 'Harry Potter and the Half-Blood Prince #6.' or 'Harry Potter and the half-blood prince : Year 6'
                assert.deepEqual(!!res.body[0].oclc, true, 'Missing OCLC');
                assert.isInArray(res.body[0].source, 'WorldCat');
                //assert.deepEqual(!!res.body[0].author, true, 'Missing author'); // Varies between true and false
                //assert.deepEqual(res.body[0].place, 'New York, NY', 'Unexpected value; expected New York, NY, got ' + res.body[0].place);
                //assert.deepEqual(res.body[0].edition, '1st American ed.', 'Unexpected value; expected 1st ed., got ' + res.body[0].edition);
                assert.isInArray(res.body[0].ISBN, '978-0-439-78454-2');
                assert.deepEqual(res.body[0].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[0].itemType);
            });
        });

        it('invalid ISBN', function() {
            var isbn = '9780596519798';
            return server.query(isbn, 'mediawiki', 'en')
            .then(function(res) {
                assert.status(res, 404);
            }, function(err) {
                assert.checkError(err, 404, 'Unable to retrieve data from ISBN ' + isbn,
                    'Unexpected error message ' + err.body.Error);
            });
        });
    });

});
