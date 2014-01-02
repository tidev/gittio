var os = require('os'),
	path = require('path'),
	config = require('./config'),
	alloy = require('./alloy'),
	request = require('request'),
	ghdownload = require('github-download'),
	_ = require('underscore'),
	fs = require('fs-extra'),
	async = require('async'),
	AdmZip = require('adm-zip'),

	// TODO: Show progress bar when requesting from registry and github
	ProgressBar = require('progress');

function install(o) {

	if (o.id) {
		return _installSingle(o);
	} else {
		return _installAll(o);
	}
}

function _installSingle(o) {
	console.info('Searching ' + o.id + (o.version ? '@' + o.version : ''));

	var url = 'http://registry.gitt.io/' + o.id;

	request(url, function(error, response, body) {

		if (!error && response.statusCode == 200) {

			info = JSON.parse(body);

			if (info.error) {
				console.error(info.error);
				return;
			}

			// TODO: Get right download URL based on version
			var dist = info.dist[0];
			var trgPath;
			if (info.type === 'widget') {
				trgPath = path.join(config.widgets_path , o.id);
			} else {
				// TODO: is this even the right path to install local?
				trgPath = path.join(config.modules_path, o.id);
			}

			if (fs.existsSync(trgPath) && !o.force) {
				console.error(o.id + " already installed");
				return;
			}

			console.info('Downloading ' + o.id + (o.version ? '@' + o.version : ''));
			download(dist.url, function(err, tmpPath) {

				if (err) {
					console.error(err);
					return;
				}

				console.info('Installing ' + o.id + (o.version ? '@' + o.version : ''));
				fs.mkdirs(trgPath, function(err) {

					if (err) {
						console.error(err);
						return;
					}

					// TODO: path might not always be in repo-branch form
					var srcPath = path.join(tmpPath, info.repo + '-' + info.branch, dist.path);

					
					fs.copy(srcPath, trgPath, function(err) {

						if (err) {
							console.error(err);
							return;
						}

						// TODO: clean up tmp folder?
						if (info.type === 'widget') {
							alloy.addDependency(o.id, o.version || dist.version);
						}
						console.log(o.id + ' installed');
            return;
					});
				});
			});
		}
	});
}

function _installAll(o) {
	async.parallel([
		_.bind(_installAllWidgets, undefined, o),
		_.bind(_installAllModules, undefined, o)
	]);
}

function _installAllWidgets(o) {

	if (config.isAlloy) {
		var data = config.alloy_config;

		if (data.dependencies) {
			var tasks = [];

			_.each(data.dependencies, function(version, widget) {

				// TODO: honor -f flag
				tasks.push(function() { 
					install(_.extend({
						id: widget, 
						version: version
					}, o)); 
				});
			});

			async.parallel(tasks);
		}
	}
}

function _installAllModules() {
	/* TODO:

	- Use tiapp module to find modules
	- Request from regstry
	- Warn for components missing downloadable versions
	- Warn for components missing requested version
	- Install modules local or global (-g flag)

	 */
}

function generateTempDir() {
	return path.join(os.tmpDir(), Date.now().toString() + '-' + Math.random().toString().substring(2));
}

function download(zipUrl, _cb) {
	var tmpDir = generateTempDir(),
		zipFile = path.join(tmpDir, 'component.zip');

	fs.mkdir(tmpDir, function(err) {

		if (err) {
			return _cb(err);
		}

		request.get(zipUrl).pipe(fs.createWriteStream(zipFile)).on('close', function() {

			extract(zipFile, tmpDir, function(err, unzipDir) {

				if (err) {
					return _cb(err);
				}

				_cb(null, unzipDir);
			});
		});
	});
}

function extract(zipFile, unzipDir, _cb) {
	var zip = new AdmZip(zipFile),
		entries = zip.getEntries(),
		pending = entries.length;

	function checkDone(err) {

		if (err) {
			_cb(err);
		}

		pending -= 1;

		if (pending === 0) {
			_cb(null, unzipDir);
		}
	}

	entries.forEach(function(entry) {

		if (entry.isDirectory) {
			return checkDone();
		}

		var file = path.resolve(unzipDir, entry.entryName);
		fs.outputFile(file, entry.getData(), checkDone);
	});
}

exports.install = install;
