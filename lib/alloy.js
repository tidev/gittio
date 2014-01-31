var fs = require("fs"),
  logger = require("./logger"),
  config = require("./config"),
  utils = require("./utils");

exports.addDependency = function(id, version) {
  var deps = config.alloy_config.dependencies;

  // widget is in list with same version (if given)
  if (deps[id] && (!version || deps[id] === version)) {
    return;
  }

  logger.info(utils.prefix(id, version) + ' ' + (deps[id] ? 'updated in' : 'added to') + ' config.json');
  config.alloy_config.dependencies[id] = version || '*';
  fs.writeFileSync(config.alloy_config_file, JSON.stringify(config.alloy_config, null, "  "));
};

exports.dropDependency = function(id, version) {
  var deps = config.alloy_config.dependencies;

  // widget is not in list or with different version (if given)
  if (!deps[id] || (version && version !== deps[id])) {
    return;
  }

  logger.info(utils.prefix(id, deps[id]) + ' removed from config.json');
  delete config.alloy_config.dependencies[id];
  fs.writeFileSync(config.alloy_config_file, JSON.stringify(config.alloy_config, null, "  "));
};
