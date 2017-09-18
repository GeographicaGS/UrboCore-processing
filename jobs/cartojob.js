'use strict';

var BaseJob = require('./basejob');

class CartoJob extends BaseJob {

  constructor(cfg){
    super(cfg);
  }

  // No op for table
  createTable(data){
    return Promise.resolve([true]);
  }

  // No table to create
  getCreateTable(data){
    return "SELECT 1";
  }

}


module.exports = CartoJob;