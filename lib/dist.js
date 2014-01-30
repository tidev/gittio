var os = require('os'),
  path = require('path'),
  fs = require('fs-extra'),
  request = require('request'),
  AdmZip = require('adm-zip'),
  _ = require('underscore'),
  config = require('./config');

exports.isInstalled = function(cmp, dst, o) {

  if (cmp.type === 'widget') {

    // installed if target exists and version matches
    return fs.existsSync(dst.trgPath) && require(path.join(dst.trgPath, 'widget.json')).version === dst.version;

  } else {

    return _.reduce(dst.platforms, function(memo, platform) {

      // ios modules are stored under iphone
      if (platform === 'ios') {
        platform = 'iphone';
      }

      var available = config.available_modules,
        scope = config.context;

      // installed if module of specified version is found in context
      return memo && available[scope] && available[scope][platform] && available[scope][platform][cmp.id] && available[scope][platform][cmp.id][dst.version];

    }, true);
  }
};

exports.download = function(zipUrl, _cb) {
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
};

function generateTempDir() {
  return path.join(os.tmpDir(), Date.now().toString() + '-' + Math.random().toString().substring(2));
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