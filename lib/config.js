var fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    logger = require('./logger'),
    timodules = require('timodules');

function doSpawn(cmd,args) {
  if (process.platform === 'win32') {
    args = ['/c',cmd].concat(args);
    cmd = process.env.comspec;
  }
  return spawn(cmd,args);
}

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
      if(!global_flag) {
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
      var alloy = path.join(base,'app');
      var alloy_config_file  = path.join(alloy, 'config.json');
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

      exports.base               = base;
      exports.modules_path       = path.join(base, 'modules');
      exports.widgets_path       = path.join(alloy, 'widgets');
      exports.isAlloy            = fs.existsSync(alloy_config_file);
      exports.targets            = deploymentTargets;
    }

    exports.current_modules   = res.current;
    exports.available_modules = res.modules;
    exports.tiapp             = res.tiapp;

    // alloy config
    if (exports.isAlloy) {
      try {
        exports.alloy_config_file = alloy_config_file;
        exports.alloy_config      = require(alloy_config_file)
      } catch (err) {
        logger.error(err);
        process.exit(1);
      }
    }

    var get_global = doSpawn('titanium', ['sdk','list','-o','json'])
    var output = "";
    get_global.stderr.pipe(process.stderr);
    get_global.stdout.on('data', function(data) {
      output += data.toString();
    });
    get_global.on("exit", function() {
      exports.global_path       = JSON.parse(output).defaultInstallLocation;
      // modules setup
      exports.global_modules_path = path.join(exports.global_path, "modules");

      callback();
    });
  });

}
