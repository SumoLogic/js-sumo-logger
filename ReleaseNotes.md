# Sumo Logic JavaScript Logging SDK Release Notes

### v1.5.3
* Error and error related testing enhancements (Thanks [James Spence](https://github.com/jamesaspence))

### v1.5.2
* Remove Snyk

### v1.5.0
* Adds `raw` option to allow sending a plaintext string as log message

### v1.4.0
* Moves Node library to expose a class to help support multiple instances of SumoLogger.
* Cleans up much conditional code, e.g., in configuration setting and checking.
* Only supports active Node versions (stable, lts, 6)

### v1.3.0
* Adds Babel pre-publish step so clients using SumoLogger use the es5 version by default, allowing for easier use with webpack and older Node versions

### v1.2.1
* Replace request lib with axios and underscore with lodash. Reduces bundled size from 314kb to 8kb! Thanks [Clement](https://github.com/clementallen).

### v1.2.0
* Adds support for sending Graphite logs

### v1.1.2
* Add Release Notes
* Add ESLint linting

### v1.1.1
* Added Credits section to README

### v1.1.0
* Added tests for Node library
* Cleaned up some unneeded conditionals

### v1.0.8
* BUGFIX: Fixed an issue with use on concat instead of join

### v1.0.7
* Removed the session key prefix as no cookies are in use in the Node version of the logger

### v1.0.6
* Updated version of node-grunt-http-server to avoid a security issue in a sub-package
* BUGFIX: Fixed config event method bug and removed session key

### v1.0.5
* Added temp logs queue to avoid sending duplicate logs being submitted
* Updated license expression to SPDX spec

### v1.0.4
* BUGFIX: Use correct status code attribute of request response

### v1.0.2
* BUGFIX: Use correct statusCode attribute of request lib
* Ignored unnecessary files from being published to NPM
* Fixed Readme typo and updated deps

### v1.0.1
* Updated npm install command
