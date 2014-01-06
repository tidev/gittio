var colors = require('colors');

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
    data.title = data.title.toUpperCase();
  }
});