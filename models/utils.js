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

var config = require('../config');
var log4js = require('log4js');
var _ = require('underscore');

var logParams = config.getLogOpt();
var log = log4js.getLogger(logParams.output);

module.exports.getPostgresType = function (type) {
  if (type === 'coords') {
    return 'geometry(Point,4326)';
  } else if (type === 'string' || type === 'stringOrList') {
    return 'text';
  } else if (type === 'integer') {
    return 'integer';
  } else if (type === 'float' || type === 'percent' || type === 'outcome') {
    return 'double precision';
  } else if (type === 'ISO8601' || type === 'timestamp') {
    return 'timestamp without time zone';
  } else if (type.startsWith('list')) {
    return this.getPostgresListType(type) + ' ARRAY';
  } else if (type === 'json') {
    return 'JSONB';
  } else if (type.startsWith('geojson')) {
    return 'geometry(' + this.getPostgresGeoJSONType(type) + ', 4326)';
  }
};

module.exports.getPostgresListType = function (type) {
  if (type === 'list' || type === 'list-string') {
    return 'text';
  } else if (type === 'list-numeric') {
    return 'numeric';
  }
};

module.exports.getPostgresGeoJSONType = function (type) {
  if (type === 'geojson-point')
    return 'Point';
  else if (type === 'geojson-line')
    return 'LineString';
  else if (type === 'geojson-polygon')
    return 'Polygon';
  else if (type === 'geojson-multipoint')
    return 'MultiPoint';
  else if (type === 'geojson-multiline')
    return 'MultiLineString';
  else if (type === 'geojson-multipolygon')
    return 'MultiPolygon';
  else if (type === 'geojson')
    return 'Geometry';
};

module.exports.getValueForType = function (value, type, outcome) {
  if (typeof value === 'string' && value.toLowerCase() === 'null') {
    return null;
  }

  if (type === 'coords') {
    var s = value;
    if(typeof value === 'object' && Array.isArray(value)){
      s = s.join(',');
    }
    s = s.split(',');
    return 'ST_SetSRID(ST_MakePoint(' + s[1].trim() + ',' + s[0].trim() + '), 4326)';

  } else if (type.startsWith('geojson')) {
    if (typeof value !== 'object') {
      value = JSON.parse(value);
    }

    if (!value.hasOwnProperty('type') || !value.hasOwnProperty('coordinates') || value.coordinates.constructor !== Array) {
      var errorMsg = type + ' isn\'t a valid GeoJSON';
      log.error(errorMsg);
      throw Error(errorMsg);
    }

    var postgresGeoJSONType = this.getPostgresGeoJSONType(type);
    if (type !== 'geojson' && value.type !== postgresGeoJSONType) {
      var errorMsg = type + ' isn\'t a valid ' + postgresGeoJSONType + ' GeoJSON';
      log.error(errorMsg);
      throw Error(errorMsg);
    }

    return 'ST_SetSRID(ST_GeomFromGeoJSON(\'' + JSON.stringify(value) + '\'), 4326)';
  } else if (type.startsWith('list')) {
    if (!Array.isArray(value)) {
      value = [];
    }

    var sep = '';
    var cast = ''; // Casting is necesary for empty arrays

    if (type === 'list' || type === 'list-string') {
      var sep = value.length ? '\'' : '';
      var cast = 'text';
    } else if (type === 'list-numeric') {
      var cast = 'numeric';
    }

    return 'ARRAY[' + sep + value.join(sep + ', ' + sep) + sep + ']::' + cast + '[]';
  } else if (type === 'ISO8601' || type === 'timestamp') {
    if (!value || value === '' || new Date(value) == 'Invalid Date') {
      return null;
    } else {
      return value;
    }
  } else if (type === 'string' || type === 'integer' || type === 'float') {
    return value;
  } else if (type === 'stringOrList') {
      if(typeof value === 'string'){
        return value;
      }
      else {
        if(!Array.isArray(value)){
          var errorMsg =  type + ' isn\'t a valid Array';
          log.error(errorMsg);
          throw Error(errorMsg);
        }
        return value[0];
      }

  } else if (type === 'json') {
    return JSON.stringify(value);
  } else if (type === 'percent') {
    return value * 100;

  } else if (type === 'outcome') {

    if(outcome && outcome.factor && outcome.operation){
      var operation = outcome.operation;
      if(operation==='SUM'){
        return value + outcome.factor;
      }
      else if(operation ==='PROD'){
        return value * outcome.factor;
      }
      else if(operation === 'MIN'){
        return value - outcome.factor;
      }
      else if(operation === 'DIV'){
        return value / outcome.factor;
      }
    }
    return value;


  } else {
    log.error('Unknown type: ' + type);
    throw Error('Unknown type: ' + type);
  }
};

module.exports.isTypeQuoted = function (type) {
  if (type === 'coords' || type.startsWith('geojson') || type.startsWith('list') || type === 'integer' || type === 'float' || type === 'percent' || type === 'outcome') {
    return false;
  } else if (type === 'string' || type === 'ISO8601' || type === 'timestamp' || type === 'json' || type === 'stringOrList') {
    return true;
  } else {
    log.error('Unknown type: ' + type);
    throw Error('Unknown type: ' + type);
  }
};

module.exports.wrapStrings = function (value, wrap) {
  if (wrap.length == 1) return [wrap[0], value, wrap[0]].join('');else if (wrap.length == 2) return [wrap[0], value, wrap[1]].join('');else {
    log.error('Wrap length must be 1 or 2');
    throw Error('Wrap length must be 1 or 2');
  }
};

module.exports.parseLatLon = function (subattr) {
  if (_.find(subattr, { namedb: 'lat', type: 'coords' }) && _.find(subattr, { namedb: 'lon', type: 'coords' }) && (!_.find(subattr, { name: 'position', type: 'coords' }) || !_.find(subattr, { namedb: 'position', type: 'coords' }))) {
    subattr.push({ name: 'position', type: 'coords', cartodb: true });
    subattr = _.without(subattr, _.find(subattr, { namedb: 'lat' }), _.find(subattr, { namedb: 'lon' }));
  }
  return subattr;
};
