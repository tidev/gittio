var path = require('path'),
  config = require('./config'),
  alloy = require('./alloy'),
  component = require('./component'),
  tiapp = require('./tiapp'),
  rimraf = require('rimraf'),
  logger = require('./logger'),
  _ = require('underscore'),
  fs = require('fs-extra'),
  utils = require('./utils');
async = require('async');

function uninstall(o) {

  if (!_uninstallWidget(o)) {
    _uninstallModule(o);
  }
}

function _uninstallWidget(o) {
  var trgPath = path.join(config.widgets_path, o.id);
  var installed = fs.existsSync(trgPath) && (o.version === undefined || config.alloy_config.dependencies[o.id] === o.version);
  var prefix = o.id + (o.version ? '@' + o.version : '');

  if (installed) {
    rimraf.sync(trgPath);
    alloy.dropDependency(o.id, o.version);

    logger.info(prefix + ' uninstalled');

    return true;
  }

  return false;
}

function _uninstallModule(o) {
  var trgPath = o.global ? config.global_modules_path : path.join(config.modules_path);
  var uninstalled = false;

  config.current_modules.map(function(m) {
    var platform = (o.platform ? o.platform.replace("ios","iphone") : undefined)
    if (m.name === o.id && (o.version === undefined || o.version === m.version) && (platform === undefined || platform === m.platform)) {
      tiapp.dropDependency(o.id, o.version, platform);
      rimraf.sync(path.join(trgPath, m.platform, m.name));

      logger.info(m.name + (m.version ? '@' + m.version : '') + ' uninstalled');

      uninstalled = true;
    }

  });

  if (!uninstalled) {
    logger.error(o.id + (o.version ? '@' + o.version : '') + ' not found');
  }
}

function install(o) {

  if (o.id) {
    return _installSingle(o);
  } else {
    return _installAll(o);
  }
}

function _installSingle(o) {
  component.lookup(o.id, function(err, info) {
    if (err) {
      logger.error(err);
      return;
    }

    var target;
    if (o.version && o.version !== '*') {
      target = _.find(info.versions, function(v) {
        return v.version === o.version
          && (o.platform === undefined || _.contains(v.platforms, o.platform));
          // not checking for dist here so appropriate error message is returned later
      });
      if (!target) {
        logger.error("Invalid version " + o.version + " for " + o.id +
                     (o.platform ? " for " + o.platform : ""));
        return;
      }
    } else { // use latest version with dist
      target = _.find(info.versions, function(v) {
        return typeof v.dist != null && (o.platform === undefined || _.contains(v.platforms, o.platform));
      });
    }

    var trgPath, installed;
    if (info.type === 'widget') {
      trgPath = path.join(config.widgets_path, o.id);
      installed = fs.existsSync(trgPath) &&
        (o.version === undefined || require(path.join(trgPath,'widget.json')).version === o.version);
    } else {
      if (o.global) {
        trgPath = config.global_modules_path;
      } else {
        trgPath = path.join(config.modules_path);
      }
      // installed only true if module is installed for all platforms, project and global
      var target_platforms = o.platform ? [o.platform] : (target.platforms || []);
      installed = _.reduce(target_platforms, function(memo, _platform) {
        var platform = _platform.replace("ios", "iphone");
        var available = config.available_modules;

        function check(scope) {
          return available[scope] && available[scope][platform] &&
            available[scope][platform][o.id] && available[scope][platform][o.id][target.version];
        }
        return memo && (check('project') || check('global'));
      }, true);
    }

    if (installed && !o.force) {
      logger.warn(o.id + '@' + target.version + ' already installed');
      if (info.type === "module") {
        tiapp.addDependency(o.id, target.version, target_platforms);
      } else if (info.type === "widget") {
        alloy.addDependency(o.id, target.version, target_platforms);
      }
      return;
    }

    if (!target || target.dist === null) {
        logger.error(o.id + (o.version ? '@' + o.version : "") + 
                     " distributable" + (o.platform ? " for " + o.platform : "") + 
                     " not available in the repository.");
        return;
    }

    logger.info(o.id + '@' + target.version + ' downloading...');
    component.download(target.dist, function(err, tmpPath) {

      if (err) {
        logger.error(err);
        return;
      }

      logger.info(o.id + '@' + target.version + ' installing...');
      fs.mkdirs(trgPath, function(err) {

        if (err) {
          logger.error(err);
          return;
        }

        var srcPath;
        if (info.type === "widget") {
          var repo = target.path.split("-")[0];
          var commit = _.last(target.dist.split("/")).slice(0, -4);
          var subpath = target.path.split("/").splice(1);
          if (subpath.length > 0) {
            srcPath = path.join(tmpPath, repo + "-" + commit, subpath.join(path.sep));
          } else {
            srcPath = path.join(tmpPath, repo + "-" + commit);
          }
        } else { //native module
          srcPath = path.join(tmpPath, 'modules');
        }

        fs.copy(srcPath, trgPath, function(err) {

          if (err) {
            logger.error(err);
            return;
          }

          if (info.type === 'widget') {
            alloy.addDependency(o.id, o.version || target.version);
          } else {
            tiapp.addDependency(o.id, target.version, target_platforms);
          }

          rimraf.sync(tmpPath);
          logger.info(o.id + '@' + target.version + ' installed');
          return;
        });
      });
    });
  });
}

function _installAll(o) {
  async.parallel([
    _.bind(_installAllWidgets, undefined, o),
    _.bind(_installAllModules, undefined, o)
  ]);
}

function _installAllWidgets(o) {

  if (config.isAlloy) {
    var data = config.alloy_config;

    if (data.dependencies) {
      var tasks = [];

      _.each(data.dependencies, function(version, widget) {
        tasks.push(function() {
          install(_.extend({
            id: widget,
            version: version
          }, o));
        });
      });

      async.parallel(tasks);
    }
  }
}

function _installAllModules(o) {
  var tasks = config.current_modules.map(function(m) {
    return function() {
      install(_.extend({
        id: m.name,
        version: m.version
      }, o));
    };
  });
  async.parallel(tasks);
}

function info(id,options) {
  component.lookup(id, function(err, info) {
    if (err) {
      logger.error(err);
      return;
    }
    if (options.output === "json") {
      console.log(JSON.stringify(info));
    } else {
      utils.prettyJSON(info);
      console.log('');
    }
  }, options.output === "json"); // silent logging
}

exports.install = install;
exports.uninstall = uninstall;
exports.info = info;
