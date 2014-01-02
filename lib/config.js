var fs = require('fs'),
		path = require('path'),
		logger = require('./logger'),
		timodules = require('timodules');

exports.init = function(callback) {
	timodules.list(process.cwd(), function(err, res) {
		/*
			 res = {
				 path: String, // project root path
				 current: [{name, version, platform}] //current modules from tiapp.xml
				 modules: [{name, version, platform, scope}] // list of installed modules
			 }
			*/
		if (err) {
			logger.error("gittio must be run within a titanium project path");
			process.exit(1);
		}

		// build paths
		var base = res.path;
		var alloy = path.join(base,'app');
		var alloy_config_file  = path.join(alloy, 'config.json');

		exports.base							 = base;
		exports.modules_path			 = path.join(base, 'modules');
		exports.widgets_path			 = path.join(alloy, 'widgets');
		exports.isAlloy						 = fs.existsSync(alloy_config_file);

		// modules setup
		exports.current_modules		= res.current;
		exports.available_modules = res.modules;

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
		callback();
	});

}
