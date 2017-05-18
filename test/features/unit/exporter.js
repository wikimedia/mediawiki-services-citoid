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

        it('Contains copyright symbol', function() {
            date = '©2010';
            expected = {date: '2010'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Contains copyright symbol & whitespace', function() {
            date = ' ©2010';
            expected = {date: '2010'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Contains c symbol', function() {
            date = 'c2010';
            expected = {date: '2010'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('sets year only date to year only date', function() {
            date = '2010';
            expected = {date: '2010'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('converts American style date to ISO', function() {
            date = '07/08/1999';
            expected = {date: '1999-07-08'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Unable to parse to leaves as written; season', function() { // Partial ISO?
            date = 'Fall 1975';
            expected = {date: 'Fall 1975'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Unable to parse so leaves it as written', function() {
            date = '2014, ©2010';
            expected = {date: '2014, ©2010'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Multilingual date - Spanish - leaves as written', function() {
            date = 'Mayo de 2010';
            expected = {date: 'Mayo de 2010'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Multilingual date - Russian - leaves as written', function() {
            date = 'Май 2010 г.';
            expected = {date: 'Май 2010 г.'};
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

        it('Correctly sets normal date with ordinal number', function() {
            date = 'May eighth, 2010';
            expected = {date: '2010-05-08'};
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

        it('Year first date', function() {
            date = '1975 Nov-Dec';
            expected = {date: 'November 1975'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Partial ISO date no preceeding 0', function() {
            date = '1975-2';
            expected = {date: 'February 1975'};
            result = exporter.fixDate({date:date});
            assert.deepEqual(result, expected);
        });

        it('Partial ISO date proceeding 0', function() {
            date = '1975-02';
            expected = {date: 'February 1975'};
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

    describe('fixISSN function: ', function() {
        var issn;
        it('Correctly ignores invalid ISSN', function() {
            issn = 'None';
            expected = {};
            result = exporter.fixISSN({ISSN:issn});
            assert.deepEqual(result, expected);
        });

        it('Correctly adds valid ISSN', function() {
            issn = '0317-8471';
            expected = {ISSN: ['0317-8471']};
            result = exporter.fixISSN({ISSN:issn});
            assert.deepEqual(result, expected);
        });

        it('Correctly adds valid ISSN with X', function() {
            issn = '2434-561X';
            expected = {ISSN: ['2434-561X']};
            result = exporter.fixISSN({ISSN:issn});
            assert.deepEqual(result, expected);
        });

        it('Correctly adds valid ISSN with x', function() {
            issn = '2434-561x';
            expected = {ISSN: ['2434-561x']};
            result = exporter.fixISSN({ISSN:issn});
            assert.deepEqual(result, expected);
        });

        it('Correctly ignores invalid ISSN without hyphen', function() {
            issn = '12345678';
            expected = {};
            result = exporter.fixISSN({ISSN:issn});
            assert.deepEqual(result, expected);
        });

        it('Correctly ignores invalid ISSN', function() {
            issn = '123456789';
            expected = {};
            result = exporter.fixISSN({ISSN:issn});
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
