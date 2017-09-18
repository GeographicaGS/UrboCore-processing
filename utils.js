'use strict';

var config = require('./config');
var log = require('log4js');

module.exports.error = function (msg, status) {
  var err = new Error(msg);
  err.status = status || 500;
  return err;
};

var _log = function () {
  var logParams = config.getLogOpt();
  return log.getLogger(logParams.output);
};

module.exports.log = _log;

module.exports.wrapStrings = function (value, wrap) {
  if (wrap.length == 1) {
    return [wrap[0], value, wrap[0]].join('');
  } else if (wrap.length == 2) {
    return [wrap[0], value, wrap[1]].join('');
  } else {
    _log.error('Wrap length must be 1 or 2');
    throw Error('Wrap length must be 1 or 2');
  }
};
