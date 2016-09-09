var _ = require('underscore'),
  alloy = require('./alloy'),
  async = require('async'),
  component = require('./component'),
  config = require('./config'),
  dist = require('./dist'),
  exec = require('./exec'),
  fs = require('fs-extended'),
  glob = require('glob'),
  logger = require('./logger'),
  path = require('path'),
  path = require('path'),
  rimraf = require('rimraf'),
  tiapp = require('./tiapp'),
  utils = require('./utils');

function uninstall(o) {

  if (o.version === '*') {
    delete o.version;
  }

  if (!_uninstallWidget(o)) {
    _uninstallModule(o);
  }
}

function _uninstallWidget(o) {
  if (config.context === 'global' || !fs.existsSync(config.widgets_path)) {
    return false;
  }
  var trgPath = path.join(config.widgets_path, o.id);
  var files = fs.readdirSync(config.widgets_path);
  var found = _.find(files, function(f) {
    return f === o.id;
  });
  var installed = found && (o.version === undefined || require(path.join(trgPath, 'widget.json')).version === o.version);
  var prefix = utils.prefix(o.id, o.version);
  if (installed) {
    rimraf.sync(trgPath);
    alloy.dropDependency(o.id, o.version);

    logger.info(prefix + ' uninstalled');

    return true;
  } else {
    found = _.find(files, function(f) {
      return f.toLowerCase() === o.id.toLowerCase();
    });
    if (found) {
      logger.error("Did you mean " + found + "?");
      return true;
    }
  }

  return false;
}

function _uninstallModule(o) {
  var trgPath = o.global ? config.global_modules_path : path.join(config.modules_path);
  var platform = (o.platform ? o.platform.replace("ios", "iphone") : undefined);
  var uninstalled = false;

  if (config.context === "project") {
    uninstalled = tiapp.dropDependency(o.id, o.version, platform);
  }

  if (o.global || config.context !== "project") {
    _.pairs(config.available_modules.global).forEach(function(kv) {
      var platform = kv[0],
        platform_modules = kv[1];
      if (o.platform === undefined || o.platform == platform) {
        _.pairs(platform_modules).forEach(function(kv) {
          var id = kv[0],
            id_modules = kv[1];
          if (o.id === id) {
            _.pairs(id_modules).forEach(function(kv) {
              var version = kv[0],
                module = kv[1];
              if (o.version === undefined || o.version === version) {
                var modulePath = path.join(module.modulePath);
                if (fs.existsSync(modulePath)) {
                  rimraf.sync(path.join(module.modulePath));
                  uninstalled = true;
                }
              }
            });
          }
        });
      }
    });
  } else {

    if (!fs.existsSync(trgPath)) {
      return;
    }

    var platformDirs = fs.readdirSync(trgPath).filter(function(file) {
      return fs.statSync(path.join(trgPath, file)).isDirectory();
    });

    _.each(platformDirs, function forEach(platformDir) {

      if (platform && platform !== platformDir) {
        return;
      }

      var delPath = path.join(trgPath, platformDir, o.id);

      if (o.version) {
        delPath = path.join(delPath, o.version);
      }

      if (fs.existsSync(delPath)) {
        rimraf.sync(delPath);

        uninstalled = true;

        logger.info(utils.prefix(o.id, o.version, platformDir) + ' removed from project modules');
      }

    });
  }

  var prefix = utils.prefix(o.id, o.version, platform);

  if (!uninstalled) {
    logger.warn(prefix + ' not found');
  }
}

function install(o) {

  if (o.version === '*') {
    delete o.version;
  }

  if (o.url) {
    return _installUrl(o.url, o);

  } else if (o.file) {
    return _installFile(o.file, o);

  } else if (o.id) {
    return _installSingle(o);

  } else {
    if (config.context === "global") {
      if (o.update && o.type !== "widget") {
        return _installAllModules(o);
      } else {
        logger.error("This command must be executed from a project directory");
        return;
      }
    }
    if (o.type === 'widget') {
      return _installAllWidgets(o);
    } else if (o.type === 'module') {
      return _installAllModules(o);
    } else {
      return _installAll(o);
    }
  }
}

function _addDependency(cmp, dst, o) {
  if (cmp.type === 'module' && config.context === 'project') {
    tiapp.addDependency(cmp.id, o.version ? dst.version : null, dst.platforms);
  } else if (cmp.type === 'widget') {
    alloy.addDependency(cmp.id, o.version ? dst.version : null);
  }
}

function findDown(dir, file) {

  if (fs.existsSync(path.join(dir, file))) {
    return file;
  }

  var files = fs.listAllSync(dir, {
    recursive: true,
    filter: function(itemPath, stat) {
      return (stat.isFile() && path.basename(itemPath) === file);
    }
  });

  if (files.length === 1) {
    return files[0];
  }

  return null;
}

