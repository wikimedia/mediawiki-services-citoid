'use strict';

/* Regex matches */
// Assumes all strings with http/s protocol are URLs

// Look for DOI in URL with query string removed or original search parameter
// eslint-disable-next-line security/detect-unsafe-regex
const reDOI = /\b10\.[0-9]{3,5}(?:[.][0-9]+)*\/.*/;
const reHTTP = /^((https?):\/\/.+)/;

const rePMCID = /\bPMC\d{7}\b/;

// Captures pmid out of url; old and new patterns respectively
// eslint-disable-next-line security/detect-unsafe-regex
const rePMIDURLs = /^(?:https?:\/\/)?www.ncbi.nlm.nih.gov\/pubmed\/(\d+)\/?|^(?:https?:\/\/)?pubmed.ncbi.nlm.nih.gov\/(\d+)\/?/i;

// Avoid interpreting ISBNs as PMIDs if ISBNs are not enabled
// (since PMID regex captures strings of one to eight numbers)
// Accepts 'PMID 1234' or '1234'; No 9 digit pmids yet.
const rePMID = /^(?:PMID )?([1-9]\d{0,8})\b/;

// Captures pmc out of url
// eslint-disable-next-line security/detect-unsafe-regex
const rePMCURLs = /^(?:https?:\/\/)?www.ncbi.nlm.nih.gov\/pmc\/articles\/(PMC\d+)\/?|^(?:https?:\/\/)?pmc.ncbi.nlm.nih.gov\/articles\/(PMC\d+)\/?/i;

// Strict QIQ match - doesn't extract it out of whitespace
const reQID = /^[Qq][1-9]+[0-9]*$/;

// Assumes all strings with www substring are URLs
const reWWW = /^((www)\..+\..+)/;

// Detects url *inside* a search string
// eslint-disable-next-line security/detect-unsafe-regex
const reURI = /(?:https?:\/\/|www\.)(?:\([-A-Z0-9+&@#/%=~_$?!:,.]*\)|[-A-Z0-9+&@#/%=~_$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_$?!:,.]*\)|[A-Z0-9+&@#/%=~_$])/igm;

/**
 * @param  {string} search
 * @return {?string} extracted DOI or null of non found
 */
function extractDOI( search ) {
	const match = search.match( reDOI );
	return match && match[ 0 ];
}

/**
 * @param  {string} search
 * @return {?string}
 */
function extractHTTP( search ) {
	const match = search.match( reHTTP );
	return match && match[ 0 ];
}

/**
 * @param  {string} search
 * @return {?string}
 */
function extractQID( search ) {
	const match = search.match( reQID );
	return match && match[ 0 ];
}

/**
 * @param  {string} search
 * @return {?string}
 */
function extractPMCID( search ) {
	const match = search.match( rePMCID );
	return match && match[ 0 ];
}
/**
 * @param  {string} search
 * @return {?Array}
 */
function extractPMCURLs( search ) {
	return search.match( rePMCURLs );
}

/**
 * @param  {string} search
 * @return {?Array}
 */
function extractPMIDURLs( search ) {
	return search.match( rePMIDURLs );
}

/**
 * Returns array of 1 or more pmids
 *
 * @param  {string} search
 * @return {?Array}
 */
function extractPMIDs( search ) {
	return search.match( rePMID );
}

/**
 * @param  {string} search
 * @return {?string}
 */
function extractWWW( search ) {
	const match = search.match( reWWW );
	return match && match[ 0 ];
}

/**
 * @param  {string} search
 * @return {?string}
 */
function extractURI( search ) {
	const match = search.match( reURI );
	return match && match[ 0 ];
}

module.exports = {
	extractDOI,
	extractQID,
	extractHTTP,
	extractPMCID,
	extractPMCURLs,
	extractPMIDURLs,
	extractPMIDs,
	extractWWW,
	extractURI
};
