
/**
 * Tests ISBN which uses worldcat service
 */

'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');

describe('ISBN tests: ', function() {

    this.timeout(40000);

    before(function () { return server.start(); });

    it('valid ISBN', function() {
        return server.query('978-0-596-51979-7').then(function(res) {
            assert.status(res, 200);
            assert.checkCitation(res, 'MediaWiki');
            assert.isInArray(res.body[0].source, 'WorldCat');
            assert.deepEqual(res.body[0].author, [['Daniel J.', 'Barrett']], 'Unexpected value; expected [[\'Daniel J.\'], [\'Barrett.\']] ' + res.body[0].author);
            assert.deepEqual(res.body[0].publisher, 'O\'Reilly Media', 'Unexpected value; expected O\'Reilly Media, got ' + res.body[0].publisher);
            assert.deepEqual(res.body[0].place, 'Sebastapool, Calif.', 'Unexpected value; expected Sebastapool, Calif., got ' + res.body[0].place);
            assert.deepEqual(res.body[0].edition, '1st ed.', 'Unexpected value; expected 1st ed., got ' + res.body[0].edition);
            assert.deepEqual(res.body[0].date, '2009-01-01', 'Unexpected value; expected 2009-01-01, got ' + res.body[0].date);
            assert.deepEqual(!!res.body[0].ISBN, true, 'Missing ISBN');
            assert.deepEqual(res.body[0].itemType, 'book', 'Wrong itemType; expected book, got ' + res.body[0].itemType);
        });
    });

    it('valid ISBN with funky author field', function() {
        return server.query('9780439784542').then(function(res) {
            assert.status(res, 200);
            assert.checkCitation(res, 'Harry Potter and the half-blood prince');
            assert.isInArray(res.body[0].source, 'WorldCat');
            assert.deepEqual(res.body[0].author, [['J.K.', 'Rowling']], 'Unexpected value; expected [[\'J.K.\', \'Rowling\']] got ' + res.body[0].author);
            assert.deepEqual(res.body[0].place, 'New York, NY', 'Unexpected value; expected New York, NY, got ' + res.body[0].place);
            assert.deepEqual(res.body[0].edition, '1st American ed.', 'Unexpected value; expected 1st ed., got ' + res.body[0].edition);
            assert.deepEqual(!!res.body[0].ISBN, true, 'Missing ISBN');
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