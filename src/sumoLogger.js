'use strict';

const request = require('request');
const _ = require('underscore');

const DEFAULT_INTERVAL = 0;
const NOOP = () => {};

let currentConfig = {};
let currentLogs = [];
let interval;

function getUUID() {
    // eslint gets funny about bitwise
    /* eslint-disable */
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const piece = Math.random() * 16 | 0;
        const elem = c === 'x' ? piece : (piece & 0x3 | 0x8);
        return elem.toString(16);
    });
    /* eslint-enable */
}

function setConfig(config) {
    currentConfig = {
        endpoint: config.endpoint,
        clientUrl: config.clientUrl || '',
        interval: config.interval || DEFAULT_INTERVAL,
        sourceName: config.sourceName || '',
        hostName: config.hostName || '',
        sourceCategory: config.sourceCategory || '',
        session: config.sessionKey || getUUID(),
        onSuccess: config.onSuccess || NOOP,
        onError: config.onError || NOOP,
        graphite: config.graphite || false
    };
}

function sendLogs() {
    if (currentLogs.length === 0) {
        return;
    }

    let logsToSend;

    try {
        const headers = {};
        if (currentConfig.graphite) {
            _.extend(headers, { 'Content-Type': 'application/vnd.sumologic.graphite' });
        } else {
            _.extend(headers, { 'Content-Type': 'application/json' });
        }
        if (currentConfig.sourceName !== '') {
            _.extend(headers, { 'X-Sumo-Name': currentConfig.sourceName });
        }
        if (currentConfig.sourceCategory !== '') {
            _.extend(headers, { 'X-Sumo-Category': currentConfig.sourceCategory });
        }
        if (currentConfig.hostName !== '') {
            _.extend(headers, { 'X-Sumo-Host': currentConfig.hostName });
        }

        logsToSend = currentLogs;
        currentLogs = [];

        request({
            method: 'POST',
            url: currentConfig.endpoint,
            headers,
            body: logsToSend.join('\n')
        }, (error, response) => {
            const err = !!error || response.statusCode < 200 || response.statusCode >= 400;

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
    if (!opts || !Object.prototype.hasOwnProperty.call(opts, 'endpoint') || opts.endpoint === undefined || opts.endpoint === '') {
        console.error('Sumo Logic Logger requires you to set an endpoint.');
        return;
    }

    setConfig(opts);
    this.startLogSending();
}

SumoLogger.prototype.updateConfig = (newOpts) => {
    try {
        if (!_.isEmpty(newOpts)) {
            if (newOpts.endpoint) {
                currentConfig.endpoint = newOpts.endpoint;
            }
            if (newOpts.interval) {
                currentConfig.interval = newOpts.interval;
                SumoLogger.prototype.startLogSending();
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

SumoLogger.prototype.emptyLogQueue = () => {
    currentLogs = [];
};

SumoLogger.prototype.flushLogs = () => {
    sendLogs();
};

SumoLogger.prototype.startLogSending = () => {
    if (currentConfig.interval > 0) {
        interval = setInterval(() => {
            sendLogs();
        }, currentConfig.interval);
    }
};

SumoLogger.prototype.stopLogSending = () => {
    clearInterval(interval);
};

SumoLogger.prototype.log = (msg, optionalConfig) => {
    let message = msg;

    if (!message) {
        console.error('Sumo Logic Logger requires that you pass a value to log.');
        return;
    }

    const isArray = message instanceof Array;
    const testEl = isArray ? message[0] : message;
    const type = typeof testEl;

    if (type === 'undefined') {
        console.error('Sumo Logic Logger requires that you pass a value to log.');
        return;
    } else if (currentConfig.graphite && (!testEl.path || !testEl.value)) {
        console.error('Sumo Logic requires both \'path\' and \'value\' properties to be provided in the message object');
        return;
    } else if (type === 'object') {
        if (Object.keys(message).length === 0) {
            console.error('Sumo Logic Logger requires that you pass a non-empty JSON object to log.');
            return;
        }
    }

    if (!isArray) {
        message = [message];
    }

    let ts = new Date();
    let sessKey = currentConfig.session;
    const client = { url: currentConfig.clientUrl };

    if (optionalConfig) {
        if (Object.prototype.hasOwnProperty.call(optionalConfig, 'sessionKey')) {
            sessKey = optionalConfig.sessionKey;
        }

        if (Object.prototype.hasOwnProperty.call(optionalConfig, 'timestamp')) {
            ts = optionalConfig.timestamp;
        }

        if (Object.prototype.hasOwnProperty.call(optionalConfig, 'url')) {
            client.url = optionalConfig.url;
        }
    }

    const timestamp = ts.toUTCString();

    const messages = message.map((item) => {
        if (currentConfig.graphite) {
            return `${item.path} ${item.value} ${Math.round(ts.getTime() / 1000)}`;
        }
        if (typeof item === 'string') {
            return JSON.stringify(_.extend({
                msg: item,
                sessionId: sessKey,
                timestamp
            }, client));
        }
        const current = {
            sessionId: sessKey,
            timestamp
        };
        return JSON.stringify(_.extend(current, client, item));
    });

    currentLogs = currentLogs.concat(messages);

    if (currentConfig.interval === 0) {
        sendLogs();
    }
};

module.exports = SumoLogger;
