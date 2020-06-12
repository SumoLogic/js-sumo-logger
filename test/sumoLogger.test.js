jest.mock('superagent', () => {
  const superagentPostMock = {
    sendRejects: false,
    sendThrowsError: false,
    rejectingError: new Error('Rejecting...'),
    throwingError: new Error('Throwing...'),
    post: jest.fn().mockImplementation(() => superagentPostMock),
    set: jest.fn().mockImplementation(() => superagentPostMock),
    send: jest.fn().mockImplementation(() => {
      if (superagentPostMock.sendRejects) {
        return Promise.reject(superagentPostMock.rejectingError);
      } else if (superagentPostMock.sendThrowsError) {
        throw superagentPostMock.throwingError;
      } else {
        return Promise.resolve({
          body: '',
          status: 200,
          res: { statusMessage: '' },
          xhr: {},
        });
      }
    }),
  };

  return superagentPostMock;
});
jest.spyOn(console, 'error').mockImplementation();

const superagent = require('superagent');
const SumoLogger = require('../src/sumoLogger');
const formatDate = require('../src/formatDate');

const onSuccessSpy = jest.fn();
const onErrorSpy = jest.fn();
const onPromiseReturnSpy = jest.fn();

const endpoint = 'endpoint';
const message = 'message';
const timestamp = new Date();
const sessionKey = 'abcd1234';

