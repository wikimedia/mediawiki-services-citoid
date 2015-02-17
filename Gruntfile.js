module.exports = function( grunt ) {

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-jshint');

	// Project configuration.
	grunt.initConfig({
		// Task configuration.
		jshint: {
			options: {
				jshintrc: true
			},
			all: [
				'*.js',
				'localsettings.js.sample',
				'lib/*.js'
			]
		}
	});

	// Default task.
	grunt.registerTask( 'test', [ 'jshint:all' ] );
	grunt.registerTask( 'default', 'test' );

};
