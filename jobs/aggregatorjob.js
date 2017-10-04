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

//////////////////////////////////////
// NOT IN USE AND PROBABILY DEPRECATED
//////////////////////////////////////

'use strict';

var async = require('async');
var process = require('process');
var config = require('../config');
var moment = require('moment-timezone');
var PGSQLModel = require('../models/pgsqlmodel');
var queueInstance = require('./queue');
var util = require('util');
var cluster = require('cluster');
var utils = require('../utils');
var log = utils.log();

var addJob = require('./common').addJob;
var _addJob = require('./common')._addJob;

var pgsqlConfig = config.getData().pgsql;
var queue = require('kue').createQueue();

var mainJobType = 'aggregatorWatcher';
var moderateJobType = 'aggregatorTablesChecker';
var hardJobType = 'aggregatorCalculator';

if (!cluster.isMaster) {
  if(!process.env.APIONLY){

    queue.process(mainJobType, function (job, done) {
      checkAggregates(job, done);
    });

    queue.process(moderateJobType, function (job, done) {
      getAggregatesToDo(job, done);
    });

    queue.process(hardJobType, function (job, done) {
      aggegateVariable(job, done);
    });
  }
}

var checkAggregates = function (job, done) {
  var client = new PGSQLModel(pgsqlConfig);
  var sql = ['SELECT dbschema AS "schemaName", table_name AS "tableName",', 'table_name_agg AS "tableNameAgg",', 'json_object_agg(entity_field, processing_agg) AS "processingAgg"', 'FROM metadata.variables_scopes vs', 'INNER JOIN metadata.scopes s ON vs.id_scope = s.id_scope', 'INNER JOIN metadata.entities_scopes es', 'ON vs.id_scope = es.id_scope AND vs.id_entity = es.id_entity', 'WHERE processing_agg IS NOT NULL', 'GROUP BY s.dbschema, es.table_name, table_name_agg;'];

  client.query(sql.join(' '), [], function (err, data) {
    if (err) {
      var errorMessage = '\'' + job.type + '\' with ID \'' + job.id + '\' failed: ' + err;
      log.error(errorMessage);
      return done(new Error(errorMessage));
    }

    // Each row is a different table of a scope
    data.rows.forEach(function (row) {
      job.log(row.schemaName + ' ' + row.tableName + ' ' + JSON.stringify(row.processingAgg));
      var title = row.schemaName + '.' + row.tableName;
      _addJob(moderateJobType, title, row);
    });

    log.debug('\'' + job.type + '\' with ID \'' + job.id + '\' done');
    return done();
  });
};

// Checking what aggreations we need to do per table
var getAggregatesToDo = function (job, done) {
  var jsonbs = [];
  for (var key in job.data.processingAgg) {
    jsonbs.push(key + ' jsonb,');
  }

  var client = new PGSQLModel(pgsqlConfig);
  var sqlTableExists = [util.format('SELECT to_regclass(\'%s.%s\');', job.data.schemaName, job.data.tableNameAgg)];

  var sqlCreateTable = [util.format('CREATE TABLE %s.%s (', job.data.schemaName, job.data.tableNameAgg), '"TimeInstant" timestamp without time zone NOT NULL,', 'periodicity character varying(64) NOT NULL,', 'id_entity character varying(64) NOT NULL,', 'created_at timestamp without time zone', 'DEFAULT timezone(\'utc\'::text, now()),', jsonbs.join(' '), 'PRIMARY KEY ("TimeInstant", periodicity, id_entity)', ') WITH ( OIDS = FALSE );', util.format('ALTER TABLE %s.%s', job.data.schemaName, job.data.tableNameAgg), util.format('OWNER TO %s;', pgsqlConfig.user)];
  // TODO: Do we need to add indeces?

  var sqlLastTime = ['SELECT json_object_agg(d.periodicity, d."TimeInstant") AS "startDates"', 'FROM (SELECT periodicity, MAX("TimeInstant") AS "TimeInstant"', util.format('FROM %s.%s', job.data.schemaName, job.data.tableNameAgg), 'GROUP BY periodicity) d;'];

  async.waterfall([
  // Check if the table exists
  function (cb) {
    client.query(sqlTableExists.join(' '), [], function (err, data) {
      if (err) {
        return cb(err);
      }

      return cb(null, data.rows[0].to_regclass);
    });
  },

  // Create table if it didn't exist
  function (tableName, cb) {
    if (tableName != null) {
      // Table already exists
      return cb(null, false);
    }

    client.query(sqlCreateTable.join(' '), [], function (err, data) {
      if (err) {
        cb(err);
      }

      return cb(null, true);
    });
  },

  // Get last timestamp for each periodicty
  function (tableCreated, cb) {
    var processingAgg = tranformAggObject(job.data.processingAgg);

    if (tableCreated) {
      var defaultStartDate = '2016-01-01';
      var startDates = {};

      for (var periodicity in processingAgg) {
        startDates[periodicity] = defaultStartDate;
      }

      return cb(null, processingAgg, startDates);
    } else {
      client.query(sqlLastTime.join(' '), [], function (err, data) {
        if (err) {
          cb(err);
        }

        return cb(null, processingAgg, data.rows[0].startDates);
      });
    }
  }

  // Create aggreations jobs per periodicty
  ], function (err, processingAgg, startDates) {
    if (err) {
      var errorMessage = '\'' + job.type + '\' with ID \'' + job.id + '\' failed: ' + err;
      log.error(errorMessage);
      return done(new Error(errorMessage));
    }

    for (var periodicity in processingAgg) {
      job.log(job.data.schemaName + ' ' + job.data.tableNameAgg + ' ' + periodicity + ' ' + JSON.stringify(processingAgg[periodicity]));

      var title = job.data.schemaName + '.' + job.data.tableNameAgg + '.' + periodicity;

      var data = {
        schemaName: job.data.schemaName,
        tableName: job.data.tableName,
        tableNameAgg: job.data.tableNameAgg,
        periodicity: periodicity,
        startDate: startDates[periodicity],
        processingAgg: processingAgg[periodicity]
      };

      _addJob(hardJobType, title, data);
    }

    log.debug('\'' + job.type + '\' with ID \'' + job.id + '\' done');
    return done();
  });
};

