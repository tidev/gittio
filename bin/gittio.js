#!/usr/bin/env node

var os = require('os'),
	path = require('path'),
	request = require('request'),
	ghdownload = require('github-download'),
	_ = require('underscore'),
	fs = require('fs-extra'),
	AdmZip = require('adm-zip'),
	ProgressBar = require('progress');

var bar = new ProgressBar(':bar', {
	total: 10
});

// TODO: Check if in project root

if (process.argv.length > 2) {
	install(process.argv[2], process.argv[3]);

} else {
	findWidgets();
}

function findWidgets() {
	var alloyConfigPath = path.join(process.cwd(), 'app', 'config.json');

	if (fs.existsSync(alloyConfigPath)) {

		fs.readJson(alloyConfigPath, function(err, data) {

			if (err) {
				console.error(err);
				process.exit(0);
			}

			console.log(data);

			if (data.dependencies) {

				_.each(data.dependencies, function(version, widget) {
					install('widget', widget);
				});
			}
		});
	}
}

function findModules() {
	var alloyConfigPath = path.join(process.cwd(), 'app', 'config.json');

	if (fs.existsSync(alloyConfigPath)) {

		fs.readJson(alloyConfigPath, function(err, data) {

			if (err) {
				console.error(err);
				process.exit(0);
			}

			console.log(data);

			if (data.dependencies) {

				_.each(data.dependencies, function(version, widget) {
					install('widget', widget);
				});
			}
		});
	}
}

function install(type, uid) {
	var url = 'http://registry.gitt.io/' + type + '/' + uid;

	request(url, function(error, response, body) {

		if (!error && response.statusCode == 200) {

			info = JSON.parse(body);

			console.log(info);

			download({
				user: info.user,
				repo: info.repo,
				branch: info.branch
			}, function(err, tmpPath) {

				if (err) {
					console.error(err);
					process.exit(0);
				}

				console.log(tmpPath);

				var trgPath = path.join(process.cwd(), 'app', 'widgets', uid);

				fs.mkdirs(trgPath, function(err) {

					if (err) {
						console.error(err);
						process.exit(0);
					}

					var plfPath = _.first(_.values(info.platforms));

					var srcPath = path.join(tmpPath, plfPath);

					fs.copy(srcPath, trgPath, function(err) {

						if (err) {
							console.error(err);
							process.exit(0);
						}

						console.log('done');
						process.exit(0);
					});
				});
			});
		}
	});
}

function generateTempDir() {
	return path.join(os.tmpDir(), Date.now().toString() + '-' + Math.random().toString().substring(2));
}

function download(_opts, _cb) {
	var tmpdir = generateTempDir(),
		zipBaseDir = _opts.repo + '-' + _opts.branch,
		zipFile = path.join(tmpdir, zipBaseDir + '.zip');

	var zipUrl = "https://nodeload.github.com/" + _opts.user + "/" + _opts.repo + "/zip/" + _opts.branch;

	fs.mkdir(tmpdir, function(err) {

		if (err) {
			return _cb(err);
		}

		request.get(zipUrl).pipe(fs.createWriteStream(zipFile)).on('close', function() {

			extract(zipFile, tmpdir, function(err) {

				if (err) {
					return _cb(err);
				}

				_cb(null, path.join(tmpdir, zipBaseDir));
			});
		});
	});
}

function extract(zipFile, outputDir, _cb) {
	var zip = new AdmZip(zipFile),
		entries = zip.getEntries(),
		pending = entries.length;

	function checkDone(err) {

		if (err) {
			_cb(err);
		}

		pending -= 1;

		if (pending === 0) {
			_cb();
		}
	}

	entries.forEach(function(entry) {

		if (entry.isDirectory) {
			return checkDone();
		}

		var file = path.resolve(outputDir, entry.entryName);
		fs.outputFile(file, entry.getData(), checkDone);
	});
}