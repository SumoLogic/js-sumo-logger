var request = require('request');
var _ = require('underscore');

var DEFAULT_INTERVAL = 0;
var SESSION_KEY = 'sumologic.logger.session';

var originalOpts = {};
var currentConfig = {};
var currentLogs = [];

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
    session: SESSION_KEY + (opts.sessionKey ? opts.sessionKey : getUUID()),
    onSuccess: opts.onSuccess || false,
    onError: opts.onError || false
  };
}

function sendLogs() {
  if (currentLogs.length === 0) {
    return;
  }
  var tempCategory = '';

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

    request({
      method: 'POST',
      url: currentConfig.endpoint,
      headers: headers,
      body: currentLogs.concat('\n')
    }, function (error, response) {
      var err = !!error || response.status < 200 || response.status >= 400;

      if (err && currentConfig.hasOwnProperty('onError')) {
        currentConfig.onError();
      } else {
        if (currentConfig.hasOwnProperty('onSuccess')) {
          currentConfig.onSuccess();
        }
        currentLogs = [];
      }
    });
  } catch (ex) {
    if (currentConfig.hasOwnProperty('onError')) {
      currentConfig.onError();
    }
  }
}

function SumoLogger(opts) {
  if (!opts || !opts.hasOwnProperty('endpoint') || opts.endpoint === undefined || opts.endpoint === '') {
    console.error('Sumo Logic Logger requires you to set an endpoint.');
    return;
  }

  originalOpts = opts;
  setConfig(opts);

  if (currentConfig.interval > 0) {
    var sync = setInterval(function() {
      sendLogs();
    }, currentConfig.interval);
  }
}

SumoLogger.prototype.updateConfig = function (newOpts) {
  try {
    if (!_.isEmpty(newOpts)) {
      if (newOpts.endpoint) {
        currentConfig.endpoint = newOpts.endpoint;
      }
      if (newOpts.interval) {
        currentConfig.interval = newOpts.interval;
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

SumoLogger.prototype.log = function(msg, optConfig) {
  if (!msg) {
    console.error('Sumo Logic Logger requires that you pass a value to log.');
    return;
  }

  var isArray = msg instanceof Array;
  var testEl = isArray ? msg[0] : msg;
  var type = typeof testEl;

  if (type === 'undefined' || (type === 'string' && testEl === '')) {
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
