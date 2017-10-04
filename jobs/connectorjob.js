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

var cluster = require('cluster');
var process = require('process');
var config = require('../config');
var queueInstance = require('./queue');
var SubscriptionsModel = require('../models/subscriptionsmodel');
var SubscriptionsCartoDBModel = require('../models/subscriptionscartodbmodel');
var util = require('util');
var utils = require('../utils');
var log = utils.log();

var pgsqlConfig = config.getData().pgsql;
var cartoConfig = config.getData().cartodb;
var connectorConfig = config.getData().connectorJobs;

// Singleton Object Queue
var queue = require('kue').createQueue();

var insertData = function (job, done) {
  try {
    var jobInfo = `job ${ job.id }: type '${ job.type }' - title '${ job.data.title }'`;  // For logging

    var model = null;
    var destination = null;
    if (job.type === 'connectorPsql') {
      model = new SubscriptionsModel(pgsqlConfig);
      destination = 'PGSQL';

    } else {
      var currentCartoConfig = cartoConfig.accounts[job.data.cartoUser];
      if (currentCartoConfig) {
        currentCartoConfig.user = job.data.cartoUser;
        model = new SubscriptionsCartoDBModel(currentCartoConfig);
        destination = 'CARTO';

      } else {
        var msg = `Carto account '${job.data.cartoUser}' not found in the configuration file`;
        log.error(`${ jobInfo } FAILED: ${msg} at worker ${ cluster.worker.id }`);
        var err = new Error(msg);
        return done(err);
      }
    }

    model.storeData(job.data.subscription, job.data.contextResponses, function (err) {
      if (err) {
        log.error(`${ jobInfo } FAILED: Error inserting at ${ destination } at worker ${ cluster.worker.id }`);
        return done(err);
      }

      log.debug(`${ jobInfo } DONE at worker ${ cluster.worker.id }`);
      return done();
    });
  } catch (err) {
    var jobInfo = `job ${ job.id }: type '${ job.type }' - title '${ job.data.title }'`;  // For logging
    log.error(`Cannot insert data ${ err }`);
    log.error(`${ jobInfo } at worker ${ cluster.worker.id }`);
    log.error(JSON.stringify(job));
    return done(err);
  }

  // Notify to master
  process.send(cluster.worker.id);
};

var connectorJob = function () {

  if (cluster.isWorker) {
    if(!process.env.APIONLY) {
      queue.process('connectorPsql', connectorConfig.psqlConcurrency, function (job, done) {
        insertData(job, done);
      });

      if (cartoConfig.active) {
        queue.process('connectorCarto', connectorConfig.cartoConcurrency, function (job, done) {
          insertData(job, done);
        });
      }
    }
  }
};

module.exports = connectorJob;
