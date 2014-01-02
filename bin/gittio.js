#!/usr/bin/env node

var gittio = require('../lib/gittio'),
    config = require('../lib/config'),
    program = require('commander'),
    package = require('../package.json');

program
  .version(package.version, '-v, --version')
  .description(package.about.name)
  .usage('command <args> [options]')
  .option('-g, --global', 'install modules under global path')
  .option('-f, --force', 'install components even if already found');

program.command('install')
  .description('install all missing modules and widgets')
  .action(install);

program.command('install <id>') // ony here for help
  .description('install the latest version of a module or widget');

program.command('install <id>@<version>') // ony here for help
  .description('install a specific version of a module or widget');

program.parse(process.argv);

if (program.args.length === 0 || typeof program.args[program.args.length - 1] === 'string') {
    program.help();
}

function install(env) {
  var args = this.args;
  var params = {
    force: this.force,
    global: this.global
  }
  config.init(function() {
    if (typeof args[0] === 'string') {
      var input = args[0];
      var at = input.indexOf('@');
      var id, version;

      if (at > 0) {
        params.id = input.substr(0, at);
        params.version = input.substr(at + 1);
      } else {
        params.id = input;
      }
    }
    return gittio.install(params);
  });
}
