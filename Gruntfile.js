module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options : {
        sourceMap: true
      },
      main: {
        files: { 'src/sumologic.logger.min.js': ['src/sumologic.logger.js'] }
      }
    },
    'http-server': {
      dev: {
        root: '.',
        port: 8282,
        host: '127.0.0.1',
        cache: 1,
        ext: 'html',
        https: true,
        customPages: {
          '/example': 'example/example.html'
        }
      }
    }
	});

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-http-server');

	grunt.registerTask('default', ['uglify', 'http-server'] );

};
