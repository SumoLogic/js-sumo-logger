describe("sumologic.logger", function() {
  var sumoTestEndpoint = '[Your HTTP source endpoint goes here]';
  var newEndpoint = 'https://service-events.sumologic.com/receiver/v1/newEndpoint';
  var value = 'testcookieval';
  var data = {'testingKey': 'isTestingKeyVal'};

  function resetCookie() {
    document.cookie = 'sumologic.logger.session=; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  }

  beforeEach(function() {
    resetCookie();
    SLLogger.config({endpoint: sumoTestEndpoint});
    SLLogger.setSession('testsession');
    jasmine.Clock.useMock();

    jasmine.Clock.tick(20);
  });

  afterEach(function() {
    SLLogger.reset();
    resetCookie();
  });

  it("core object exists", function() {
    expect(SLLogger).not.toBe(null);
  });

  it("sets and reads cookie", function() {
    SLLogger.setCookie(value);

    expect(document.cookie.indexOf(value)).toBeGreaterThan(-1);
    expect(document.cookie.indexOf('sumologic.logger.session')).toBeGreaterThan(-1);
    expect(SLLogger.getCookie()).toBe(value);
  });

  it("automatically sets UUID", function() {
    var uuid = SLLogger.session;

    expect(uuid).not.toBe(null);
    expect(document.cookie.indexOf(uuid)).toBeGreaterThan(-1);
    expect(SLLogger.getCookie()).toBe(uuid);
  });

  it("manually sets UUID", function() {
    var first = (Math.floor(Math.random() * 1000000000000)).toString();

    spyOn(SLLogger, 'setCookie').andCallThrough();
    SLLogger.setSession(first);

    expect(SLLogger.setCookie).toHaveBeenCalledWith(first);
    expect(SLLogger.session).toBe(first);
    expect(document.cookie.indexOf(first)).toBeGreaterThan(-1);
    expect(SLLogger.getCookie()).toBe(first);

    var second = (Math.floor(Math.random() * 1000000000000)).toString();
    SLLogger.setSession(second);
    expect(SLLogger.getCookie()).toBe(second);

    SLLogger.session = '';  // reset
  });

  it("maintains session id when no new session key is passed", function() {
    var uuid = SLLogger.session;
    SLLogger.setSession(); // second call that should be no op

    expect(SLLogger.getCookie()).toBe(uuid);

    SLLogger.session = '';
  });

  it("sets endpoint correctly", function() {
    var originalEndpoint = SLLogger.endpoint;

    spyOn(SLLogger, 'sendLogs');
    SLLogger.config({endpoint: newEndpoint});

    jasmine.Clock.tick(20);

    var ep = SLLogger.endpoint;
    expect(SLLogger.endpoint).toBe(newEndpoint);
    expect(SLLogger.sendLogs).not.toHaveBeenCalled();

    SLLogger.config({endpoint: originalEndpoint});  // put it back to original state
    jasmine.Clock.tick(20);

    expect(SLLogger.endpoint).toBe(originalEndpoint);
  });

  it("calls log properly when pushing JSON object", function() {
    spyOn(SLLogger, 'log');

    SLLogger.log(data);
    jasmine.Clock.tick(20);

    expect(SLLogger.log).toHaveBeenCalledWith(data);
  });

  it("sends a manually set timestamp as part of the log", function() {
    var ts = new Date();

    spyOn(SLLogger, 'log');

    var opts = {timestamp: ts};
    SLLogger.log(data.testingKey, opts);
    jasmine.Clock.tick(20);

    expect(SLLogger.log).toHaveBeenCalledWith(data.testingKey, opts);
  });

  it("calls log pushing a simple string", function() {
    spyOn(SLLogger, 'log');

    SLLogger.log(data.testingKey);
    jasmine.Clock.tick(20);

    expect(SLLogger.log).toHaveBeenCalledWith(data.testingKey);
  });

  it("does not call sendLogs when sent empty string or null", function() {
    spyOn(SLLogger, 'sendLogs');

    SLLogger.log('');
    jasmine.Clock.tick(20);

    expect(SLLogger.sendLogs).not.toHaveBeenCalled();

    SLLogger.log();
    jasmine.Clock.tick(20);

    expect(SLLogger.sendLogs).not.toHaveBeenCalled();
  });

  it("can instantiate additional loggers", function() {
    expect(SumoLogger).not.toBe(null);

    var localLogger = new SumoLogger();
    var originalEndpoint = SLLogger.endpoint;

    localLogger.config({endpoint: newEndpoint});
    jasmine.Clock.tick(20);

    expect(localLogger.endpoint).toBe(newEndpoint);
    expect(SLLogger.endpoint).not.toBe(newEndpoint);
    expect(SLLogger.endpoint).toBe(originalEndpoint);

    spyOn(localLogger, 'log');
    spyOn(SLLogger, 'sendLogs');

    localLogger.log(data);
    jasmine.Clock.tick(20);

    expect(localLogger.log).toHaveBeenCalledWith(data);
    expect(SLLogger.sendLogs).not.toHaveBeenCalled()
  });

});
