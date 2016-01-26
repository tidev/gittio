var fs = require('fs'),
  path = require('path');

var timodules = require('timodules'),
  _ = require('underscore'),
  chalk = require('chalk'),
  appc = require('appc-compat');

var logger = require('./logger');

var user_path = path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.gittio.json');

function readUser() {
  return fs.existsSync(user_path) ? require(user_path) : {};
}

function readDefault() {
  return require('../config.json');
}

function read() {
  return _.extend({}, readDefault(), readUser());
}

function writeUser(cfg) {
  fs.writeFileSync(user_path, JSON.stringify(cfg));
}

exports.set = function(key, value) {
  var defaultConfig = readDefault();

  if (defaultConfig[key] === undefined) {
    logger.error('Unknown configuration key: ' + key);
    return;
  }

  var userConfig = readUser();

  if (typeof value !== 'string') {
    delete userConfig[key];

  } else {

    if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    }

    if (typeof value !== typeof defaultConfig[key]) {
      logger.error('Invalid configuration value type: ' + (typeof value) + ' (should be: ' + (typeof defaultConfig[key]) + ')');
      return;
    }

    userConfig[key] = value;
  }

  writeUser(userConfig);
};

exports.list = function() {
  var cfg = read();
  var userConfig = readUser();

  console.log();

  _.each(cfg, function(val, key) {

    var color = (userConfig[key] !== undefined) ? 'green' : 'blue';

    console.log('  ' + chalk[color].bold(key));
    console.log('    ' + val);

  });
};

exports.init = function(params, callback) {

  // check the rc for the keys below and use them if they were not already defined
  var allowedRcKeys = ['alloyBase', 'platform'];
  var rcParams = require('rc')('gittio', {});
  allowedRcKeys.forEach(function(key) {
    if (params[key] === null && rcParams[key] !== null) {
      params[key] = rcParams[key];
    }
  });

  // export all the global config
  _.extend(exports, read());

  timodules.list(process.cwd(), function(err, res) {

    /*
     res = {
       path: String, // project root path
       current: [{name, version, platform}] //current modules from tiapp.xml
       modules: [{name, version, platform, scope}] // list of installed modules
       tiapp: tiapp xml as an object
     }
    */
    if (err) {

      if (_.isObject(err)) {
        err = err.toString();
      }

      if (err === 'Not Found') {

        if (!params.global) {
          logger.error("gittio must be run within a titanium project path if not using the --global flag");
          process.exit(1);
        } else {
          exports.context = 'global';
        }

      } else {

        if (err === true) {
          logger.error('Error running timodules.');

        } else {
          logger.error('Error running timodules: ' + err);

          if (/spawn (ti|appc) ENOENT/.test('spawn ti ENOENT')) {
            logger.error('You need either the Titanim or Appcelerator CLI to be installed:\n        [sudo] npm i -g titanium appcelerator');
          } else if (err.indexOf('[Error: Module version mismatch.]') !== -1) {
            logger.error('You need to rebuild the AppC/Titanium CLI after switching major NodeJS version:\n        [sudo] npm i -g titanium && appc use latest --force');
          } else if (err.indexOf('(node) sys is deprecated. Use util instead.') !== -1) {
            logger.error('You have a Titanium CLI hook that messes with the output. Please disable.');
          }
        }

        process.exit(1);
      }

    } else {
      exports.context = 'project';
    }

    // build paths
    if (exports.context === 'project') {
      var base = res.path;
      var alloy = path.join(base, params.alloyBase || 'app');
      var alloy_config_file = path.join(alloy, 'config.json');
      var deploymentTargets = [];

      res.tiapp.obj['ti:app']['deployment-targets'][0].target.forEach(function(t) {
        if (t._ === 'true') {
          var platform = t.$.device;
          if (platform === 'ipad' || platform === 'iphone') {
            if (deploymentTargets.indexOf('ios') !== -1) {
              return;
            }
            platform = 'ios';
          }
          deploymentTargets.push(platform);
        }
      });

      exports.base = base;
      exports.modules_path = path.join(base, 'modules');
      exports.widgets_path = path.join(alloy, 'widgets');
      exports.isAlloy = fs.existsSync(alloy_config_file);
      exports.targets = deploymentTargets;

      // alloy config
      if (exports.isAlloy) {
        try {
          exports.alloy_config_file = alloy_config_file;
          exports.alloy_config = require(alloy_config_file);
        } catch (e) {
          logger.error(e);
          process.exit(1);
        }
      }
    }

    exports.current_modules = res.current;
    exports.available_modules = res.modules;
    exports.tiapp = res.tiapp;

    appc.ti(['sdk', 'list', '-o', 'json'], function(err, stdout, stderr) {

      if (err) {
        logger.error('Failed to get Titanium SDK config: ' + stderr);
        process.exit(1);
      }

      exports.global_path = JSON.parse(stdout).defaultInstallLocation;
      // modules setup
      exports.global_modules_path = path.join(exports.global_path, "modules");

      callback();
    });
  });
};