describe('sumoLogger', () => {
  afterEach(() => {
    superagent.post.mockClear();
    superagent.set.mockClear();
    superagent.send.mockClear();
    onSuccessSpy.mockClear();
    onErrorSpy.mockClear();
    onPromiseReturnSpy.mockClear();
    console.error.mockClear();
  });

  describe('log()', () => {
    it('should send a plain text message', () => {
      const logger = new SumoLogger({ endpoint });

      const body = JSON.stringify({
        msg: message,
        sessionId: sessionKey,
        timestamp: formatDate(timestamp),
        url: '',
      });

      logger.log(message, {
        timestamp,
        sessionKey,
      });

      expect(superagent.post).toHaveBeenCalledWith(endpoint);
      expect(superagent.set).toHaveBeenCalledWith({
        'Content-Type': 'application/json',
        'X-Sumo-Client': 'sumo-javascript-sdk',
      });
      expect(superagent.send).toHaveBeenCalledWith(body);
    });

    it('should send a message object', () => {
      const logger = new SumoLogger({ endpoint });

      logger.log(
        { key: 'value' },
        {
          timestamp,
          sessionKey,
          url: 'url',
        }
      );

      const body = JSON.stringify({
        sessionId: sessionKey,
        timestamp: formatDate(timestamp),
        url: 'url',
        key: 'value',
      });

      expect(superagent.post).toHaveBeenCalledWith(endpoint);
      expect(superagent.set).toHaveBeenCalledWith({
        'Content-Type': 'application/json',
        'X-Sumo-Client': 'sumo-javascript-sdk',
      });
      expect(superagent.send).toHaveBeenCalledWith(body);
    });

    it('should send a message array', () => {
      const logger = new SumoLogger({ endpoint });

      const body = JSON.stringify({
        msg: message,
        sessionId: sessionKey,
        timestamp: formatDate(timestamp),
        url: '',
      });

      logger.log([message], {
        timestamp,
        sessionKey,
      });

      expect(superagent.post).toHaveBeenCalledWith(endpoint);
      expect(superagent.set).toHaveBeenCalledWith({
        'Content-Type': 'application/json',
        'X-Sumo-Client': 'sumo-javascript-sdk',
      });
      expect(superagent.send).toHaveBeenCalledWith(body);
    });

    it('should extend headers if they exist in the config', () => {
      const sourceName = 'sourceName';
      const sourceCategory = 'sourceCategory';
      const hostName = 'hostName';

      const logger = new SumoLogger({
        endpoint,
        sourceName,
        sourceCategory,
        hostName,
      });

      const body = JSON.stringify({
        msg: message,
        sessionId: sessionKey,
        timestamp: formatDate(timestamp),
        url: '',
      });

      logger.log(message, {
        timestamp,
        sessionKey,
      });

      expect(superagent.post).toHaveBeenCalledWith(endpoint);
      expect(superagent.set).toHaveBeenCalledWith({
        'X-Sumo-Client': 'sumo-javascript-sdk',
        'Content-Type': 'application/json',
        'X-Sumo-Name': sourceName,
        'X-Sumo-Category': sourceCategory,
        'X-Sumo-Host': hostName,
      });
      expect(superagent.send).toHaveBeenCalledWith(body);
    });

    it('should set the graphite header if graphite enabled', () => {
      const logger = new SumoLogger({
        endpoint,
        graphite: true,
      });

      logger.log(
        {
          path: 'graphite.metric.path',
          value: 100,
        },
        {
          timestamp,
          sessionKey,
        }
      );

      expect(superagent.post).toHaveBeenCalledWith(endpoint);
      expect(superagent.set).toHaveBeenCalledWith({
        'X-Sumo-Client': 'sumo-javascript-sdk',
        'Content-Type': 'application/vnd.sumologic.graphite',
      });
      expect(superagent.send).toHaveBeenCalledWith(
        `graphite.metric.path 100 ${Math.round(timestamp.getTime() / 1000)}`
      );
    });

    it('should send correctly formated graphite metrics if graphite enabled', () => {
      const logger = new SumoLogger({
        endpoint,
        graphite: true,
      });
      const expectedTimestamp = Math.round(timestamp / 1000);

      logger.log(
        {
          path: 'graphite.metric.path',
          value: 100,
        },
        { timestamp }
      );

      expect(superagent.post).toHaveBeenCalledWith(endpoint);
      expect(superagent.send).toHaveBeenCalledWith(
        `graphite.metric.path 100 ${expectedTimestamp}`
      );
    });

    it('should send correctly formatted graphite metrics in batch', () => {
      const logger = new SumoLogger({
        endpoint,
        graphite: true,
      });
      const expectedTimestamp = Math.round(timestamp / 1000);

      logger.log(
        [
          {
            path: 'graphite.metric.path',
            value: 100,
          },
          {
            path: 'another.graphite.metric.path',
            value: 50,
          },
        ],
        {
          timestamp,
        }
      );

      expect(superagent.post).toHaveBeenCalledWith(endpoint);
      expect(superagent.send).toHaveBeenCalledWith(
        `graphite.metric.path 100 ${expectedTimestamp}\nanother.graphite.metric.path 50 ${expectedTimestamp}`
      );
    });

    it('should send a single log message exactly as provided if raw option enabled', () => {
      const logger = new SumoLogger({
        endpoint,
        raw: true,
      });

      logger.log(message, {
        timestamp,
        sessionKey,
      });

      expect(superagent.post).toHaveBeenCalledWith(endpoint);
      expect(superagent.set).toHaveBeenCalledWith({
        'Content-Type': 'application/json',
        'X-Sumo-Client': 'sumo-javascript-sdk',
      });
      expect(superagent.send).toHaveBeenCalledWith(message);
    });

    it('should send an array of log messages exactly as provided if raw option enabled', () => {
      const logger = new SumoLogger({
        endpoint,
        raw: true,
      });

      logger.log([message], {
        timestamp,
        sessionKey,
      });

      expect(superagent.post).toHaveBeenCalledWith(endpoint);
      expect(superagent.set).toHaveBeenCalledWith({
        'Content-Type': 'application/json',
        'X-Sumo-Client': 'sumo-javascript-sdk',
      });
      expect(superagent.send).toHaveBeenCalledWith(message);
    });

    it('should send logs when batchSize is reached', () => {
      const logger = new SumoLogger({ endpoint, batchSize: 2000 });
      const msgs = [];

      for (let i = 0; i < 10; i++) {
        let msg = new Array(20).fill(`${message}0${i}`);
        msgs.push(msg);
      }

      msgs.forEach((mess) => {
        logger.log(mess, {
          timestamp,
          sessionKey,
        });
      });

      const isReady = logger.batchReadyToSend();
      expect(isReady).toEqual(true);
    });

    it('should hit the returnPromise promise then handler if the request succeeds', (done) => {
      const logger = new SumoLogger({
        endpoint,
      });

      const prom = logger.log(message);
      prom.then(() => {
        onPromiseReturnSpy();
      });

      setTimeout(() => {
        expect(onPromiseReturnSpy).toHaveBeenCalledTimes(1);
        done();
      }, 10);
    });

    it('should hit the returnPromise promise catch handler if the request fails', (done) => {
      superagent.sendRejects = true;

      const logger = new SumoLogger({
        endpoint,
      });

      const prom = logger.log(message);
      prom
        .then(() => {
          onPromiseReturnSpy();
        })
        .catch((ex) => {
          onErrorSpy(ex);
        });

      setTimeout(() => {
        expect(onErrorSpy).toHaveBeenCalledTimes(1);
        superagent.sendRejects = false;
        done();
      }, 10);
    });

    it('should call the onSuccess callback if the request succeeds and returnPromise is false', (done) => {
      const logger = new SumoLogger({
        endpoint,
        returnPromise: false,
        onSuccess: onSuccessSpy,
      });

      logger.log(message);

      setTimeout(() => {
        expect(onSuccessSpy).toHaveBeenCalledTimes(1);
        done();
      }, 10);
    });

    it('should call the onError callback if an error object is returned and returnPromise is falsed', (done) => {
      superagent.sendRejects = true;

      const logger = new SumoLogger({
        endpoint,
        returnPromise: false,
        onError: onErrorSpy,
      });

      logger.log(message);

      setTimeout(() => {
        expect(onErrorSpy).toHaveBeenCalledWith(superagent.rejectingError);
        superagent.sendRejects = false;
        done();
      }, 10);
    });

    it('should pass the entire error object if an unexpected error is encountered', (done) => {
      superagent.sendThrowsError = true;

      const logger = new SumoLogger({
        endpoint,
        onError: onErrorSpy,
      });

      logger.log(message);

      setTimeout(() => {
        expect(onErrorSpy).toHaveBeenCalledWith(superagent.throwingError);
        superagent.sendThrowsError = false;
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
        timestamp: formatDate(timestamp),
        url: '',
      });

      logger.updateConfig({
        endpoint: 'newendpoint',
        sourceCategory: 'newSourceCategory',
        interval: 10,
      });

      logger.log(message, {
        timestamp,
        sessionKey,
      });

      setTimeout(() => {
        expect(superagent.post).toHaveBeenCalledWith('newendpoint');
        expect(superagent.set).toHaveBeenCalledWith({
          'Content-Type': 'application/json',
          'X-Sumo-Category': 'newSourceCategory',
          'X-Sumo-Client': 'sumo-javascript-sdk',
        });
        expect(superagent.send).toHaveBeenCalledWith(body);
        logger.stopLogSending();
        done();
      }, 20);
    });

    it('should not update config if allowed values are not provided', () => {
      const logger = new SumoLogger({ endpoint });

      const body = JSON.stringify({
        msg: message,
        sessionId: sessionKey,
        timestamp: formatDate(timestamp),
        url: '',
      });

      logger.updateConfig({
        randomProperty: 'randomValue',
      });

      logger.log(message, {
        timestamp,
        sessionKey,
      });

      expect(superagent.post).toHaveBeenCalledWith(endpoint);
      expect(superagent.set).toHaveBeenCalledWith({
        'Content-Type': 'application/json',
        'X-Sumo-Client': 'sumo-javascript-sdk',
      });
      expect(superagent.send).toHaveBeenCalledWith(body);
    });

    it('should not update config if no values are not provided', () => {
      const logger = new SumoLogger({ endpoint });

      const body = JSON.stringify({
        msg: message,
        sessionId: sessionKey,
        timestamp: formatDate(timestamp),
        url: '',
      });

      logger.updateConfig({});

      logger.log(message, {
        timestamp,
        sessionKey,
      });

      expect(superagent.post).toHaveBeenCalledWith(endpoint);
      expect(superagent.set).toHaveBeenCalledWith({
        'Content-Type': 'application/json',
        'X-Sumo-Client': 'sumo-javascript-sdk',
      });
      expect(superagent.send).toHaveBeenCalledWith(body);
    });
  });

  describe('emptyLogQueue()', () => {
    it('should not send request if log queue has been cleared', (done) => {
      const logger = new SumoLogger({
        endpoint,
        interval: 10,
      });

      logger.log(message, {
        timestamp,
        sessionKey,
      });

      logger.emptyLogQueue();

      setTimeout(() => {
        logger.stopLogSending();
        expect(superagent.post).toHaveBeenCalledTimes(0);
        done();
      }, 20);
    });
  });

  describe('flushLogs()', () => {
    it('should send any queued logs', () => {
      const logger = new SumoLogger({
        endpoint,
        interval: 10,
        batchSize: 100000,
      });

      logger.log(message);

      expect(superagent.post).toHaveBeenCalledTimes(0);

      logger.flushLogs();

      expect(superagent.post).toHaveBeenCalledTimes(1);

      logger.stopLogSending();
    });
  });

  describe('error logging', () => {
    it('no options', () => {
      const logger = new SumoLogger();
      logger.log();
      expect(console.error).toHaveBeenCalledWith(
        'An endpoint value must be provided'
      );
    });

    it('no options endpoint property', () => {
      const logger = new SumoLogger({});
      logger.log();
      expect(console.error).toHaveBeenCalledWith(
        'An endpoint value must be provided'
      );
    });

    it('undefined options endpoint property', () => {
      const logger = new SumoLogger({ endpoint: undefined });
      logger.log();
      expect(console.error).toHaveBeenCalledWith(
        'An endpoint value must be provided'
      );
    });

    it('empty options endpoint property', () => {
      const logger = new SumoLogger({ endpoint: '' });
      logger.log();
      expect(console.error).toHaveBeenCalledWith(
        'An endpoint value must be provided'
      );
    });

    it('no message passed to log', () => {
      const logger = new SumoLogger({ endpoint });
      logger.log();
      expect(console.error).toHaveBeenCalledWith('A value must be provided');
    });

    it('empty message array passed to log', () => {
      const logger = new SumoLogger({ endpoint });
      logger.log([]);
      expect(console.error).toHaveBeenCalledWith('A value must be provided');
    });

    it('empty message object passed to log', () => {
      const logger = new SumoLogger({ endpoint });
      logger.log({});
      expect(console.error).toHaveBeenCalledWith(
        'A non-empty JSON object must be provided'
      );
    });

    it('required graphite message properties not provided', () => {
      const logger = new SumoLogger({
        endpoint,
        graphite: true,
      });
      logger.log({
        incorrect: 'value',
      });
      expect(console.error).toHaveBeenCalledWith(
        'Both "path" and "value" properties must be provided in the message object to send Graphite metrics'
      );
    });

    it('should not not throw an error if falsy parameters are provided', () => {
      const logger = new SumoLogger({
        endpoint,
        graphite: true,
      });
      logger.log({
        path: '/this/is/a/path',
        value: 0,
      });
      expect(console.error).toHaveBeenCalledTimes(0);
    });
  });
});
