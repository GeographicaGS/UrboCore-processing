'use strict';

var log4js = require('log4js');
var schedule = require('node-schedule');
var config = require('./config');
var utils = require('./utils');
var ospath = require('path');
var log = utils.log();
var appDir = require('app-root-path').path;

const VERTICALS_DIR = './jobs/verticals'
const jobsDir =  ospath.join(appDir, VERTICALS_DIR);

// Dynamic loading for job categories
var getClassJob = function(task) {

  console.log(task);

  try {
    var classObj = require(ospath.join(jobsDir, task.importpath, task.job));
    return classObj;

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
      // Both, master and worker, create the JobObject, but only the master will schedule the jobs
      var classObj = getClassJob(taskConfig);
      if(classObj) { var classJ = new classObj(taskConfig);}
      else { log.warn("Error creating queue for " + taskConfig.job); }
    });
};

module.exports = Scheduler;
