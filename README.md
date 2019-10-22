# Sumo Logic JavaScript Logging SDK

The [Sumo Logic](http://www.sumologic.com) JavaScript Logging SDK library enables you to send custom log messages to an [HTTP Source](https://help.sumologic.com/Send_Data/Sources/02Sources_for_Hosted_Collectors/HTTP_Source) without installing a Collector on your server by using a CommonJS module (`sumoLogger.js`).

You must have created an HTTP source in your Sumo Logic account to use this SDK. To create one, log into Sumo Logic, go to the Collectors page and either create a new Hosted Collector or add a new HTTP source to an existing Hosted Collector. Online help is available on that page with all the relevant details.

*Basics:*

All logs are sent as JSON objects by default. If you call `log()` with just a string, the string is included as a field called `msg`. If you call the function with a JSON object, each field in the object is included as a separate field. Fields called `sessionId`, `url`, and `timestamp` are sent in both cases.

Messages are batched and sent at the configured interval/batch size; default for both is zero, meaning messages are sent to the server on each call. You can force any queued messages to be sent, typically during a shutdown or logout flow.

| Module Deprecation Notice |
| --- |
| NOTE: Use of the `sumologic.logger.js` module is deprecated as of v2.0.0. It will be removed entirely in v3.0.0. Starting with v2.0.0 no updates will be made to this module. Please use the `sumoLogger.js` module instead.  |

### Table of Contents
- [Sumo Logic JavaScript Logging SDK](#sumo-logic-javascript-logging-sdk)
    - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Core functions](#core-functions)
    - [Configuration](#configuration)
    - [Per Message Options](#per-message-options)
    - [Usage Examples](#usage-examples)
  - [Security Note](#security-note)
  - [Tests](#tests)
  - [Issues](#issues)
  - [Credits](#credits)
  - [License](#license)

## Installation

**Prerequisites**

You must have an HTTP source in your Sumo Logic account to use this SDK. To create one:
* log into Sumo Logic,
* go to the Manage Collection page, and,
* **either** add a new HTTP source to a new or existing Hosted Collector **or** select an existing HTTP source.

You’ll need the endpoint URL to configure the logger object. You can get it by clicking the `Show URL` link for the source on the Manage Collection page.

If you don't have a Sumo Logic account yet, you can easily create one by going to https://www.sumologic.com and clicking the Free Trial button--no cost, just enter your email.

You must also have Node.js/npm installed to use the SDK. [Node installation](https://docs.npmjs.com/getting-started/installing-node)

Please review the Security Note at the end of this article before planning your implementation.

**Using NPM:**
```
$ npm install --save sumo-logger
```

**From GitHub:**
* Download or clone this repo.
* Copy the files in the `src` folder into your app/website source.
* Add `<script src="path/to/sumoLogger.js"></source>` to your pages or `import` or `require` the module in your app.
* Add a `<script>` block with the desired log call to your pages, or use the function as needed in your app, as explained in [Usage](#user-content-usage).

## Typescript

A typings file developed by [Clement Allen](https://github.com/clementallen) is available at https://github.com/DefinitelyTyped/DefinitelyTyped/tree/d805f985f094cf169a933abb4fa506bcc6784dd8/types/sumo-logger (e.g., `"@types/sumo-logger": "^1.0.0"`).

## Usage

### Core functions

* `log`: Set a log to be sent.
* `flushLogs`: Force any pending logs to be sent immediately. This is mainly for use in a `logOut`/`window.onBeforeUnload` flow to ensure that any remaining queued messages are sent to Sumo Logic.
* `startLogSending`: Start sending batched logs at the preconfigured interval
* `stopLogSending`: Stop sending batched logs

### Configuration

Before sending any messages your page should set up the SumoLogger object. Of all the configurable attributes, only `endpoint` is required and all others are optional.

*endpoint (Required)*

To send your logs, the script must know which HTTP Source to use. Pass this value (which you can get from the Collectors page) in the `endpoint` parameter.

*returnPromise (optional)*

Default: TRUE. Causes `log()` to return a promise and ignore the `onSuccess` and `onError` handler options (if passed). ONLY works when logs are sent individually and not batched (`interval: 0`).

*interval (optional)*

A number of milliseconds. Messages will be batched and sent at the interval specified. Default value is zero, meaning messages are sent each time `log()` is called. If both `batchSize` and `interval` are configured sending will be triggered when the pending logs' aggregate message length is reached or when the specified interval is hit, and in either case the interval will be reset on send.

*useIntervalOnly (optional)*

Boolean. If enabled `batchSize` is ignored and only `interval` is used to trigger when the pending logs will be sent.

*batchSize (optional)*

An integer specifying total log length. This can be used by itself or in addition to `interval` but is ignored when `useIntervalOnly` is true. For higher volume applications, Sumo Logic recommends using between 100000 and 1000000 to optimize the tradeoff between network calls and load. If both `batchSize` and `interval` are configured sending will be triggered when the pending logs' aggregate message length is reached or when the specified interval is hit, and in either case the interval will be reset on send.

*onSuccess (optional)*

You can provide a function that is executed only when logs are successfully sent. The only information you can be sure of in the callback is that the call succeeded. There is no other response information.

*onError (optional)*

You can provide a function that is executed if an error occurs when the logs are sent.

*graphite (optional)*

Enables graphite metrics sending.

*raw (optional)*

Enables sending raw text logs exactly as they are passed to the logger.

*clientUrl (optional)*

You can provide a URL, in the Node version of this SDK only, which will be sent as the `url` field of the log line. In the vanilla JS version, the URL is detected from the browser's `window.location` value.

*sessionKey (optional)*

To identify specific user sessions, set a value for this field.

*hostName (optional)*

This value identifies the host from which the log is being sent.

*sourceCategory (optional)*

This value sets the Source Category for the logged message.

*sourceName (optional)*

This value sets the Source Name for the logged message.

### Per Message Options

All variants of the log call take an optional object parameter, which can include any of the following fields:

*timestamp:*

Defaults to `new Date()` called when processing the `log` call. Use this when the event being logged occurred at a different time than when the log was sent.

*sessionKey:*

Override a session key set in the `config` call.

*url*

Override client URL set in the `config` call. (Node version only)

### Usage Examples

**Full configuration:**

```javascript
  var opts = {
    endpoint: "https://us2-events.sumologic.com/receiver/v1/http/222loremipsumetc32FG",
    returnPromise: false,
    interval: 20000, // Send messages in batches every 20 seconds
    batchSize: 100000 // Or when total log length reaches 100k characters
    sendErrors: true,
    sessionKey: 'Abc32df34rfg54gui8j098dv13sq5re', // generate a GUID
    sourceName: 'My Custom App',
    sourceCategory: 'My Source Category',
    hostName: 'My Host Name',
    onSuccess: function() {
      // ... handle success ....
    },
    onError: function() {
      // ... handle error ....
    },
    graphite: true // Enable graphite metrics
  };
```

***Logging***
```javascript
const SumoLogger = require('sumo-logger');
const opts = {
    endpoint: 'your HTTP Source endpoint',
    clientUrl: 'http://yourDomain.com/path/to/page' // NODE version only,
    // ... any other options ...
};

// Instantiate the SumoLogger
const sumoLogger = new SumoLogger(opts);

// Push a message to be logged
sumoLogger.log('event message to log', {
  sessionKey: 'your session key value',
  url: 'https://youDomain.com/actual/page/served'
}).then(() => /* handle positive response */)
.catch(() => /* handle error response */);

// Flush any logs, typically this line would be in your shutdown code
sumoLogger.flushLogs();
```

***Metrics***
```javascript
const SumoLogger = require('sumo-logger');
const opts = {
    endpoint: 'your HTTP Source endpoint',
    graphite: true // enable graphite metrics
    // ... any other options ...
};

// Instantiate the SumoLogger
const sumoLogger = new SumoLogger(opts);

// Push a metric
sumoLogger.log({
  path: 'metric.path', // metric path as a dot separated string
  value: 100 // value of the metric
}).then(() => /* handle positive response */)
.catch(() => /* handle error response */);
```

*Field Extraction Rules:* [fields in Sumo Logic](https://help.sumologic.com/Manage/Search-Optimization-Tools/Manage-Field-Extractions)

## Security Note

Sumo Logic is always concerned with security but in some instances we must balance risks with value of functionality. Using the vanilla JS version of this library is one such situation.

Hitting an HTTP source endpoint from code running in a web browser exposes the endpoint URL to anyone inspecting the code or running your app with the browser console open to the network tab. There is no means to obfuscate or hide this. The risk is some malicious individual will send additional traffic to the endpoint, potentially using up your ingest or polluting your searches.

If this is a concern for you, **we recommend using the the lib from a Node.js app running on your server** so your endpoint URL is never exposed.

One method for minimizing the damage from some malicious users, should you choose to use this or other similar code in the browser, is adding an arbitrary string based on a regex to your log message and adding a processing rule to the HTTP source configuration that blocks incoming messages which lack a match for the regex.

## Tests

Tests are in the `test/` directory and can be run using the following command
```
$ npm run test
```

To generate a coverage report which is visible at `coverage/lcov-report/index.html`, run this command
```
$ npm run cover
```

## Issues

Please file issues or feature requests on this Github repo.

## Credits

Thanks to [Clement Allen](https://github.com/clementallen) for his many contributions to this project.

## TLS 1.2 Requirement

Sumo Logic only accepts connections from clients using TLS version 1.2 or greater. To utilize the content of this repo, ensure that it's running in an execution environment that is configured to use TLS 1.2 or greater.

## License

Copyright 2017-2018, Sumo Logic, Inc. The Sumo Logic JavaScript Logging SDK is published under the Apache Software License, Version 2.0. Please visit http://www.apache.org/licenses/LICENSE-2.0.txt for details.