function _installDir(dir, o) {

  var cmp = {};
  var dst = {};

  var widgetJson_path = findDown(dir, 'widget.json');

  if (widgetJson_path) {
    var widgetJson = require(path.join(dir, widgetJson_path));

    cmp.id = widgetJson.id;
    cmp.type = 'widget';

    dst.version = widgetJson.version;
    dst.srcPath = path.dirname(widgetJson_path);
    dst.trgPath = path.join(config.widgets_path, cmp.id);

  } else {

    var manifest_path = findDown(dir, 'manifest');

    if (!manifest_path) {
      logger.error('Cannot find a module manifest');
      return;
    }

    var manifest = fs.readFileSync(path.join(dir, manifest_path)).toString();
    var match;

    if (match = manifest.match(/^version: ?([^\n]+)$/m)) {
      dst.version = match[1];
    }

    if (match = manifest.match(/^moduleid: ?([^\n]+)$/m)) {
      cmp.id = match[1];

    } else {
      logger.error('Cannot find module id in the manifest');
      return;
    }

    if (match = manifest.match(/^platform(?:s)?: ?([^\n]+)$/m)) {
      dst.platforms = match[1].split(',');

    } else {
      logger.error('Cannot find target platforms in the manifest');
      return;
    }

    cmp.type = 'module';

    dst.srcPath = 'modules';
    dst.trgPath = o.global ? config.global_modules_path : config.modules_path;
  }

  var prefix = utils.prefix(cmp.id, dst.version, dst.platforms);

  // copy from tmpPath
  fs.copyDir(path.join(dir, dst.srcPath), dst.trgPath, function(err) {

    if (err) {
      logger.error(err);
      return;
    }

    // add dependency
    _addDependency(cmp, dst, o);

    // remove tmpPath
    rimraf.sync(dir);

    logger.info(prefix + ' installed');
  });
}

function _installUrl(url, o) {

  dist.download(url, function(err, dir) {

    if (err) {
      logger.error(err);
      return;
    }

    _installDir(dir, o);

  });
}

function _installFile(file, o) {

  dist.extract(file, function(err, dir) {

    if (err) {
      logger.error(err);
      return;
    }

    _installDir(dir, o);

  });
}

