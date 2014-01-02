#!/usr/bin/env node

var gittio = require('../lib/gittio'),
	program = require('commander'),
	package = require('../package.json');

program
	.version(package.version, '-v, --version')
	.description(package.about.name)
	.usage('command <args> [options]')
	.option('-g, --global', 'install modules under global path');

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

function install() {

	if (typeof this.args[0] === 'string') {
		var input = this.args[0];
		var at = input.indexOf('@');
		var id, version;

		if (at > 0) {
			id = input.substr(0, at);
			version = input.substr(at + 1);

			return gittio.install(id, version);

		} else {
			id = input;
			return gittio.install(id);
		}

	} else {
		return gittio.install();
	}
}