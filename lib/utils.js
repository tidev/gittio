var _ = require('underscore'),
  colors = require('colors');

exports.prettyJSON = function(val, key, depth) {

  if (!depth) {
    depth = 0;
  }

  var prefix = '';

  if (_.isString(key)) {

    if (depth) {
      prefix += Array(depth).join(' ');
    }

    prefix += key.toString().green + ':';

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
    console.log(prefix + ' ' + val);
  }
};

exports.prefix = function(id, version, platforms) {
  var prefix = id;

  if (version) {
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

  return prefix.blue;
};