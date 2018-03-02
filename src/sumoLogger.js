var request = require('request');
var _ = require('underscore');

var DEFAULT_INTERVAL = 0;
var NOOP = () => {};

var originalOpts = {};
var currentConfig = {};
var currentLogs = [];
var interval;

function getUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var piece = Math.random() * 16 | 0;
    var elem = c == 'x' ? piece : (piece & 0x3 | 0x8);
    return elem.toString(16);
  });
}

function setConfig(opts) {
  currentConfig = {
    endpoint: opts.endpoint,
    clientUrl: opts.clientUrl || '',
    interval: opts.interval || DEFAULT_INTERVAL,
    sourceName: opts.sourceName || '',
    hostName: opts.hostName || '',
    sourceCategory: opts.sourceCategory || '',
    session: opts.sessionKey || getUUID(),
    onSuccess: opts.onSuccess || NOOP,
    onError: opts.onError || NOOP
  };
}

function sendLogs() {
  if (currentLogs.length === 0) {
    return;
  }
  var tempCategory = '';
  var logsToSend;

  try {
    var headers = {'Content-Type': 'application/json'};
    if (currentConfig.sourceName !== '') {
      _.extend(headers, {'X-Sumo-Name': currentConfig.sourceName});
    }
    if (currentConfig.sourceCategory !== '') {
      _.extend(headers, {'X-Sumo-Category': currentConfig.sourceCategory});
    }
    if (currentConfig.hostName !== '') {
      _.extend(headers, {'X-Sumo-Host': currentConfig.hostName});
    }

    logsToSend = currentLogs;
    currentLogs = [];
    request({
      method: 'POST',
      url: currentConfig.endpoint,
      headers: headers,
      body: logsToSend.join('\n')
    }, function (error, response) {
      var err = !!error || response.statusCode < 200 || response.statusCode >= 400;

      if (err) {
        currentLogs = logsToSend;
        currentConfig.onError();
      } else {
          currentConfig.onSuccess();
      }
    });
  } catch (ex) {
    currentLogs = logsToSend;
    currentConfig.onError();
  }
}

function SumoLogger(opts) {
  if (!opts || !opts.hasOwnProperty('endpoint') || opts.endpoint === undefined || opts.endpoint === '') {
    console.error('Sumo Logic Logger requires you to set an endpoint.');
    return;
  }

  originalOpts = opts;
  setConfig(opts);
  this.startLogSending();
}

SumoLogger.prototype.updateConfig = function (newOpts) {
  try {
    if (!_.isEmpty(newOpts)) {
      if (newOpts.endpoint) {
        currentConfig.endpoint = newOpts.endpoint;
      }
      if (newOpts.interval) {
        currentConfig.interval = newOpts.interval;
        this.startLogSending();
      }
      if (newOpts.sourceCategory) {
        currentConfig.sourceCategory = newOpts.sourceCategory;
      }
    }
  } catch (ex) {
    console.error('Could not update Sumo Logic config');
    return false;
  }
  return true;
};

SumoLogger.prototype.emptyLogQueue = function () {
  currentLogs = [];
};

SumoLogger.prototype.flushLogs = function () {
  sendLogs();
};

SumoLogger.prototype.startLogSending = function() {
    if (currentConfig.interval > 0) {
        interval = setInterval(function() {
            sendLogs();
        }, currentConfig.interval);
    }
}

SumoLogger.prototype.stopLogSending = function() {
    clearInterval(interval);
}

SumoLogger.prototype.log = function(msg, optConfig) {
  if (!msg) {
    console.error('Sumo Logic Logger requires that you pass a value to log.');
    return;
  }

  var isArray = msg instanceof Array;
  var testEl = isArray ? msg[0] : msg;
  var type = typeof testEl;

  if (type === 'undefined') {
    console.error('Sumo Logic Logger requires that you pass a value to log.');
    return;
  } else if (type === 'object') {
    if (Object.keys(msg).length === 0) {
      console.error('Sumo Logic Logger requires that you pass a non-empty JSON object to log.');
      return;
    }
  }

  if (!isArray) {
    msg = [msg];
  }

  var ts = new Date();
  var sessKey = currentConfig.session;
  var client = {url: currentConfig.clientUrl};
  if (optConfig) {
    if (optConfig.hasOwnProperty('sessionKey')) {
      sessKey = optConfig.sessionKey;
    }

    if (optConfig.hasOwnProperty('timestamp')) {
      ts = optConfig.timestamp;
    }

    if (optConfig.hasOwnProperty('url')) {
      client.url = optConfig.url
    }
  }
  timestamp = ts.toUTCString();

  var msgs = msg.map(function (item) {
    if (typeof item === "string") {
      return JSON.stringify(_.extend({
        msg:       item,
        sessionId: sessKey,
        timestamp: timestamp
      }, client));
    } else {
      var curr = {
        sessionId: sessKey,
        timestamp: timestamp
      };
      return JSON.stringify(_.extend(curr, client, item));
    }
  });

  currentLogs = currentLogs.concat(msgs);
  if (currentConfig.interval === 0) {
    sendLogs();
  }
};

module.exports = SumoLogger;
