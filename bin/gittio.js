#!/usr/bin/env node

var gittio = require('../lib/gittio'),
  config = require('../lib/config'),
  program = require('commander'),
  package = require('../package.json');

program
  .version(package.version, '-v, --version')
  .description(package.about.name)
  .usage('command <args> [options]')
  .option('-g, --global', 'use global path for modules')
  .option('-f, --force', 'install components even if already found')
  .option('-p, --platform <platform>', 'apply to a specific platform only');

program.command('install')
  .description('install all missing modules and widgets')
  .action(install);

// ony here for help
program.command('install <id>')
  .description('install the latest version of a module or widget');

// ony here for help
program.command('install <id>@<version>')
  .description('install a specific version of a module or widget');

program.command('update')
  .description('update all modules and widgets')
  .action(function() {
    var params = {
      force: this.force,
      global: this.global,
      platform: this.platform,
      update: true
    };
    config.init(params.global, function() {
      return gittio.install(params);
    });
  });

program.command('uninstall <id>')
  .description('uninstall a module or widget')
  .action(uninstall);

// ony here for help
program.command('uninstall <id>@<version>')
  .description('uninstall a specific version of a module or widget');

program.command('info <id>')
  .description('display info about a component')
  .option('-o, --output <output>', 'pretty or json (default: pretty)')
  .action(gittio.info);

program.parse(process.argv);

if (program.args.length === 0 || typeof program.args[program.args.length - 1] === 'string') {
  program.help();
}

function install(env) {
  var args = this.args;
  var params = {
    force: this.force,
    global: this.global,
    platform: this.platform
  };
  config.init(params.global, function() {
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

function uninstall(env) {
  var args = this.args;
  var params = {
    force: this.force,
    global: this.global,
    platform: this.platform,
    global: this.global
  };
  config.init(params.global, function() {
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
    return gittio.uninstall(params);
  });
}
