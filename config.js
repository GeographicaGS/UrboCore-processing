'use strict';

var fs = require('fs');
var yaml = require('js-yaml');
var _ = require('underscore');


var walk = require('walk');
var appDir = require('app-root-path').path;
var ospath = require('path');

// Logs params
var LOG_LEVELS = ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF'];
var LOG_OUTPUTS = ['console', 'file', 'dailyRotatingFile', 'sizeRotatingFile'];

// Log folders structure
var LOG_DEFAULT_DIR = './logs';

var LOG_DEFAULT_FILENAME = 'the_log';
var LOG_DEFAULT_MAX_SIZE = 20;
var LOG_DEFAULT_OLD_FILES = 5;

function Config() {
  this._data = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));

  // Set default params
  var pgsql = this._data.pgsql;
  if (pgsql) {
    // Set default params for Carto
    if (!pgsql.hasOwnProperty('port') || !pgsql.port) {
      pgsql.port = 5432;
    }
  }

  this.getData = function () {
    return this._data;
  };

  this.createFolderSync = function(folder) {
    fs.existsSync(folder) || fs.mkdirSync(folder);
  };

  this.getLogOpt = function() {
    // Config vars
    var _logging = this._data.logging;
    var _file = _logging && _logging.file ? _logging.file : null;
    var _access = _logging && _logging.access ? _logging.access : null;

    // Filename vars
    var fileDir = _file && _file.dir ? _file.dir : LOG_DEFAULT_DIR;
    var suffixFilename = _file && _file.name ? _file.name : LOG_DEFAULT_FILENAME;
    suffixFilename = `${ fileDir }/${ suffixFilename }`;

    var errorFilename = `${ suffixFilename }-errors.log`;
    var filename = `${ suffixFilename }.log`;

    // Appenders definition
    var fileErrorAppender = {
      type: 'logLevelFilter',
      level: 'ERROR',
      appender: {
        type: 'file',
        filename: errorFilename
      }
    };

    var logAppenderConsole = [
      {
        type: 'console'
      }
    ];

    var logAppenderFile =  [
      {
        type: 'file',
        filename: filename
      }
    ];

    var logAppenderDailyRotatingFile = [
      {
        type: 'dateFile',
        filename: filename,
        pattern: '.yyyy-MM-dd'
      }
    ];

    var logAppenderSizeRotatingFile = [
      {
        type: 'file',
        filename: filename,
        maxLogSize: Math.pow((_file && _file.maxSize ? _file.maxSize : LOG_DEFAULT_MAX_SIZE) * 1024, 2),
        numBackups: _file && _file.oldFiles ? _file.oldFiles : LOG_DEFAULT_OLD_FILES
      }
    ];

    if (_file && _file.separateError) {
      logAppenderFile.push(fileErrorAppender);
      logAppenderDailyRotatingFile.push(fileErrorAppender);
      logAppenderSizeRotatingFile.push(fileErrorAppender);
    }

    // log4js parameters definition
    var logParams = {
      output: LOG_OUTPUTS[0],
      level: LOG_LEVELS[3],
      access: { level: LOG_LEVELS[3] },
      logappenders: logAppenderConsole
    };

    // Reading from config file
    if (_logging) {
      if (_logging.level && _.contains(LOG_LEVELS, _logging.level)) {
        logParams.level = _logging.level;
      }

      if (_access && _access.level && _.contains(LOG_LEVELS, _access.level)) {
        logParams.access.level = _access.level;
      }

      if (_access && _access.format) {
        logParams.access.format = _access.format;
      }

      if (_access && _access.nolog) {
        logParams.access.nolog = _access.nolog;
      }

      if (_logging.output && _logging.output.endsWith('ile')) {
        this.createFolderSync(fileDir);
        logParams.output = _logging.output;

        if (_logging.output === 'file') {
          logParams.logappenders = logAppenderFile;

        } else if (_logging.output === 'dailyRotatingFile') {
          logParams.logappenders = logAppenderDailyRotatingFile;

        } else if (_logging.output === 'sizeRotatingFile') {
          logParams.logappenders = logAppenderSizeRotatingFile;
        }

        // Creating a message for the console
        errorFilename = _file && _file.separateError ? ' & ' + errorFilename : '';
        logParams.consoleMessage = `Logging into files: ${ filename }${ errorFilename }`;
      }
    }

    return logParams;
  };

}

module.exports = new Config();
