'use strict';

const assert = require( '../../../utils/assert.js' );
const idMatchingUtils = require( '../../../../lib/utils/idMatchingUtils.js' );

describe( 'lib/utils/idMatchingUtils.js', () => {

	it( 'extracts DOI successfully', () => {
		const doiFixtures = [
			{
				input: '',
				expected: null
			},
			{
				// This DOI is incomplete in the PDF you see `10.13009/EUCASS2025-590`
				input: 'https://www.eucass.eu/doi/EUCASS2025-590.pdf',
				expected: null
			},
			{
				input: 'https://www.3af-spacepropulsion.com/images/DOI/SPC2026/DocFinal-527-2526-(1).pdf',
				expected: null
			},
			{
				input: '10.1002/example',
				expected: '10.1002/example'
			},
			{
				input: 'http://DOI.org/10.1007/11926078_68',
				expected: '10.1007/11926078_68'
			},
			{
				input: 'https://www.pnas.org/doi/pdf/10.1073/pnas.2108146119',
				expected: '10.1073/pnas.2108146119'
			},
			// FIXME: Not working / not a clean extraction
			{
				input: 'http://DOI.org/10.1007/11926078_68"',
				expected: '10.1007/11926078_68"'
			},
			{
				input: 'http://DOI.org/10.1007/11926078_68\'',
				expected: '10.1007/11926078_68\''
			},
			{
				// URL encoded DOI
				input: 'https://example.com/article?doi=10.1038%2Fs41586-020-2649-2',
				expected: null
			},
			{
				input: 'https://academic.oup.com/smr/advance-article-pdf/doi/10.1093/sxmrev/qeaf057/64711993/qeaf057.pdf',
				expected: '10.1093/sxmrev/qeaf057/64711993/qeaf057.pdf'
			},
			{
				input: 'https://www.frontiersin.org/articles/10.3389/fpsyg.2010.00001/pdf',
				expected: '10.3389/fpsyg.2010.00001/pdf'
			},
			{
				input: 'https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0000001&type=printable',
				expected: '10.1371/journal.pone.0000001&type=printable'
			},
			{
				input: 'https://f1000research-files.f1000.com/manuscripts/182974/9cac4dca-d953-49fa-b983-e3bb1846a17e_f1000res166104.pdf?doi=10.12688/f1000research.166104.1&gtmKey=GTM-MWFK8L5J&gtmAuth=hzk0Vc3qFsQYhCrIoHz68A&gtmPreview=env-1&immUserUrl=https%3A%2F%2Ff1r-proxy.f1krdev.com%2Feditor%2Fmember%2Fshow%2F&otid=1bc074d1-3db4-47ed-9f80-df1a4a3f2ab4&s3BucketUrl=https%3A%2F%2Ff1000research-files.f1000.com&submissionUrl=%2Ffor-authors%2Fpublish-your-research&transcendEnv=cm&transcendId=ef49a3f1-d8c1-47d6-88fc-50e41130631f&numberOfBrowsableCollections=74&numberOfBrowsableInstitutionalCollections=7&numberOfBrowsableGateways=48',
				expected: '10.12688/f1000research.166104.1&gtmKey=GTM-MWFK8L5J&gtmAuth=hzk0Vc3qFsQYhCrIoHz68A&gtmPreview=env-1&immUserUrl=https%3A%2F%2Ff1r-proxy.f1krdev.com%2Feditor%2Fmember%2Fshow%2F&otid=1bc074d1-3db4-47ed-9f80-df1a4a3f2ab4&s3BucketUrl=https%3A%2F%2Ff1000research-files.f1000.com&submissionUrl=%2Ffor-authors%2Fpublish-your-research&transcendEnv=cm&transcendId=ef49a3f1-d8c1-47d6-88fc-50e41130631f&numberOfBrowsableCollections=74&numberOfBrowsableInstitutionalCollections=7&numberOfBrowsableGateways=48'
			}
		];

		doiFixtures.forEach( ( fixture ) => {
			assert.strictEqual( idMatchingUtils.extractDOI( fixture.input ), fixture.expected );
		} );
	} );

} );
