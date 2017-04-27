'use strict';


var sUtil = require('../lib/util');
var CitoidRequest = require('../lib/CitoidRequest.js');
var CitoidService = require('../lib/CitoidService');

/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;

// Coerces 'false'-> false, '0'-> false, 'True' ->true, '1'->true, etc
function getBool(val) {
    if (!val){return false;}
    return !!JSON.parse(String(val).toLowerCase());
}

/**
 * GET /api
 * Endpoint for retrieving citations based on search term (URL, DOI).
 */
router.get('/api', function(req, res) {

    var cr = new CitoidRequest(req, app);

    if (!req.query.search) {
        res.status(400).type('application/json');
        res.send({Error:"No 'search' value specified"});
        return;
    } else if(!req.query.format) {
        res.status(400).type('application/json');
        res.send({Error:"No 'format' value specified"});
        return;
    } else if (!app.formats[cr.format]) { // Use encoded format
        res.status(400).type('application/json');
        res.send({Error:'Invalid format requested ' + cr.format || ''});
        return;
    } else if(getBool(cr.baseFields) && !(getBool(cr.baseFields) && (cr.format === 'mediawiki' || cr.format === 'mediawiki-basefields'))){ // Ensure format supports baseFields- currently mediawiki & mediawiki-basefields formats only
        res.status(400).type('application/json');
        res.send({Error:'Base fields are not supported for format ' + cr.format || ''});
        return;
    }

    return app.citoid.request(cr).then(function(cr){
        res.status(cr.response.responseCode).type(app.formats[cr.format]);
        res.send(cr.response.body);
    }, function(cr){
        res.status(cr.response.responseCode).type(app.formats[cr.format]);
        res.send(cr.response.body);
    });

});


module.exports = function(appObj) {

    app = appObj;

    // set allowed export formats and expected response type
    app.nativeFormats = {
        'mediawiki':'application/json',
        'zotero':'application/json',
        'mediawiki-basefields': 'application/json'
    };
    app.zoteroFormats = {
        'bibtex':'application/x-bibtex'
    };
    app.formats = Object.assign({}, app.nativeFormats, app.zoteroFormats);

    // init the Citoid service object
    app.citoid = new CitoidService(app);

    return {
        path: '/',
        skip_domain: true,
        router: router
    };

};

