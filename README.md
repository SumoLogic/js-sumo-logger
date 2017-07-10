# Sumo Logic JavaScript Logging SDK

The [Sumo Logic](http://www.sumologic.com) JavaScript Logging SDK library enables you to send custom log messages to an [HTTP Source](https://help.sumologic.com/Send_Data/Sources/02Sources_for_Hosted_Collectors/HTTP_Source) without installing a Collector on your server.

Included are a plain vanilla JavaScript version (`sumologic.logger.js`) for browser web apps and a Node.js module (`sumoLogger.js`). The configuration options are the same for both versions, but usage is slightly different.

You must have an HTTP source created in your Sumo Logic account to use this SDK. To create one, log into Sumo Logic, go to the Collectors page and either create a new Hosted Collector or add a new HTTP source to an existing Hosted Collector.

*Basics:*

All logs are sent as JSON objects. If you call `log()` with just a string, the string is included as a field called `msg`. If you call the function with a JSON object, each field in the object is included as a separate field. Fields called `sessionId`, `url`, and `timestamp` are sent in both cases.

Messages are batched and sent at the configured interval; default is zero, meaning messages are sent to the server on each call. You can force any queued messages to be sent, typically during a shutdown or logout flow.

### Table of Contents
* [Installation](#installation)
* [Demos](#demos)
* [Usage](#usage)
    * [Configuration](#configuration)
    * [Per Message Options](#per-message-options)
* [Usage Examples](#usage-examples)
* [Security Note](#security-note)
* [Tests](#tests)
* [Issues](#issues)
* [License](#license)

## Installation

**Prerequisites**

You must have an HTTP source in your Sumo Logic account to use this SDK. To create one:
* log into Sumo Logic,
* go to the Manage Collection page, and,
* **either** add a new HTTP source to a new or existing Hosted Collector **or** select an existing HTTP source.

You’ll need the endpoint URL to configure the logger object. You can get it by clicking the `Show URL` link for the source on the Manage Collection page.

If you don't have a Sumo Logic account yes, you can easily create one by going to https://www.sumologic.com and clicking the Free Trial button--no cost, just enter your email.

You must also have Node.js/npm installed to use the SDK. [Node installation](https://docs.npmjs.com/getting-started/installing-node)

Please review the Security Note at the end of this article before planning your implementation.

**Using NPM:**
```
$ npm install --save sumo-logger
```

**From GitHub:**
* Download or clone this repo.
* Copy the files in the `src` folder into your app/website source.
* Add `<script src="path/to/sumologic.logger.min.js"></source>` or 
   `<script src="path/to/sumologic.logger.js"></source>` to your pages.
* Add a `<script>` block with the desired log call, as explained in [Usage](#user-content-usage), to your pages.

## Demos

Before running either demo, `cd` to the repo directory and run `npm install`. (You must have node/npm installed already.)

**Node Demo**

Open `node-example/index.js` in an editor and update the `opts` configuration object at the top of the file with your own values, at least for the endpoint.

In a terminal, switch to the `node-example` directory and run `npm install` again. Then run `node index.js` to launch the server and open a browser tab to [http://localhost:3000/example.html] to see the demo page.

**Browser Demo**

Use a local server to serve up the `example/example.html` file included in this repo. An npm script has been included to simplify loading the page, in your terminal:

* `cd` into the repo root folder,
* run `npm run http-server`, and,
* open your browser to (https://127.0.0.1:8282/example).

## Usage

### Core functions

* `config`: (Vanilla JS lib only) Set the configuration for sending logs. Options are listed in the next section. In the Node.js module, configuration options are sent when instantiating the object.
* `log`: Set a log to be sent.
* `flushLogs`: Force any pending logs to be sent immediately. This is mainly for use in a `logOut`/`window.onBeforeUnload` flow to ensure that any remaining queued messages are sent to Sumo Logic.

### Configuration

Before sending any messages your page should set up the SumoLogger object. Of all the configurable attributes, only `endpoint` is required and all others are optional.

*endpoint (Required):*

To send your logs, the script must know which HTTP Source to use. Pass this value (which you can get from the Collectors page) in the `endpoint` parameter.

*interval (optional):*

A number of milliseconds. Messages will be batched and sent at the interval specified. Default value is zero, meaning messages are sent each time `log()` is called.

*onSuccess (optional)*

You can provide a function that is executed only when logs are successfully sent. The only information you can be sure of in the callback is that the call succeeded. There is no other response information.

*onError (optional)*

You can provide a function that is executed if an error occurs when the logs are sent.

*clientUrl (optional, Node version only)*

You can provide a URL, in the Node version of this SDK only, which will be sent as the `url` field of the log line. In the vanilla JS version, the URL is detected from the browser's `window.location` value.

*sendErrors (optional):*

Setting `sendErrors` to `true` will send all the unhandled errors to Sumo Logic with the error message, URL, line number, and column number. This attribute plays well with any other window.onerror functions that have been defined.

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
    interval: 20000, // Send messages in batches every 20 seconds
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
    }
  };
```

**Node.js:**

```javascript
    var sumoLogic = require('sumologic-logger-node');
    var opts = {
        endpoint: 'your HTTP Source endpoint',
        clientUrl: 'http://yourDomain.com/path/to/page' // NODE version only,
        // ... any other options ...
    };
    
    // Instantiate the SumoLogger
    var sumoLogger = new SumoLogger(opts);
    
    // Push a message to be logged
    sumoLogger.log('event message to log', {
      sessionKey: 'your session key value',
      url: 'https://youDomain.com/actual/page/served'
    });
    
    // Flush any logs, typically this line would be in your shutdown code
    sumoLogger.flushLogs();
```

**Browser Apps:**

```html
<script>
  // Configure the logger
  SLLogger.config({
    endpoint: "https://us2-events.sumologic.com/receiver/v1/http/222loremipsumetc32FG",
  });

  // Push messages to be logged
  // Simple text
  SLLogger.log('A simple log message');

  // With per message options
  SLLogger.log(
    'A simple log message',
    {
      sessionKey: 'Abc32df34rfg54gui8j098dv13sq5re',
      timestamp: new Date()
     });

  // JSON, which can use field names specified in Field Extraction Rules
  SLLogger.log({
    "userType": "silver",
    "referralSource": referralSource,
    "campaignId": campaignId
  });
  
  // Flush any logs, typically this line would be in your shutdown code
  window.addEventListener('beforeunload', function() {
    SLLogger.flushLogs();
  });
</script> 
```

*Field Extraction Rules:* [fields in Sumo Logic](https://service.sumologic.com/help/Default.htm#About_Field_Extraction.htm)

## Security Note

Sumo Logic is always concerned with security but in some instances we must balance risks with value of functionality. Using the vanilla JS version of this library is one such situation.

Hitting an HTTP source endpoint from code running in a web browser exposes the endpoint URL to anyone inspecting the code or running your app with the browser console open to the network tab. There is no means to obfuscate or hide this. The risk is some malicious individual will send additional traffic to the endpoint, potentially using up your ingest or polluting your searches.

If this is a concern for you, **we recommend using the Node.js version of the lib** so your endpoint URL is never exposed.
 
One method for minimizing the damage from some malicious users, should you choose to use this or other similar code in the browser, is adding an arbitrary string based on a regex to your log message and adding a processing rule to the HTTP source configuration that blocks incoming messages which lack a match for the regex.

## Tests

Test are in `jasminetest/sumologic-logger-spec.js` and can be run by loading `http://[your domain:port]/jasminetest/TrackerSpecRunner.html`.

To run the tests, open `jasminetest/sumologic-logger-spec.js` and update the `sumoTestEndpoint` variable on line 2 with your HTTP source endpoint. You must have already run `npm install` in the root of the repo.

For example, if you use the Grunt server explained above, the tests will run at `https://127.0.0.1:8282/jasminetest/TrackerSpecRunner.html`.

For a shortcut you may use the included npm test script, which will start the Grunt server and open the testRunner page:

```
$ npm run test
````

## Issues

Please file issues or feature requests on this Github repo.

## License

Copyright 2017, Sumo Logic, Inc. The Sumo Logic JavaScript Logging SDK is published under the Apache Software License, Version 2.0. Please visit http://www.apache.org/licenses/LICENSE-2.0.txt for details.
