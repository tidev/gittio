var os = require('os'),
    path = require('path'),
    fs = require('fs-extra'),
    logger = require('./logger'),
    request = require('request'),
    AdmZip = require('adm-zip');
    
exports.lookup = function(id, callback) {
  logger.info(id + ' searching..');

  var url = 'http://registry.gitt.io/' + id;

  request(url, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var info = JSON.parse(body);

      if (info.error) {
        callback(info.error, null);
        return;
      }
      callback(null, info);
    } else {
      callback("Error contacting registry", null);
    }
  });
}


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
}

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

exports.search = function() {

};
