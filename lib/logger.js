var colors = require('colors');
var labels = {
  info: 'INF',
  trace: 'TRC',
  debug: 'DBG',
  error: 'ERR',
  warn: 'WRN'
};

module.exports = require('tracer').colorConsole({
  format: "[{{title}}] {{message}}",
  filters: [{
    info: colors.white,
    trace: colors.grey,
    debug: colors.blue,
    error: colors.red,
    warn: colors.yellow
  }],
  preprocess: function(data) {
    data.title = labels[data.title];
  }
});