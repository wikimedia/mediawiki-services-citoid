var assert = require('../../utils/assert.js');
var exporter = require('../../../lib/Exporter.js');


describe('lib/Exporter.js functions: ', function() {

    var result;
    var expected;
    var input;

    describe('fixURL function: ', function() {
        var url;
        it('discards url with no host', function() {
            url = 'http://www.example.com/path/with/host';
            expected = {url: url};
            result = exporter.fixURL(url, {url:'/path/without/host'});
            assert.deepEqual(result, expected);
        });

        it('adds protocol to url when missing', function() {
            expected = {url: 'http://www.example.com/without/protocol'};
            result = exporter.fixURL('http://www.example.com/with/protocol', {url:'www.example.com/without/protocol'});
            assert.deepEqual(result, expected);
        });
    });

    describe('addIDSToCitation function: ', function() {
        var title;
        it('cleans script and html out of title', function() {
            title = 'f<script>alert(1);</script><i>taggytaggy</i></i>';
            expected = {title: 'falert(1);taggytaggy'};
            result = exporter.stripCitation({title:title});
            assert.deepEqual(result, expected);
        });
    });

    describe('stripCitation function :', function() {
        var title;
        it('cleans script and html out of title', function() {
            title = 'f<script>alert(1);</script><i>taggytaggy</i></i>';
            expected = {title: 'falert(1);taggytaggy'};
            result = exporter.stripCitation({title:title});
            assert.deepEqual(result, expected);
        });
    });

    describe('fixDate function: ', function() {
        var date;
        it('sets year only date to January 1st of that year', function() {
            date = '2010';
            expected = {date: '2010-01-01'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('converts American style date to ISO', function() {
            date = '07/08/1999';
            expected = {date: '1999-07-08'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Uses year from ambiguous date', function() {
            date = 'Fall 1975';
            expected = {date: '1975-01-01'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Normal date', function() {
            date = 'May 8 2010';
            expected = {date: '2010-05-08'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Normal date with ordinal indicator', function() {
            date = 'May 8th, 2010';
            expected = {date: '2010-05-08'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Badly sets normal date with ordinal number', function() {
            date = 'May eighth, 2010';
            expected = {date: '2010-05-01'}; // Wrong sets to May 1st instead of May 8th
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Date on the fence: ISO with - notation', function() {
            date = '2013-04-02T20:00:03-07:00';
            expected = {date: '2013-04-02'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Date on the fence; ISO with + notation', function() {
            date = '2016-03-08T01:16:07+02:00';
            expected = {date: '2016-03-08'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Date on the fence; toString output', function() {
            date = 'Sat May 08 2010 00:16:07 GMT+0100 (BST)';
            expected = {date: '2010-05-08'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Date on the fence; ISO with Z notation', function() {
            date = '2010-05-08T00:16:00.060Z';
            expected = {date: '2010-05-08'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

    });

    describe('fixISBN function: ', function() {
        var isbnStr;
        it('Correctly extracts single ISBN', function() {
            isbnStr = '0810935317';
            expected = {ISBN: ['0810935317']};
            result = exporter.fixISBN({ISBN:isbnStr});
            assert.deepEqual(result, expected);
        });

        it('Correctly extracts ISBN-10', function() {
            isbnStr = '0810935317 081093531X';
            expected = {ISBN: ['0810935317', '081093531X']};
            result = exporter.fixISBN({ISBN:isbnStr});
            assert.deepEqual(result, expected);
        });

        it('Correctly extracts ISBN-13', function() {
            isbnStr = '9780810935310 9780810935310';
            expected = {ISBN: ['9780810935310', '9780810935310']};
            result = exporter.fixISBN({ISBN:isbnStr});
            assert.deepEqual(result, expected);
        });

        it('Correctly extracts ISBN-10 and ISBN-13', function() {
            isbnStr = '9780810935310 0810935317 081093531X 9780810935310';
            expected = {ISBN: ['9780810935310', '0810935317', '081093531X', '9780810935310']};
            result = exporter.fixISBN({ISBN:isbnStr});
            assert.deepEqual(result, expected);
        });

        it('Correctly handles and normalizes hyphenated ISBN', function() {
            isbnStr = '978-0-8109-3531-0 0-8109-3531-7';
            expected = {ISBN: ['9780810935310', '0810935317']};
            result = exporter.fixISBN({ISBN:isbnStr});
            assert.deepEqual(result, expected);
        });

        it('Correctly handles ISBNs with and without hyphens', function() {
            isbnStr = '978-0-8109-3531-0 0810935317';
            expected = {ISBN: ['9780810935310', '0810935317']};
            result = exporter.fixISBN({ISBN:isbnStr});
            assert.deepEqual(result, expected);
        });

        it('Correctly handles ISBN-13s that have spaces in them', function() {
            isbnStr = '978 0810935310 0810935317 978 0810935310';
            expected = {ISBN: ['9780810935310', '0810935317', '9780810935310']};
            result = exporter.fixISBN({ISBN:isbnStr});
            assert.deepEqual(result, expected);
        });

        it('Correctly handles out comma separated ISBNs', function() {
            isbnStr = '978 0810935310, 081093531X, 978-0-8109-3531-0, 9780810935310';
            expected = {ISBN: ['9780810935310', '081093531X', '9780810935310', '9780810935310']};
            result = exporter.fixISBN({ISBN:isbnStr});
            assert.deepEqual(result, expected);
        });
    });

    describe('fixPages function: ', function() {
        it('converts hyphen minus to en dash', function() {
            expected = {pages: '15–44'};
            result = exporter.fixPages({pages:'15-44'});
            assert.deepEqual(result, expected);
        });
    });

    describe('replaceCreators function', function() {
        var creators;
        it('Correctly adds name with firstName and lastName present', function() {
            creators = [
                {creatorType:'author', lastName:'Plath', firstName:'Sylvia'},
                {creatorType:'author', lastName:'Hughes', firstName:'Langston'}
            ];
            expected = {author: [
                ['Sylvia', 'Plath'],
                ['Langston', 'Hughes']
            ]};
            result = exporter.replaceCreators({creators:creators});
            assert.deepEqual(result, expected);
        });

        it('Correctly adds names with only lastName or firstName present', function() {
            creators = [
                {creatorType:'author', lastName:'', firstName:'Madonna'},
                {creatorType:'author', lastName:'Prince', firstName:''}
            ];
            expected = {author: [
                ['Madonna', ''],
                ['', 'Prince']
            ]};
            result = exporter.replaceCreators({creators:creators});
            assert.deepEqual(result, expected);
        });

        it('Adds names with name field', function() {
            creators = [
                {creatorType:'author', name:'Madonna'},
                {creatorType:'author', name:'Prince'}
            ];
            expected =  {author: [
                ['', 'Madonna'],
                ['', 'Prince']
            ]};
            result = exporter.replaceCreators({creators:creators});
            assert.deepEqual(result, expected);
        });

        it('Doesn\'t add names with incorrect field name', function() {
            creators = [
                {creatorType:'author', foo:'Madonna'},
                {creatorType:'author', foo:'Prince'}
            ];
            expected = {};
            result = exporter.replaceCreators({creators:creators});
            assert.deepEqual(result, expected);
        });
    });

});
