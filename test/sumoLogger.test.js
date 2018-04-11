const SumoLogger = require('../src/sumoLogger');
const axios = require('axios');

const onSuccessSpy = sinon.spy();
const onErrorSpy = sinon.spy();

const endpoint = 'endpoint';
const message = 'message';
const timestamp = new Date();
const sessionKey = 'abcd1234';

const sandbox = sinon.sandbox.create();

describe('sumoLogger', () => {
    beforeEach(() => {
        sandbox.stub(axios, 'post');
        sandbox.spy(console, 'error');
    });

    afterEach(() => {
        onSuccessSpy.resetHistory();
        onErrorSpy.resetHistory();
        sandbox.restore();
    });

    describe('log()', () => {
        it('should send a plain text message', () => {
            const logger = new SumoLogger({ endpoint });

            const body = JSON.stringify({
                msg: message,
                sessionId: sessionKey,
                timestamp: timestamp.toUTCString(),
                url: ''
            });

            logger.log(message, {
                timestamp,
                sessionKey
            });

            expect(axios.post).to.have.been.calledWithExactly(
                endpoint,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        });

        it('should send a message object', () => {
            const logger = new SumoLogger({ endpoint });

            logger.log({ key: 'value' }, {
                timestamp,
                sessionKey,
                url: 'url'
            });

            const body = JSON.stringify({
                sessionId: sessionKey,
                timestamp: timestamp.toUTCString(),
                url: 'url',
                key: 'value'
            });

            expect(axios.post).to.have.been.calledWithMatch(
                endpoint,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        });

        it('should send a message array', () => {
            const logger = new SumoLogger({ endpoint });

            const body = JSON.stringify({
                msg: message,
                sessionId: sessionKey,
                timestamp: timestamp.toUTCString(),
                url: ''
            });

            logger.log([message], {
                timestamp,
                sessionKey
            });

            expect(axios.post).to.have.been.calledWithMatch(
                endpoint,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        });

        it('should extend headers if they exist in the config', () => {
            const sourceName = 'sourceName';
            const sourceCategory = 'sourceCategory';
            const hostName = 'hostName';

            const logger = new SumoLogger({
                endpoint,
                sourceName,
                sourceCategory,
                hostName
            });

            const body = JSON.stringify({
                msg: message,
                sessionId: sessionKey,
                timestamp: timestamp.toUTCString(),
                url: ''
            });

            logger.log(message, {
                timestamp,
                sessionKey
            });

            expect(axios.post).to.have.been.calledWithMatch(
                endpoint,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Sumo-Name': sourceName,
                        'X-Sumo-Category': sourceCategory,
                        'X-Sumo-Host': hostName
                    }
                }
            );
        });

        it('should set the graphite header if graphite enabled', () => {
            const logger = new SumoLogger({
                endpoint,
                graphite: true
            });

            logger.log(
                {
                    path: 'graphite.metric.path',
                    value: 100
                },
                {
                    timestamp,
                    sessionKey
                }
            );

            expect(axios.post).to.have.been.calledWithMatch(
                endpoint,
                `graphite.metric.path 100 ${Math.round(timestamp.getTime() / 1000)}`,
                {
                    headers: {
                        'Content-Type': 'application/vnd.sumologic.graphite'
                    }
                }
            );
        });

        it('should send correctly formated graphite metrics if graphite enabled', () => {
            const logger = new SumoLogger({
                endpoint,
                graphite: true
            });
            const expectedTimestamp = Math.round(timestamp / 1000);

            logger.log({
                path: 'graphite.metric.path',
                value: 100
            }, { timestamp });

            expect(axios.post).to.have.been.calledWithMatch(
                endpoint,
                `graphite.metric.path 100 ${expectedTimestamp}`
            );
        });

        it('should send correctly formatted graphite metrics in batch', () => {
            const logger = new SumoLogger({
                endpoint,
                graphite: true
            });
            const expectedTimestamp = Math.round(timestamp / 1000);

            logger.log(
                [
                    {
                        path: 'graphite.metric.path',
                        value: 100
                    },
                    {
                        path: 'another.graphite.metric.path',
                        value: 50
                    }
                ],
                {
                    timestamp
                }
            );

            expect(axios.post).to.have.been.calledWithMatch(
                endpoint,
                `graphite.metric.path 100 ${expectedTimestamp}\nanother.graphite.metric.path 50 ${expectedTimestamp}`
            );
        });

        it('should call the onSuccess callback if the request succeeds', (done) => {
            axios.post.resolves({ status: 200 });

            const logger = new SumoLogger({
                endpoint,
                onSuccess: onSuccessSpy
            });

            logger.log(message);

            setTimeout(() => {
                expect(onSuccessSpy).to.have.been.calledOnce;
                done();
            }, 10);
        });

        it('should call the onError callback if an error object is returned', (done) => {
            axios.post.rejects(new Error('unavailable'));

            const logger = new SumoLogger({
                endpoint,
                onError: onErrorSpy
            });

            logger.log(message);

            setTimeout(() => {
                expect(onErrorSpy).to.have.been.calledWith('unavailable');
                done();
            }, 10);
        });
    });

    describe('updateConfig()', () => {
        it('should update the instance config with the new values', (done) => {
            const logger = new SumoLogger({ endpoint });

            const body = JSON.stringify({
                msg: message,
                sessionId: sessionKey,
                timestamp: timestamp.toUTCString(),
                url: ''
            });

            logger.updateConfig({
                endpoint: 'newendpoint',
                sourceCategory: 'newSourceCategory',
                interval: 10
            });

            logger.log(message, {
                timestamp,
                sessionKey
            });

            setTimeout(() => {
                expect(axios.post).to.have.been.calledWithMatch(
                    'newendpoint',
                    body,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Sumo-Category': 'newSourceCategory'
                        }
                    }
                );
                logger.stopLogSending();
                done();
            }, 20);
        });

        it('should not update config if allowed values are not provided', () => {
            const logger = new SumoLogger({ endpoint });

            const body = JSON.stringify({
                msg: message,
                sessionId: sessionKey,
                timestamp: timestamp.toUTCString(),
                url: ''
            });

            logger.updateConfig({
                randomProperty: 'randomValue'
            });

            logger.log(message, {
                timestamp,
                sessionKey
            });

            expect(axios.post).to.have.been.calledWithMatch(
                endpoint,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        });

        it('should not update config if no values are not provided', () => {
            const logger = new SumoLogger({ endpoint });

            const body = JSON.stringify({
                msg: message,
                sessionId: sessionKey,
                timestamp: timestamp.toUTCString(),
                url: ''
            });

            logger.updateConfig({});

            logger.log(message, {
                timestamp,
                sessionKey
            });

            expect(axios.post).to.have.been.calledWithMatch(
                endpoint,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        });
    });

    describe('emptyLogQueue()', () => {
        it('should not send request if log queue has been cleared', (done) => {
            const logger = new SumoLogger({
                endpoint,
                interval: 10
            });

            logger.log(message, {
                timestamp,
                sessionKey
            });

            logger.emptyLogQueue();

            setTimeout(() => {
                logger.stopLogSending();
                expect(axios.post).to.not.have.been.called;
                done();
            }, 20);
        });
    });

    describe('flushLogs()', () => {
        it('should send any queued logs', () => {
            const logger = new SumoLogger({
                endpoint,
                interval: 10
            });

            logger.log(message);

            expect(axios.post).to.not.have.been.called;

            logger.flushLogs();

            expect(axios.post).to.have.been.calledOnce;

            logger.stopLogSending();
        });
    });

    describe('error logging', () => {
        it('no options', () => {
            const logger = new SumoLogger();
            logger.log();
            expect(console.error).to.have.been.calledWith('Sumo Logic Logger requires you to set an endpoint.');
        });

        it('no options endpoint property', () => {
            const logger = new SumoLogger({});
            logger.log();
            expect(console.error).to.have.been.calledWith('Sumo Logic Logger requires you to set an endpoint.');
        });

        it('undefined options endpoint property', () => {
            const logger = new SumoLogger({ endpoint: undefined });
            logger.log();
            expect(console.error).to.have.been.calledWith('Sumo Logic Logger requires you to set an endpoint.');
        });

        it('empty options endpoint property', () => {
            const logger = new SumoLogger({ endpoint: '' });
            logger.log();
            expect(console.error).to.have.been.calledWith('Sumo Logic Logger requires you to set an endpoint.');
        });

        it('no message passed to log', () => {
            const logger = new SumoLogger({ endpoint });
            logger.log();
            expect(console.error).to.have.been.calledWith('Sumo Logic Logger requires that you pass a value to log.');
        });

        it('empty message array passed to log', () => {
            const logger = new SumoLogger({ endpoint });
            logger.log([]);
            expect(console.error).to.have.been.calledWith('Sumo Logic Logger requires that you pass a value to log.');
        });

        it('empty message object passed to log', () => {
            const logger = new SumoLogger({ endpoint });
            logger.log({});
            expect(console.error).to.have.been.calledWith('Sumo Logic Logger requires that you pass a non-empty JSON object to log.');
        });

        it('required graphite message properties not provided', () => {
            const logger = new SumoLogger({
                endpoint,
                graphite: true
            });
            logger.log({
                incorrect: 'value'
            });
            expect(console.error).to.have.been.calledWith('Sumo Logic requires both \'path\' and \'value\' properties to be provided in the message object');
        });
    });
});
