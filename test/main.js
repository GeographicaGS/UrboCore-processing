'use strict';

var request = require('supertest');
var dispatch = require('../jobs/queue').dispatch;
var cluster = require('cluster');
var should = require('chai').should();  // actually call the function
var process = require('process');

describe('MAIN', function() {
  var url;

  before(function(){
    this.timeout(0);
    dispatch(function(s){
      if(cluster.isWorker && cluster.worker.process.env.APIONLY) {
        if(s && s.address() && s.address().port)  {
          url = 'http://localhost:' + s.address().port;
        }
      }
    });
  });

  after(function(){
    process.send(-1);
  });

  it('active responds with 200', function(done) {
    this.timeout(0);
    if(cluster.isWorker && cluster.worker.process.env.APIONLY){
      request(url)
      .get('/active')
      .expect(200)
      .end(done);
    }
  });

  it('inactive responds with 200', function(done) {
    this.timeout(0);
    if(cluster.isWorker && cluster.worker.process.env.APIONLY){
      request(url)
      .get('/inactive')
      .expect(200)
      .end(done);
    }
  });

  it('complete responds with 200', function(done) {
    this.timeout(0);
    if(cluster.isWorker && cluster.worker.process.env.APIONLY){
      request(url)
      .get('/complete')
      .expect(200)
      .end(done);
    }
  });

  it('failed responds with 200', function(done) {
    this.timeout(0);
    if(cluster.isWorker && cluster.worker.process.env.APIONLY){
      request(url)
      .get('/failed')
      .expect(200)
      .end(done);
    }
  });

  it('delayed responds with 200', function(done) {
    this.timeout(0);
    if(cluster.isWorker && cluster.worker.process.env.APIONLY){
      request(url)
      .get('/delayed')
      .expect(200)
      .end(done);
    }
  });



});
