'use strict';

const sUtil = require('../lib/util');
const CitoidRequest = require('../lib/CitoidRequest.js');
const CitoidService = require('../lib/CitoidService');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

// Coerces 'false'-> false, '0'-> false, 'True' ->true, '1'->true, etc
function getBool(val) {
    if (!val) {
        return false;
    }
    return !!JSON.parse(String(val).toLowerCase());
}

/**
 * GET /api
 * Endpoint for retrieving citations based on search term (URL, DOI).
 */
router.get('/api', (req, res) => {

    const cr = new CitoidRequest(req, app);

    if (!req.query.search) {
        res.status(400).type('application/json');
        res.send({ Error: "No 'search' value specified" });
        return;
    } else if (!req.query.format) {
        res.status(400).type('application/json');
        res.send({ Error: "No 'format' value specified" });
        return;
    } else if (!app.formats[cr.format]) { // Use encoded format
        res.status(400).type('application/json');
        // eslint-disable-next-line no-constant-binary-expression
        res.send({ Error: `Invalid format requested ${ cr.format }` || '' });
        return;
    } else if (getBool(cr.baseFields) && !(getBool(cr.baseFields) &&
            // Ensure format supports baseFields - mediawiki & mediawiki-basefields formats only
            (cr.format === 'mediawiki' || cr.format === 'mediawiki-basefields'))) {
        res.status(400).type('application/json');
        // eslint-disable-next-line no-constant-binary-expression
        res.send({ Error: `Base fields are not supported for format ${ cr.format }` || '' });
        return;
    }

    return app.citoid.request(cr).then((cr) => {
        res.status(cr.response.responseCode).type(app.formats[cr.format]);
        res.send(cr.response.body);
    }, (cr) => {
        res.status(cr.response.responseCode).type(app.formats[cr.format]);
        res.send(cr.response.body);
    });

});

module.exports = function (appObj) {

    app = appObj;

    // set allowed export formats and expected response type
    app.nativeFormats = {
        mediawiki: 'application/json',
        zotero: 'application/json',
        'mediawiki-basefields': 'application/json',
        wikibase: 'application/json'
    };
    app.zoteroFormats = {
        bibtex: 'application/x-bibtex'
    };
    app.formats = Object.assign({}, app.nativeFormats, app.zoteroFormats);

    // init the Citoid service object
    app.citoid = new CitoidService(app);

    return {
        path: '/',
        skip_domain: true,
        router
    };

};
