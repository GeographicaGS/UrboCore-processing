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

var process = require('process');
var config = require('../config');
var _ = require('underscore');
var moment = require('moment-timezone');
var cluster = require('cluster');
var parser = require('cron-parser');
var RecurrenceRule = require('node-schedule').RecurrenceRule;
var utils = require('../utils');
var log = utils.log();

// Singleton Object Queue
var queue = require('kue').createQueue();

module.exports.translatedToTimezone= function(spec, timezone){
  return spec;
  var localizedScheduler = parser.parseExpression(spec, {"tz": timezone});
  var rule = JSON.parse(JSON.stringify(localizedScheduler._fields));
  return rule;
}

// Add jobs to a queue
var _addJob = function (jobType, jobTitle, jobData) {
  jobData.title = jobTitle;
  var job = queue.create(jobType, jobData)
  .removeOnComplete(jobData.removeOnComplete)
  .save(function (err) {
    if (err) {
      log.error(`Error while adding a '${ jobType }' job`);
    }

    log.debug(`job ${job.id}: type '${jobType}' - title '${jobTitle}' ADDED`);
  });

  return job;
};

module.exports._addJob = _addJob;

var addJob = function (mainTask, jobData) {
  jobData.date = new moment().utc().format();
  jobData.removeOnComplete = jobData.removeOnComplete || true;
  _addJob(mainTask, `${ jobData.type } for ${ jobData.idScope }`, jobData);
};
module.exports.addJob = addJob;

module.exports.notifyToMaster = function (target, name, descriptor) {
  if (cluster.isWorker) {
    process.send(cluster.worker.id);
    return descriptor;
  }
};

module.exports.kueued = function(task){
  return function(target, name, descriptor) {

    if(cluster.isWorker){
      if(!process.env.APIONLY){

        var worker = _.findWhere(queue.workers, {"type": task});
        if(typeof worker==='undefined'){
          log.info("Starting out", task, "queue for worker", cluster.worker.id);
          queue.process(task, function (job, done) {
            descriptor.value(job, done);
          });
        }
      }

      return descriptor;
    }

  }
}

module.exports.populated = function(target, name, descriptor){
  if(target.populated){
    return descriptor;
  }
  else {
    log.warn("Not populated yet. Skipping execution for", name);
  }
}
