var os = require('os'),
  path = require('path'),
  fs = require('fs-extra'),
  logger = require('./logger'),
  request = require('request'),
  _ = require('underscore'),
  utils = require('./utils'),
  config = require('./config');

exports.lookup = function(id, callback, options) {
  options = options || {};
  var prefix = utils.prefix(id);

  if (!options.silent) {
    logger.info(prefix + ' searching...');
  }

  var url = 'http://registry.gitt.io/' + id;

  if (options.action) {
    url += '?action=' + options.action;
  }

  request(url, function(error, response, body) {

    if (!error && response.statusCode == 200) {
      var cmp = JSON.parse(body);

      if (cmp.error) {
        callback(prefix + ' ' + cmp.error, null);
        return;
      }

      // prepare for new types to be added
      if (cmp.type !== 'widget' && cmp.type !== 'module') {
        callback(prefix + ' unsupported type: ' + cmp.type);
        return;
      }

      callback(null, cmp);

    } else {
      callback(prefix + ' error contacting registry', null);
    }
  });
};

exports.filterDists = function(cmp, o) {
  var platforms, dists = [];

  // split platforms given
  if (o.platform) {
    platforms = o.platform.split(',');

    // use dpeloymentTargets found in tiapp.xml
  } else {
    platforms = config.targets;
  }

  var platform;

  // while we have platforms to cover
  while ((platform = platforms.shift()) !== undefined) {

    // find first version that..
    var version = _.find(cmp.versions, function(v) {

      // has a dist if no version was asked
      // or matches version if asked
      // and matches platform
      return ((o.version === undefined && v.dist) || v.version === o.version) && _.contains(v.platforms, platform);

    });

    var prefix = utils.prefix(cmp.id, o.version, platform);

    // specific version not found
    if (!version && o.version) {
      logger.error(prefix + ' not found');
      continue;
    }

    // no distributable version found
    if (!version || !version.dist) {
      logger.error(prefix + ' no distributable available');
      continue;
    }

    // init paths
    if (cmp.type == 'widget') {
      version.trgPath = path.join(config.widgets_path, cmp.id);

      if (version.path.length > 0) {
        version.srcPath = path.join(cmp.repo + "-" + version.tree, version.path);
      } else {
        version.srcPath = path.join(cmp.repo + "-" + version.tree);
      }

    } else {
      version.trgPath = o.global ? config.global_modules_path : config.modules_path;
      version.srcPath = 'modules';
    }

    // remove the platforms this dist covers from our wanted-list
    platforms = _.difference(platforms, version.platforms);

    dists.push(version);

    // for widgets we only do one
    if (cmp.type === 'widget') {
      break;
    }
  }

  return dists;
};