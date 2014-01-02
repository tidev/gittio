var fs = require("fs"),
	logger = require("./logger"), 
	config = require("./config");

exports.addDependency = function(id, version) {
	var deps = config.alloy_config.dependencies;
	if (deps[id] === version) {
		return
	}
	logger.debug('Updating config.json');
	config.alloy_config.dependencies[id] = version;
	fs.writeFileSync(config.alloy_config_file, JSON.stringify(config.alloy_config,null,"	"));
}
