var path = require('path'),
    config = require('./config'),
    alloy = require('./alloy'),
    component = require('./component'),
    tiapp = require('./tiapp'),
    rimraf = require('rimraf'),
    logger = require('./logger'),
    _ = require('underscore'),
    fs = require('fs-extra'),
    async = require('async');

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
      target = _.find(info.versions, function(v) { return v.version === o.version;});
      if (!target) {
        logger.error("Invalid version " + o.version + " for " + o.id);
        return;
      }
    } else { // use latest version
      target = _.first(info.versions);
    }

    var trgPath, installed;
    if (info.type === 'widget') {
      trgPath = path.join(config.widgets_path , o.id);
      installed = fs.existsSync(trgPath) && 
        (o.version === undefined || config.alloy_config.dependencies[o.id] === o.version)
    } else {
      if (o.global) {
        trgPath = config.global_modules_path;
      } else {
        trgPath = path.join(config.modules_path);
      }
      // installed only true if module is installed for all platforms, project and global
      installed = _.reduce(target.platforms, function(memo, _platform) {
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
      logger.warn(o.id + " already installed");
      return;
    }

    logger.debug('Downloading ' + o.id + '@' + target.version);
    component.download(target.dist, function(err, tmpPath) {

      if (err) {
        logger.error(err);
        return;
      }

      logger.debug('Installing ' + o.id + '@' + target.version);
      fs.mkdirs(trgPath, function(err) {

        if (err) {
          logger.error(err);
          return;
        }

        var srcPath;
        if (info.type === "widget") {
          var repo = target.path.split("-")[0];
          var commit = _.last(target.dist.split("/")).slice(0,-4);
          srcPath = path.join(tmpPath, repo + "-" + commit);
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
            tiapp.addDependency(o.id, target.version, target.platforms);
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
      },o));
    }
  });
  async.parallel(tasks);
}

function info(id) {
  component.lookup(id, function(err, info) {
    if (err) {
      logger.error(err);
      return;
    }
    console.log(JSON.stringify(info, null, "  "));
  });
}




exports.install = install;
exports.info = info;
