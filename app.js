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

var log4js = require('log4js');
var schedule = require('node-schedule');
var config = require('./config');
var utils = require('./utils');
var ospath = require('path');
var log = utils.log();
var appDir = require('app-root-path').path;

const VERTICALS_DIR = './jobs/verticals';
const VERTICALS_SUBDIR = 'processing';
const jobsDir =  ospath.join(appDir, VERTICALS_DIR);

// Dynamic loading for job categories
var getClassJob = function(task) {
  console.log(task);

  try {
    let requireString = ospath.join(jobsDir, task.category, VERTICALS_SUBDIR, task.job) + '.js';
    try {
      return require(requireString);
    } catch (e) {
      log.warn(`File not found for importing it: ${ requireString }`);
      return undefined;
    }

  } catch (e) {
    log.warn(e);
    log.warn('Wrong kind of task:', task.importpath, task.job);
  }
};

//  Jobs
var Scheduler = function () {
    // Connector jobs
    if (config.getData().connectorJobs.active) {
      log.info('Listening to connector jobs');
      require('./jobs/connectorjob')();
    }

    var tasks = config.getData().tasksSchedule || [];
    tasks.forEach(function (taskConfig) {
      var classObj = getClassJob(taskConfig);

      if (classObj) {
        new classObj(taskConfig);
      } else {
        log.warn('Error creating queue for ' + taskConfig.job);
      }
    });
};

module.exports = Scheduler;
