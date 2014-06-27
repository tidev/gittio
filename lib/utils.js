var _ = require('underscore'),
  chalk = require('chalk');

function prettyJSON(val, key, depth) {

  if (!depth) {
    depth = 0;
  }

  var prefix = '';

  if (_.isString(key)) {

    if (depth) {
      prefix += Array(depth).join(' ');
    }

    prefix += chalk.green(key.toString()) + ':';
  }

  if (_.isArray(val) && !_.isObject(_.first(val))) {
    console.log(prefix + ' ' + val.join(', '));

  } else if (_.isObject(val)) {
    console.log(prefix);

    if (!_.isArray(val)) {
      depth += 2;
    }

    _.each(val, function(val, key) {
      prettyJSON(val, key, depth);
    });

  } else {
    console.log(prefix + ((val !== null && val !== undefined) ? ' ' + val : ''));
  }
}

exports.prettyJSON = prettyJSON;

exports.prefix = function(id, version, platforms) {
  var prefix = id;

  if (version && version !== '*') {
    prefix += '@' + version;
  }

  if (platforms) {
    prefix += ':';

    if (typeof platforms === 'string') {
      prefix += platforms;
    } else {
      prefix += platforms.join(',');
    }
  }

  return chalk.blue(prefix);
};