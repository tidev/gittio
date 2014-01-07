var fs = require("fs"),
  path = require("path"),
  xml2js = require('xml2js'),
  _ = require("underscore"),
  logger = require("./logger"),
  config = require("./config");

exports.addDependency = function(id, version, platforms) {
  platforms.forEach(function(_platform) {
    var platform = _platform.replace("ios", "iphone");
    var configured = _.find(config.current_modules, function(o) {
      return o.name === id && o.version === version && o.platform === platform;
    });
    var outdated = _.find(config.current_modules, function(o) {
      return o.name === id && o.version !== version && o.platform === platform;
    });
    if (!configured) {
      if (outdated) {
        logger.info(id + '@' + version + ' (' + platform + ') updated in tiapp.xml');
        config.tiapp.obj['ti:app'].modules[0].module.forEach(function(m) {
          if (m["_"] === id) {
            m["$"].version = version;
          }
        });
      } else {
        logger.info(id + '@' + version + ' (' + platform + ') added to tiapp.xml');
        var module = {
          "_": id,
          "$": {
            platform: platform,
            version: version
          }
        };
        if (!config.tiapp.obj['ti:app'].modules[0].module) {
          config.tiapp.obj['ti:app'].modules = [{
            module: [module]
          }];
        } else {
          config.tiapp.obj['ti:app'].modules[0].module.push(module);
        }
      }
      writeTiapp(config.tiapp.obj['ti:app'].modules[0]);
    }
  });
};

exports.dropDependency = function(id, version, platform) {

  if (config.tiapp.obj['ti:app'].modules[0].module) {
    var write = false;

    config.tiapp.obj['ti:app'].modules[0].module = _.filter(config.tiapp.obj['ti:app'].modules[0].module, function(o) {
      if (o._ !== id || (version && o.$.version && o.$.version !== version) || (platform && o.$.platform && o.$.platform !== platform)) {
        return true;
      } else {
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
  console.log(new_modules);
  var tiapp_file = path.join(config.tiapp.path,'tiapp.xml');
  var builder = new xml2js.Builder({explicitRoot:false});
  fs.writeFileSync(tiapp_file, 
                   fs.readFileSync(tiapp_file).toString()
                   .replace(
                     /<modules\/>|<modules>(.|\n)*<\/modules>/g, 
                     builder.buildObject({modules:new_modules})
                            .split("\n")
                            .splice(1)
                            .map(function(line,idx) { 
                              return (idx > 0 ? "  ":"") + line;
                            }).join("\n")
                   )
                  );
}
