# Sumo Logic JavaScript Logging SDK Release Notes

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