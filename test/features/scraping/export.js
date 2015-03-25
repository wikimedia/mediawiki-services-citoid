'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('export', function() {

	this.timeout(20000);

	before(function () { return server.start(); });

	it('bibtex', function() {
		return server.query('http://example.com', 'bibtex').then(function(res) {
			assert.status(res, 200);
			assert.checkBibtex(res, '\n@misc{_example_???');
		});
	});

});

