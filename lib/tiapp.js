var fs = require("fs"),
    path = require("path"),
    xml2js = require('xml2js'),
    _ = require("underscore"),
    logger = require("./logger"),
    config = require("./config");

exports.addDependency = function(id, version, platforms) {
  platforms.forEach(function(_platform) {
    var platform = _platform.replace("ios", "iphone");
    var configured = _.find(config.current_modules,function(o) {
      return o.name === id && o.version === version && o.platform === platform;
    });
    var outdated = _.find(config.current_modules,function(o) {
      return o.name === id && o.version !== version && o.platform === platform;
    });
    if(!configured){
      logger.debug('Updating tiapp.xml');
      if (outdated) {
        config.tiapp.obj['ti:app'].modules[0].module.forEach(function(m) {
          if (m["_"] === id) {
            m["$"].version = version;
          }
        })
      } else {
        config.tiapp.obj['ti:app'].modules[0].module.push({
          "_": id,
          "$" : {
            platform: platform,
            version: version
          }
        })
      }
      var builder = new xml2js.Builder();
      var xml = builder.buildObject(config.tiapp.obj);
      fs.writeFileSync(path.join(config.tiapp.path,'tiapp.xml'), xml);
    } 
  });
}

