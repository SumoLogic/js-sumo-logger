'use strict';

const axios = require('axios');
const isEmpty = require('lodash.isempty');
const assignIn = require('lodash.assignin');

const DEFAULT_INTERVAL = 0;
const NOOP = () => {};

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

class SumoLogger {
    constructor(options) {
        if (!options || !Object.prototype.hasOwnProperty.call(options, 'endpoint') || options.endpoint === undefined || options.endpoint === '') {
            console.error('Sumo Logic Logger requires you to set an endpoint.');
            return;
        }

        this.currentConfig = {};
        this.currentLogs = [];
        this.interval = 0;

        this.setConfig(options);
        this.startLogSending();
    }

    setConfig(config) {
        this.currentConfig = {
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

    updateConfig(newOptions) {
        try {
            if (!isEmpty(newOptions)) {
                if (newOptions.endpoint) {
                    this.currentConfig.endpoint = newOptions.endpoint;
                }
                if (newOptions.interval) {
                    this.currentConfig.interval = newOptions.interval;
                    this.startLogSending();
                }
                if (newOptions.sourceCategory) {
                    this.currentConfig.sourceCategory = newOptions.sourceCategory;
                }
            }
        } catch (ex) {
            console.error('Could not update Sumo Logic config');
            return false;
        }
        return true;
    }

    sendLogs() {
        if (this.currentLogs.length === 0) {
            return;
        }

        let logsToSend;

        try {
            const headers = {};
            if (this.currentConfig.graphite) {
                assignIn(headers, { 'Content-Type': 'application/vnd.sumologic.graphite' });
            } else {
                assignIn(headers, { 'Content-Type': 'application/json' });
            }
            if (this.currentConfig.sourceName !== '') {
                assignIn(headers, { 'X-Sumo-Name': this.currentConfig.sourceName });
            }
            if (this.currentConfig.sourceCategory !== '') {
                assignIn(headers, { 'X-Sumo-Category': this.currentConfig.sourceCategory });
            }
            if (this.currentConfig.hostName !== '') {
                assignIn(headers, { 'X-Sumo-Host': this.currentConfig.hostName });
            }

            logsToSend = this.currentLogs;
            this.currentLogs = [];

            axios.post(
                this.currentConfig.endpoint,
                logsToSend.join('\n'),
                { headers }
            ).then(() => {
                logsToSend = [];
                this.currentConfig.onSuccess();
            }).catch((error) => {
                this.currentConfig.onError(error.message);
                this.currentLogs = logsToSend;
            });
        } catch (ex) {
            this.currentLogs = logsToSend;
            this.currentConfig.onError(ex.message);
        }
    }

    startLogSending() {
        if (this.currentConfig.interval > 0) {
            this.interval = setInterval(() => {
                this.sendLogs();
            }, this.currentConfig.interval);
        }
    }

    stopLogSending() {
        clearInterval(this.interval);
    }

    emptyLogQueue() {
        this.currentLogs = [];
    }

    flushLogs() {
        this.sendLogs();
    }

    log(msg, optionalConfig) {
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
        } else if (this.currentConfig.graphite && (!testEl.path || !testEl.value)) {
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
        let sessKey = this.currentConfig.session;
        const client = { url: this.currentConfig.clientUrl };

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
            if (this.currentConfig.graphite) {
                return `${item.path} ${item.value} ${Math.round(ts.getTime() / 1000)}`;
            }
            if (typeof item === 'string') {
                return JSON.stringify(assignIn({
                    msg: item,
                    sessionId: sessKey,
                    timestamp
                }, client));
            }
            const current = {
                sessionId: sessKey,
                timestamp
            };
            return JSON.stringify(assignIn(current, client, item));
        });

        this.currentLogs = this.currentLogs.concat(messages);

        if (this.currentConfig.interval === 0) {
            this.sendLogs();
        }
    }
}

module.exports = SumoLogger;
