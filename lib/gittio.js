var os = require('os'),
    path = require('path'),
    config = require('./config'),
    alloy = require('./alloy'),
    tiapp = require('./tiapp'),
    request = require('request'),
    rimraf = require('rimraf'),
    logger = require('./logger'),
    ghdownload = require('github-download'),
    _ = require('underscore'),
    fs = require('fs-extra'),
    async = require('async'),
    AdmZip = require('adm-zip'),

    // TODO: Show progress bar when requesting from registry and github
    ProgressBar = require('progress');

function install(o) {

  if (o.id) {
    return _installSingle(o);
  } else {
    return _installAll(o);
  }
}

function _installSingle(o) {
  logger.info('Searching ' + o.id + (o.version ? '@' + o.version : ''));

  var url = 'http://registry.gitt.io/' + o.id;

  request(url, function(error, response, body) {

    if (!error && response.statusCode == 200) {

      var info = JSON.parse(body);

      if (info.error) {
        logger.error(info.error);
        return;
      }

      var target;
      if (o.version) {
        target = _.find(info.versions, function(v) { return v.version === o.version;});
        if (!target) {
          logger.error("Invalid version " + o.version + " for " + o.id);
          return;
        }
      } else { // use latest version
        target = _.last(info.versions);
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
      download(target.dist, function(err, tmpPath) {

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
    }
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

function generateTempDir() {
  return path.join(os.tmpDir(), Date.now().toString() + '-' + Math.random().toString().substring(2));
}

function download(zipUrl, _cb) {
  var tmpDir = generateTempDir(),
      zipFile = path.join(tmpDir, 'component.zip');

  fs.mkdir(tmpDir, function(err) {

    if (err) {
      return _cb(err);
    }

    request.get(zipUrl).pipe(fs.createWriteStream(zipFile)).on('close', function() {

      extract(zipFile, tmpDir, function(err, unzipDir) {

        if (err) {
          return _cb(err);
        }

        _cb(null, unzipDir);
      });
    });
  });
}

function extract(zipFile, unzipDir, _cb) {
  var zip = new AdmZip(zipFile),
    entries = zip.getEntries(),
    pending = entries.length;

  function checkDone(err) {

    if (err) {
      _cb(err);
    }

    pending -= 1;

    if (pending === 0) {
      _cb(null, unzipDir);
    }
  }

  entries.forEach(function(entry) {

    if (entry.isDirectory) {
      return checkDone();
    }

    var file = path.resolve(unzipDir, entry.entryName);
    fs.outputFile(file, entry.getData(), checkDone);
  });
}

exports.install = install;
