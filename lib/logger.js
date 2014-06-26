var chalk = require('chalk'),
  _ = require('underscore');

var levels = {
  info: chalk.white,
  trace: chalk.grey,
  debug: chalk.blue,
  error: chalk.red,
  warn: chalk.yellow
};

_.each(levels, function(color, level) {
  exports[level] = function(msg) {
    console[level](color('[' + level.toUpperCase() + ']') + (level.length !== 5 ? ' ' : '') + ' ' + msg);
  };
});
