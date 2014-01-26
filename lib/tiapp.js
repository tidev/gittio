var fs = require("fs"),
  path = require("path"),
  xml2js = require('xml2js'),
  _ = require("underscore"),
  logger = require("./logger"),
  utils = require('./utils'),
  config = require("./config");

exports.addDependency = function(id, version, platforms) {

  platforms.forEach(function(platform) {
    var prefix = utils.prefix(id, version, platform);
    var platform = platform.replace("ios", "iphone");

    var configured = _.find(config.current_modules, function(m) {
      return m.name === id && m.platform === platform;
    });

    // add module
    if (!configured) {
      logger.info(prefix + ' adding to tiapp.xml');

      var module = {
        "_": id,
        "$": {
          platform: platform
        }
      };

      // only add version if asked for specific
      if (version) {
        module.$.version = version;
      }

      // first module
      if (!config.tiapp.obj['ti:app'].modules[0].module) {
        config.tiapp.obj['ti:app'].modules = [{
          module: [module]
        }];
      }

      // additional module
      else {
        config.tiapp.obj['ti:app'].modules[0].module.push(module);
      }
    }

    // update version, only if asked for specific or a version is set
    else if (configured.version || (version && configured.version !== version)) {
      logger.info(prefix + ' updating in tiapp.xml');

      // find entry in tiapp.xml
      config.tiapp.obj['ti:app'].modules[0].module.forEach(function(m) {
        if (m["_"] === id && m["$"].platform === platform) {
          m["$"].version = version;
        }
      });
    }

    // nothing to do
    else {
      return;
    }

    // write tiapp.xml
    writeTiapp(config.tiapp.obj['ti:app'].modules[0]);
  });
};

exports.dropDependency = function(id, version, platform) {

  if (config.tiapp.obj['ti:app'].modules[0].module) {
    var write = false;

    config.tiapp.obj['ti:app'].modules[0].module = _.filter(config.tiapp.obj['ti:app'].modules[0].module, function(o) {
      if (o._ !== id || (version && o.$ && o.$.version && o.$.version !== version) || (platform && o.$ && o.$.platform && o.$.platform !== platform)) {
        return true;
      } else {
        logger.info(id + ((o.$ && o.$.version) ? '@' + o.$.version : '') + ((o.$ && o.$.platform) ? ' (' + o.$.platform + ')' : '') + ' removed from tiapp.xml');
        write = true;
        return false;
      }
    });

    if (write) {
      writeTiapp(config.tiapp.obj['ti:app'].modules[0]);
    }
  }
};


function writeTiapp(new_modules) {
  var tiapp_file = path.join(config.tiapp.path, 'tiapp.xml');
  var builder = new xml2js.Builder({
    explicitRoot: false
  });
  fs.writeFileSync(tiapp_file,
    fs.readFileSync(tiapp_file).toString()
    .replace(
      /<modules\/>|<modules>[\s\S]*<\/modules>/gm,
      builder.buildObject({
        modules: new_modules
      })
      .split("\n")
      .splice(1)
      .map(function(line, idx) {
        return (idx > 0 ? "  " : "") + line;
      }).join("\n")
    )
  );
}