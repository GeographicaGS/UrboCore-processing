'use strict';

var cluster = require('cluster');
var config = require('../config');
var kue = require('kue');
var os = require('os');
var _ = require('underscore');
var process = require('process');
var utils = require('../utils');
var log = utils.log();

var redisConfig = config.getData().redis;
var maxRuns = config.getData().maxRuns || 200;
var clusterWorkerSize = os.cpus().length;

var removeJob = function (id, result, status) {
  kue.Job.get(id, function (err, job) {
    if(job) {
      try {
        job.remove(function (err) {
          if (err) {
            log.error(`${ status } job '${ job.id }' could not be removed`);
          }
        });
      } catch (e){
        log.error('Couldnt delete job', job.id, ':', e);
      }

    }
  });
};

var orderedStop = function() {
  for(var id in cluster.workers){
    cluster.workers[id].kill();
  }
  process.exit(0);
}

var dispatch = function(cb){
  log.info('Starting queue...');
  var queue = kue.createQueue({
    redis: {
      host: redisConfig.host,
      port: redisConfig.port,
      db: redisConfig.db,
      auth: redisConfig.password
    }
  });
  log.info('Queue created and connected to Redis');

  queue.setMaxListeners(0);

  if (cluster.isMaster) {
    var forked = {};
    // Forks first a process mostly for REST API
    var api = cluster.fork({'APIONLY': true});
    forked[api.id] = 0;
    for (var i = 0; i < clusterWorkerSize; i++) {
      var worker = cluster.fork();
      forked[worker.id] = 0;
    }

    cluster.on('message', function (worker) {
      if(worker === -1) {
        orderedStop()
      }
      else {
        forked[worker]++;
        if (forked[worker] >= maxRuns) {
          for (var id in cluster.workers) {
            if (id == worker) {
              log.info('Max runs reached for fork', worker, '. Re-forking.');
              cluster.workers[id].kill();
            }
          }
        }
      }
    });

    cluster.on('fork', function (worker) {
      log.info('Worker %d forked (%d runs)', worker.id, forked[worker.id]);
      log.debug(forked);

      queue.active( function( err, ids ) {
        ids.forEach( function( id ) {
          kue.Job.get( id, function( err, job ) {
            // Your application should check if job is a stuck one
            if(job){
              if(!job.toJSON().progress){
                job.inactive(function(){
                  job.active(function(){
                    job.inactive();
                  })
                });
              }
            }

          });
        });
      });

      // Cleanup completed jobs
      queue.complete( function( err, ids ) {
        ids.forEach( function( id ) {
          removeJob(id, null, 'complete');
        });
      });
    });

    cluster.on('exit', function (worker, code, signal) {
      log.info('Worker %d died (%s). Restarting...', worker.id, signal || code);
      delete forked[worker.id];
      if(worker.id==api.id){
        var worker = cluster.fork({'APIONLY': true});
        api = worker;
      } else {
        var worker = cluster.fork();
      }
      forked[worker.id] = 0;
    });

    queue.on('job failed', function (id, result) {
      log.error(`Failed job: ${ result }`);
    });

    queue.on('job complete', function(id, result) {
      removeJob(id, result, 'completed');
    });

    queue.on('error', function (err) {
      log.error('ERROR PROCESSING QUEUE: ', err);
    });

  } else if (cluster.isWorker) {
     var s = kue.app.listen(3000, function() {
       log.info('Starting out API REST...');
       if(cb) cb(s);
     });
  }

}

module.exports.dispatch = dispatch;
