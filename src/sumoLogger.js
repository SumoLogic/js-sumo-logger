const axios = require('axios');
const assignIn = require('lodash.assignin');
const formatDate = require('../src/formatDate')

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
            console.error('An endpoint value must be provided');
            return;
        }

        this.config = {};
        this.pendingLogs = [];
        this.interval = 0;

        this.setConfig(options);
        this.startLogSending();
    }

    setConfig(newConfig) {
        this.config = {
            endpoint: newConfig.endpoint,
            returnPromise: newConfig.hasOwnProperty('returnPromise') ? newConfig.returnPromise : true,
            clientUrl: newConfig.clientUrl || '',
            interval: newConfig.interval || DEFAULT_INTERVAL,
            sourceName: newConfig.sourceName || '',
            hostName: newConfig.hostName || '',
            sourceCategory: newConfig.sourceCategory || '',
            session: newConfig.sessionKey || getUUID(),
            onSuccess: newConfig.onSuccess || NOOP,
            onError: newConfig.onError || NOOP,
            graphite: newConfig.graphite || false,
            raw: newConfig.raw || false
        };
    }

    updateConfig(newConfig = {}) {
        if (newConfig.endpoint) {
            this.config.endpoint = newConfig.endpoint;
        }
        if (newConfig.returnPromise) {
            this.config.returnPromise = newConfig.returnPromise;
        }
        if (newConfig.interval) {
            this.config.interval = newConfig.interval;
            this.startLogSending();
        }
        if (newConfig.sourceCategory) {
            this.config.sourceCategory = newConfig.sourceCategory;
        }
    }

    sendLogs() {
        if (this.pendingLogs.length === 0) {
            return;
        }

        let logsToSend;

        try {
            const headers = {
                'X-Sumo-Client': 'sumo-javascript-sdk'
            };
            if (this.config.graphite) {
                assignIn(headers, { 'Content-Type': 'application/vnd.sumologic.graphite' });
            } else {
                assignIn(headers, { 'Content-Type': 'application/json' });
            }
            if (this.config.sourceName !== '') {
                assignIn(headers, { 'X-Sumo-Name': this.config.sourceName });
            }
            if (this.config.sourceCategory !== '') {
                assignIn(headers, { 'X-Sumo-Category': this.config.sourceCategory });
            }
            if (this.config.hostName !== '') {
                assignIn(headers, { 'X-Sumo-Host': this.config.hostName });
            }

            logsToSend = this.pendingLogs;
            this.pendingLogs = [];

            if (this.config.returnPromise && logsToSend.length === 1) {
                return axios.post(
                    this.config.endpoint,
                    logsToSend.join('\n'),
                    { headers }
                );
            } else {
                axios.post(
                    this.config.endpoint,
                    logsToSend.join('\n'),
                    { headers }
                ).then(() => {
                    logsToSend = [];
                    this.config.onSuccess();
                }).catch((error) => {
                    this.config.onError(error);
                    this.pendingLogs = logsToSend;
                });
            }
        } catch (ex) {
            this.pendingLogs = logsToSend;
            this.config.onError(ex);
        }
    }

    startLogSending() {
        if (this.config.interval > 0) {
            this.interval = setInterval(() => {
                this.sendLogs();
            }, this.config.interval);
        }
    }

    stopLogSending() {
        clearInterval(this.interval);
    }

    emptyLogQueue() {
        this.pendingLogs = [];
    }

    flushLogs() {
        return this.sendLogs();
    }

    log(msg, optionalConfig) {
        let message = msg;

        if (!message) {
            console.error('A value must be provided');
            return;
        }

        const isArray = message instanceof Array;
        const testEl = isArray ? message[0] : message;
        const type = typeof testEl;

        if (type === 'undefined') {
            console.error('A value must be provided');
            return;
        }

        if (this.config.graphite && (!testEl.path || !testEl.value)) {
            console.error('Both \'path\' and \'value\' properties must be provided in the message object to send Graphite metrics');
            return;
        }

        if (type === 'object') {
            if (Object.keys(message).length === 0) {
                console.error('A non-empty JSON object must be provided');
                return;
            }
        }

        if (!isArray) {
            message = [message];
        }

        let ts = new Date();
        let sessKey = this.config.session;
        const client = { url: this.config.clientUrl };

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

        const timestamp = formatDate(ts);

        const messages = message.map((item) => {
            if (this.config.graphite) {
                return `${item.path} ${item.value} ${Math.round(ts.getTime() / 1000)}`;
            }
            if (this.config.raw) {
                return item;
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

        this.pendingLogs = this.pendingLogs.concat(messages);

        if (this.config.interval === 0) {
            return this.sendLogs();
        }
    }
}

module.exports = SumoLogger;
