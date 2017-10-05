// Copyright 2017 Telefónica Digital España S.L.
// 
// This file is part of UrboCore Processing.
// 
// UrboCore Processing is free software: you can redistribute it and/or
// modify it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// UrboCore Processing is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
// General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with UrboCore Processing. If not, see http://www.gnu.org/licenses/.
// 
// For those usages not covered by this license please contact with
// iot_support at tid dot es

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