function _installSingle(o) {

  component.lookup(o.id, function(err, cmp) {

    if (err) {
      logger.error(err);
      return;
    }

    if (cmp.type === 'widget' && !config.isAlloy) {
      logger.error('Widgets must be installed within an Alloy project directory.');
      return;
    }

    // filter all dists
    var dists = component.filterDists(cmp, o);

    // nothing to install
    if (dists.length === 0) {
      return;
    }

    // for all dists
    _.each(dists, function(dst) {
      var prefix = utils.prefix(cmp.id, dst.version, dst.platforms),
        installed = dist.isInstalled(cmp, dst, o);

      // already installed
      if (installed && !o.force) {
        logger.warn(prefix + ' already installed');

        // add dependency
        _addDependency(cmp, dst, o);

      } else {

        // download
        logger.info(prefix + ' downloading...');

        dist.download(dst.dist, function(err, tmpPath) {

          if (err) {
            logger.error(err);
            return;
          }

          logger.info(prefix + ' installing...');

          // copy from tmpPath
          fs.copyDirSync(path.join(tmpPath, dst.srcPath), dst.trgPath);

          if (err) {
            logger.error(err);
            return;
          }

          // add dependency
          _addDependency(cmp, dst, o);

          // search for module/widget dependencies
          var dependencies = {};

          if (cmp.type === 'widget') {

            // recursive widget dependencies
            var widget = fs.readJSONSync(path.join(dst.trgPath, 'widget.json'));

            // include our self-declared 'modules' dependencies
            dependencies = _.extend({}, widget.dependencies || {}, widget.modules || {});

          } else if (cmp.type === 'module') {

            // Fixes #105
            var modulePath = path.join(dst.trgPath, dst.platforms[0], cmp.id, dst.version);

            // recursive module dependencies (reading from the temp)
            var pkgs = glob.sync('package.json', {
              cwd: modulePath
            }).map(function(pkgPath) {
              return fs.readJSONSync(path.join(modulePath, pkgPath));
            });

            // merge all package.json#_nativeDependencies
            pkgs.forEach(function(pkg) {
              _.defaults(dependencies, pkg._nativeDependencies || pkg.nativeDependencies || {});
            });
          }

          var tasks;
          if (dependencies && (_.size(dependencies) > 0)) {
            tasks = _.pairs(dependencies).map(function(kv) {
              var id = kv[0],
                version = kv[1];

              return function() {
                install(_.defaults({
                  id: id,
                  version: version
                }, o));
              };

            });
          }

          // install dependencies
          if (tasks && (tasks.length > 0)) {
            async.parallel(tasks);
          }

          // remove tmpPath
          rimraf.sync(tmpPath);

          logger.info(prefix + ' installed');
        });
      }
    });
  }, {
    action: o.update ? 'update' : 'install'
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

    if (data.dependencies && _.size(data.dependencies) > 0) {
      var tasks = [];

      _.each(data.dependencies, function(version, widget) {
        tasks.push(function() {
          install(_.extend({
            id: widget,
            version: o.update ? undefined : version
          }, o));
        });
      });

      async.parallel(tasks);

    } else {
      logger.warn('no widgets found to ' + (o.update ? 'update' : 'install'));
    }
  }
}

function _installAllModules(o) {
  var tasks;
  if (config.context === "project") {
    tasks = config.current_modules.map(function(m) {
      return function() {
        install(_.defaults({
          id: m.name,
          version: o.update ? undefined : m.version,
          platform: m.platform.replace("iphone", "ios")
        }, o));
      };
    });
  } else {
    tasks = [];
    _.pairs(config.available_modules.global).forEach(function(kv) {
      var platform = kv[0],
        platform_modules = kv[1];
      _.pairs(platform_modules).forEach(function(kv) {
        var id = kv[0],
          id_modules = kv[1];
        tasks.push(function() {
          install(_.defaults({
            id: id,
            platform: platform.replace("iphone", "ios")
          }, o));
        });
      });
    });
  }
  if (tasks.length > 0) {
    async.parallel(tasks);
  } else {
    logger.warn('no modules found to ' + (o.update ? 'update' : 'install'));
  }
}

function info(id, options) {

  config.init({
    global: true
  }, function() {
    component.lookup(id, function(err, info) {
      if (err) {
        if (options.output === "json") {
          console.log(JSON.stringify({
            error: err
          }));
        } else {
          logger.error(err);
        }
        return;
      }
      if (options.output === "json") {
        console.log(JSON.stringify(info, null, '  '));
      } else {
        utils.prettyJSON(info);
        console.log('');
      }
    }, {
      silent: options.output === "json",
      action: 'info'
    });
  });
}

function demo(o) {

  if (config.context === 'project') {
    logger.error('will not create a project within a project: ' + project_path);
    return;
  }

  component.lookup(o.id, function(err, cmp) {

    if (err) {
      logger.error(err);
      return;
    }

    if (cmp.type !== 'module') {
      logger.error('demo only works with modules.');
      return;
    }

    var project_name = utils.camelCase(cmp.title);
    var project_path = path.join(process.cwd(), project_name);

    if (fs.existsSync(project_path)) {
      logger.error('cannot create already existing: ' + project_path);
      return;
    }

    // filter all dists
    var dists = component.filterDists(cmp, o);

    // nothing to install
    if (dists.length === 0) {
      var prefix = utils.prefix(o.id, o.version);
      return;
    }

    console.log('');
    console.log('--- CREATING PROJECT ---');
    console.log('');

    // create project
    exec('ti', ['create', '-t', 'app', '-u', 'http://gitt.io', '-p', cmp.platforms.join(','), '-n', project_name, '--id', cmp.id, '-d', process.cwd()], {
      stdio: 'inherit'
    }, function(err, stdout) {

      if (err) {
        logger.error('Failed to create project: ' + err.stack);

        if (err.message.indexOf('spawn ti ENOENT') !== -1) {
          logger.error('This command requires the global Titanium CLI: [sudo] npm i -g titanium');
        }

        process.exit(1);
      }

      console.log('--- INSTALLING MODULE ---');
      console.log('');

      // install module
      exec('gittio', ['install', cmp.id + (o.version ? '@' + o.version : '') + (o.platform ? ':' + o.platform : '')], {
        cwd: project_path,
        stdio: 'inherit'
      }, function(err, stdout) {

        if (err) {
          logger.error('Failed to install module: ' + err.stack);
          process.exit(1);
        }

        console.log('');
        console.log('--- PREPARING EXAMPLES ---');
        console.log('');

        var build = null;

        // if the user defined the platform(s) we only want those
        if (undefined !== o.platform) {
          cmp.platforms = _.intersection(cmp.platforms, o.platform.split(','));

          if (cmp.platforms.length === 0) {
            console.error('The module has none of the requested platforms.');
            return;
          }
        }

        // for each platform
        _.some(cmp.platforms, function(platform) {

          if (platform === 'ios') {
            platform = 'iphone';
          }

          var module_path = path.join(project_path, 'modules', platform, cmp.id);
          var version = fs.readdirSync(module_path)[0];
          var example_path = path.join(module_path, version, 'example');

          // no example
          if (!fs.existsSync(path.join(example_path, 'app.js'))) {
            logger.warn('No example for ' + platform);
            return;
          }

          logger.info('Copied example for ' + platform);

          // copy example
          fs.copySync(example_path, path.join(project_path, 'Resources', platform));

          build = build || platform;

          // break the loop, we only need one example
          return true;
        });

        // no examples
        if (!build) {
          logger.error('No examples found.');
          return;
        }

        console.log('');
        console.log('--- BUILDING PROJECT ---');
        console.log('');

        // build first platform
        exec('ti', ['build', '-p', build], {
          cwd: project_path,
          stdio: 'inherit'
        }, function(err, stdout) {

          if (err) {
            logger.error('Failed to build project: ' + err.stack);
            process.exit(1);
          }

        });
      });
    });
  }, {
    action: 'demo'
  });
}

exports.install = install;
exports.uninstall = uninstall;
exports.info = info;
exports.demo = demo;
