module.exports = function( grunt ) {

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-simple-mocha');

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
				'lib/*.js',
				'lib/translators/*.js',
				'test/*.js'
			]
		},
		simplemocha: {
			options: {
				globals: ['describe', 'its'],
				timeout: 20000,
				ignoreLeaks: false,
				ui: 'bdd',
				reporter: 'tap'
			},
			all: { src: ['test/*.js'] }
		}
	});

	// Default task.
	grunt.registerTask('test', ['jshint:all']);
	grunt.registerTask('all', ['jshint:all', 'simplemocha']);
	grunt.registerTask('default', 'test');

};
