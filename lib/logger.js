var colors = require('colors'),
  _ = require('underscore');

var levels = {
  info: colors.white,
  trace: colors.grey,
  debug: colors.blue,
  error: colors.red,
  warn: colors.yellow
};

_.each(levels, function(color, level) {
  exports[level] = function(msg) {
    console[level](color('[' + level.toUpperCase() + ']') + (level.length !== 5 ? ' ' : '') + ' ' + msg);
  };
});