var child_process = require('child_process');

module.exports = function exec(cmd, args, opts, callback) {

  if (process.platform === 'win32') {
    args = ['/c', cmd].concat(args);
    cmd = process.env.comspec;
  }

  var childProcess = child_process.spawn(cmd, args, opts || {});

  if (callback) {
    var stdout = '';
    var stderr = '';

    // null if cmd does not exist
    if (childProcess.stdout) {
      childProcess.stdout.on('data', function(data) {
        stdout += data.toString();
      });
    }

    // null if cmd does not exist
    if (childProcess.stderr) {
      childProcess.stderr.on('data', function(data) {
        stderr += data.toString();
      });
    }

    childProcess.on('close', function(code) {
      callback(null, stdout);
    });

    // fired when cmd does not exist, throwing exception when not listened to
    childProcess.on('error', function(err) {
      callback(err);
    });
  }

  return childProcess;
};
