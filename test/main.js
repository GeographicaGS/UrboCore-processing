'use strict';

var request = require('supertest');
var dispatch = require('../jobs/queue').dispatch;
var cluster = require('cluster');
var should = require('chai').should();  // actually call the function
var process = require('process');

describe('MAIN', function() {
  var url;
  var jobBody = {
      type: 'connectorPsql',
      data: {
         title: 'lighting_stcabinet_state to PSQL',
         "contextResponses":[
            {
               "contextElement":{
                  "type":"ht_6",
                  "isPattern":"false",
                  "id":"sepulveda-01",
                  "attributes":[
                     {
                        "name":"energyConsumed",
                        "type":"Number",
                        "value":"0",
                        "metadatas":[
                           {
                              "name":"TimeInstant",
                              "type":"DateTime",
                              "value":"2017-01-17T11:30:30.828Z"
                           },
                           {
                              "name":"dateUpdated",
                              "type":"DateTime",
                              "value":"2017-01-17T11:30:30.828Z"
                           },
                           {
                              "name":"uom",
                              "type":"Text",
                              "value":"kVArh"
                           }
                        ]
                     },
                     {
                        "name":"reactiveEnergyConsumed",
                        "type":"Number",
                        "value":"0",
                        "metadatas":[
                           {
                              "name":"TimeInstant",
                              "type":"DateTime",
                              "value":"2017-01-17T11:30:30.837Z"
                           },
                           {
                              "name":"dateUpdated",
                              "type":"DateTime",
                              "value":"2017-01-17T11:30:30.837Z"
                           },
                           {
                              "name":"uom",
                              "type":"Text",
                              "value":"kVArh"
                           }
                        ]
                     },
                     {
                        "name":"timeInstant",
                        "type":"DateTime",
                        "value":"2017-01-17T11:30:30.876Z"
                     },
                     {
                        "name":"totalActivePower",
                        "type":"Number",
                        "value":"0",
                        "metadatas":[
                           {
                              "name":"TimeInstant",
                              "type":"DateTime",
                              "value":"2017-01-17T11:30:30.818Z"
                           },
                           {
                              "name":"dateUpdated",
                              "type":"DateTime",
                              "value":"2017-01-17T11:30:30.818Z"
                           }
                        ]
                     }
                  ]
               },
               "statusCode":{
                  "code":"200",
                  "reasonPhrase":"OK"
               }
            }
         ],
         "subscription":{
            "id":"lighting_stcabinet_state",
            "subservice_id":"lighting_simulations",
            "schemaname":"distrito_telefonica",
            "subsduration":"P8M",
            "substhrottling":"PT0S",
            "fetchDataOnCreated":false,
            "entityTypes":[
               {
                  "typeName":"ht_6"
               }
            ],
            "mode":"append",
            "attributes":[
               {
                  "name":"timeInstant",
                  "namedb":"TimeInstant",
                  "type":"ISO8601",
                  "indexdb":true,
                  "cartodb":true,
                  "constraint":true
               },
               {
                  "name":"energyConsumed",
                  "namedb":"energyconsumed",
                  "type":"float",
                  "cartodb":true
               },
               {
                  "name":"reactiveEnergyConsumed",
                  "namedb":"reactiveenergyconsumed",
                  "type":"float",
                  "cartodb":true
               },
               {
                  "name":"totalActivePower",
                  "namedb":"totalactivepower",
                  "type":"float",
                  "cartodb":true
               }
            ],
            "trigger_attributes":[
               "totalActivePower"
            ]
         }
      },
      options:{
         attempts: 3,
         priority: 'critical'
      }
   }

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

  it('adding a new job, responds with 200 and should be created', function(done){
    this.timeout(0);
    if(cluster.isWorker && cluster.worker.process.env.APIONLY) {
      request(url)
      .post('/job')
      .send(jobBody)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(function(res){
        res.body.should.be.a('object');
        res.body.should.have.property('message');
        res.body.should.have.property('id');
        res.body.message.should.be.equal('job created');
      })
      .end(done);
    }
  });

});
