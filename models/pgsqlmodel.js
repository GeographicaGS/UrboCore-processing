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

var config = require('../config');
var pg = require('pg');
var utils = require('../utils');
var log = utils.log();

function PGSQLModel(config) {
  this._config = config;
  this._squel = require('squel');
}

PGSQLModel.prototype.insertBatch = function (table, data, cb) {
  if (!data || data.isArray && data.length == 0) {
    log.warn('Trying to insert data with no data. Ignoring.');
    return;
  }

  var sql = this._squel.insert().into(table).setFieldsRows(data).toString();
  this._connect(function (err, client, done) {
    if (err) {
      log.error("Cannot connect to Psql");
      log.error(err);
      if (cb) {
        cb(err);
      }
      return;
    }

    client.query(sql, function (err, r) {
      done();

      if (err) {
        log.error(sql);
        log.error('Error when inserting data');
        log.error(err);
      }

      if (cb) {
        cb(err, r);
      }
    });
  });
};

PGSQLModel.prototype.insert = function (table, data, dontquotedata, cb) {
  var constructor = this._squel.insert().into(table);
  for (var i in data) {
    constructor.set(utils.wrapStrings(i, ['"']), data[i]);
  }

  for (var i in dontquotedata) {
    constructor.set(utils.wrapStrings(i, ['"']), dontquotedata[i], {
      dontQuote: true
    });
  }

  var sql = constructor.toString() + ' ON CONFLICT DO NOTHING';
  this._connect(function (err, client, done) {
    if (err) {
      log.error("Cannot connect to Psql");
      log.error(err);
      if (cb) {
        cb(err);
      }
      return;
    }

    client.query(sql, function (err, r) {
      done();

      if (err) {
        log.error(sql);
        log.error('Error when inserting data');
        log.error(err);
      }

      if (cb) {
        cb(err, r);
      }
    });
  });
};

PGSQLModel.prototype.update = function (table, data, cb) {
  if (!data || data.isArray && data.length == 0) {
    log.warn('Trying to update data with no data. Ignoring.');
    return;
  }

  var sql = this._squel.update().table(table).setFields(data).toString();

  this._connect(function (err, client, done) {
    if (err) {
      log.error("Cannot connect to Psql");
      log.error(err);
      if (cb) {
        cb(err);
      }
      return;
    }

    client.query(sql, function (err, r) {
      done();
      if (err) {
        log.error('Error when updating data');
        log.error(err);
      }
      if (cb) cb(err, r);
    });
  });
};

PGSQLModel.prototype._connect = function (cb) {
  pg.connect(this._config, cb);
};

PGSQLModel.prototype.query = function (sql, bindings, cb) {

  this._connect(function (err, client, done) {
    if (err) {
      log.error("Cannot connect to Psql");
      log.error(err);
      if (cb) {
        cb(err);
      }
      return;
    }

    client.query(sql, bindings, function (err, r) {
      done();

      if (err) {
        log.error('Error executing query: ' + sql);
        log.error(err);
      }

      if (cb) {
        cb(err, r);
      }
    });
  });
};

PGSQLModel.prototype.promise_query = function(sql, bindings){
  return new Promise((function(resolve, reject){
    this._connect(function(err, client, done){
      if(err) return reject(err);
      client.query(sql, bindings, function(err, r){
        done();
        if(err){
          log.error('Error executing query: ', err);
          log.error(sql);
          return reject(err);
        }
        return resolve(r);
      })
    })
  }).bind(this));
}

module.exports = PGSQLModel;
