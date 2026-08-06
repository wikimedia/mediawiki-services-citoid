'use strict';

const assert = require( '../../../utils/assert.js' );
const hostIsAllowed = require( '../../../../lib/utils/hostIsAllowed.js' );

describe( 'lib/utils/hostIsAllowed.js', () => {

	const loggerMock = {
		log: function () {}
	};

	it( 'checks allowed hosts successfully', async () => {
		const urlFixtures = [
			{
				input: 'nohostname',
				expected: false,
				msg: 'blocks if missing hostname'
			},
			{
				input: 'http://www.example.com%20withspace',
				expected: false,
				msg: 'blocks invalid hostnames'
			},
			{
				input: 'ftp://123.123.123.123',
				expected: false,
				msg: 'blocks unallowed protocol'
			},
			{
				input: 'mailto:name@example.com',
				expected: false,
				msg: 'blocks hostname-less mailto'
			},
			{
				input: 'file:///etc/passwd',
				expected: false,
				msg: 'blocks hostname-less file'
			},
			{
				input: 'data:text/html;base64',
				expected: false,
				msg: 'blocks hostname-less data'
			},
			{
				input: 'http://192.168.0.0',
				expected: false,
				msg: 'blocks private IPs'
			},
			{
				input: 'http://test.localhost',
				expected: false,
				msg: 'blocks private IPs after resolving'
			},
			{
				input: 'http://example.com',
				expected: 'http://example.com',
				msg: 'resolves and approves valid URLs'
			}
		];

		for ( const fixture of urlFixtures ) {
			try {
				const result = await hostIsAllowed.hostIsAllowed( fixture.input, {}, loggerMock );
				if ( fixture.expected ) {
					assert.equal( result, fixture.expected );
				} else {
					assert.fail( 'Should throw an AddressError' );
				}
			} catch ( err ) {
				assert.equal( err.name, 'AddressError', fixture.msg );
			}
		}
	} );

} );