// Calculating aggegations per table and periodicity
var aggegateVariable = function (job, done) {
  var client = new PGSQLModel(pgsqlConfig);

  // Getting the SQL's JSON statements
  var asJSONSs = [];
  for (var varName in job.data.processingAgg) {
    var sqlJSON = 'json_build_object(';
    var keyValues = [];
    for (var agg of job.data.processingAgg[varName]) {
      keyValues.push('\'' + agg + '\', ' + agg + '(' + varName + ')');
    }
    keyValues = keyValues.join(', ');

    sqlJSON += keyValues + ') AS ' + varName;
    asJSONSs.push(sqlJSON);
  }

  // Getting the where statements for null data
  var whereNotNull = [];
  for (var varName in job.data.processingAgg) {
    whereNotNull.push(varName + ' IS NOT NULL');
  }
  whereNotNull = whereNotNull.join(' AND ');

  var sqlAgg = ['WITH _dq AS', util.format('(SELECT * FROM %s.%s', job.data.schemaName, job.data.tableName), util.format('WHERE "TimeInstant" BETWEEN \'%s\'', job.data.startDate), '::timestamp AND now()::timestamp)', util.format('INSERT INTO %s.%s', job.data.schemaName, job.data.tableNameAgg), util.format('SELECT (_ts + \'%s\')::timestamp AS "TimeInstant",', job.data.periodicity), util.format('\'%s\'::text AS periodicity,', job.data.periodicity), 'id_entity, now()::timestamp AS created_at,', asJSONSs.join(', '), util.format('FROM generate_series(\'%s\'::timestamp,', job.data.startDate), util.format('now()::timestamp, \'%s\') AS _ts', job.data.periodicity), 'INNER JOIN _dq ON _dq."TimeInstant"', util.format('BETWEEN _ts AND (_ts + \'%s\')::timestamp', job.data.periodicity), util.format('WHERE (_ts + \'%s\')::timestamp < now()::timestamp', job.data.periodicity), util.format('AND %s', whereNotNull), 'GROUP BY _ts, id_entity', 'ORDER BY _ts;'];

  client.query(sqlAgg.join(' '), [], function (err, data) {
    if (err) {
      var errorMessage = '\'' + job.type + '\' with ID \'' + job.id + '\' failed: ' + err;
      log.error(errorMessage);
      return done(new Error(errorMessage));
    }

    log.debug('\'' + job.type + '\' with ID \'' + job.id + '\' done');
    return done();
  });
};

/*
 * This functon transform this object:
 *   {battery: {weekly: ['MAX', 'MIN'],
 *              montly: ['MAX', 'MIN']},
 *    temperature: {weekly: ['MAX', 'MIN', 'AVG']}}
 * into this one:
 *   {weekly: {battery: ['MAX', 'MIN'],
 *             temperature: ['MAX', 'MIN', 'AVG']},
 *    montly: {battery: ['MAX', 'MIN']}}
 */
var tranformAggObject = function (aggObject) {
  var varNames = Object.keys(aggObject);
  var periodicities = [];
  for (var varName of varNames) {
    for (var periodicity in aggObject[varName]) {
      periodicities.push(periodicity);
    }
  }

  periodicities = Array.from(new Set(periodicities));
  var processingAgg = {};
  for (var periodicity of periodicities) {
    processingAgg[periodicity] = {};
    for (var varName of varNames) {
      if (periodicity in aggObject[varName]) {
        processingAgg[periodicity][varName] = aggObject[varName][periodicity];
      }
    }
  }

  return processingAgg;
};

module.exports = function (jobData) {
  addJob(mainJobType, jobData);
};

// Maybe we'll need this
// var sqlColumnExists = ['SELECT TRUE',
//                         'FROM pg_attribute',
//                         util.format('WHERE  attrelid = \'%s.%s\'::regclass',
//                                     job.data.schemaName,
//                                     job.data.tableNameAgg),
//                          util.format('AND attname = \'%s\'',
//                                      job.data.varName),
//                          'AND NOT attisdropped;'];
// var sqlCreateColumn = [util.format('ALTER TABLE %s.%s', job.data.schemaName,
//                                    job.data.tableNameAgg),
//                         util.format('ADD COLUMN "%s" jsonb;',
//                                     job.data.varName)];
//                        // TODO: Do we need to add indeces?
