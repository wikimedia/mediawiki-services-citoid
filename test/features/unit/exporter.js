var assert = require('../../utils/assert.js');
var exporter = require('../../../lib/Exporter.js');


describe('exporter functions', function() {

    var result;
    var expected;
    var input;

    describe('fixURL function', function() {
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

    describe('addIDSToCitation', function() {
        var title;
        it('cleans script and html out of title', function() {
            title = 'f<script>alert(1);</script><i>taggytaggy</i></i>';
            expected = {title: 'falert(1);taggytaggy'};
            result = exporter.stripCitation({title:title});
            assert.deepEqual(result, expected);
        });
    });

    describe('stripCitation function', function() {
        var title;
        it('cleans script and html out of title', function() {
            title = 'f<script>alert(1);</script><i>taggytaggy</i></i>';
            expected = {title: 'falert(1);taggytaggy'};
            result = exporter.stripCitation({title:title});
            assert.deepEqual(result, expected);
        });
    });

    describe('fixDate function', function() {
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
    });


});
