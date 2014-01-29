var fs = require('fs'),
  path = require('path'),
  logger = require('./logger'),
  exec = require('./exec'),
  timodules = require('timodules');

exports.init = function(global_flag, callback) {
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
      if (!global_flag) {
        logger.error("gittio must be run within a titanium project path if not using the --global flag");
        process.exit(1);
      } else {
        exports.context = 'global';
      }
    } else {
      exports.context = 'project';
    }

    // build paths
    if (exports.context === 'project') {
      var base = res.path;
      var alloy = path.join(base, 'app');
      var alloy_config_file = path.join(alloy, 'config.json');
      var deploymentTargets = [];

      res.tiapp.obj['ti:app']['deployment-targets'][0].target.forEach(function(t) {
        if (t['_'] === 'true') {
          var platform = t['$'].device;
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
        } catch (err) {
          logger.error(err);
          process.exit(1);
        }
      }
    }

    exports.current_modules = res.current;
    exports.available_modules = res.modules;
    exports.tiapp = res.tiapp;

    var get_global = exec('titanium', ['sdk', 'list', '-o', 'json'], {
      capture: true

    }, function(output) {
      exports.global_path = JSON.parse(output).defaultInstallLocation;
      // modules setup
      exports.global_modules_path = path.join(exports.global_path, "modules");

      callback();
    });
  });
};