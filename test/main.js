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
