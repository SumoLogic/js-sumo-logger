const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

global.chai = chai;
global.sinon = sinon;
global.expect = chai.expect;
