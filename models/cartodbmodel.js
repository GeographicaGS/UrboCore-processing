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

var Carto = require('cartodb');
var config = require('../config');
var utils = require('../utils');
var log = utils.log();
var process = require('process');

function CartoModel(config) {
  this._user = config.user;
  this._apiKey = config.apiKey;
  this._enterprise = config.enterprise;
  this._sql = new Carto.SQL({
    user: config.user,
    api_key: config.apiKey,
    sql_api_url: 'https://' + config.user + '.carto.com/api/v2/sql'
  });
  this._squel = require('squel');
}

CartoModel.prototype.query = function (opts, cb) {
  var err = null;
  if (!opts) {
    err = 'No params';
  } else if (!opts.query) {
    err = 'No query';
  }

  opts.params = opts.params || {};

  if (err) {
    log.error(err);
    cb(err);
  } else {

      this._sql.execute(opts.query, opts.params)
      .done(function(data){
        if(cb){ return cb(null, data);}
      })
      .error(function(err){
          log.error(err);
          log.error(valueTemplate(opts.query, opts.params));
          if(cb){ return cb(err);}
      });

  }
};

CartoModel.prototype.promise_query = function(opts){

  var err = null;
  if (!opts) {
    err = 'No params';
  } else if (!opts.query) {
    err = 'No query';
  }

  opts.params = opts.params || {};

  if (err) {
    log.error(err);
    return Promise.reject(err);
  } else {
      return this._sql.execute(opts.query, opts.params);
  }

}

CartoModel.prototype.insert = function (table, data, dontquotedata, cb) {
  var constructor = this._squel.insert().into(table);
  for (var i in data) {
    constructor.set(utils.wrapStrings(i, ['"']), data[i]);
  }

  for (var i in dontquotedata) {
    constructor.set(utils.wrapStrings(i, ['"']), dontquotedata[i], {
      dontQuote: true });
  }

  var sql = constructor.toString() + ' ON CONFLICT DO NOTHING';
  this.query({ query: sql }, cb);
};

function valueTemplate(s, d) {
  for (var p in d) {
    s = s.replace(new RegExp('{' + p + '}', 'g'), d[p]);
  }
  return s;
}

module.exports = CartoModel;
