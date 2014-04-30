# gitTio CLI [![Titanium](http://www-static.appcelerator.com/badges/titanium-git-badge-sq.png)](http://www.appcelerator.com/titanium/) [![Alloy](http://www-static.appcelerator.com/badges/alloy-git-badge-sq.png)](http://www.appcelerator.com/alloy/)

Command-line package manager for [Appcelerator](http://appcelerator.com) [Titanium](http://appcelerator.com/titanium) modules & [Alloy](http://appcelerator.com/alloy) widgets, powered by the [gitTio](http://gitt.io) search engine that indexes all open source components (modules and widgets) on [GitHub](http://github.com).

A screencast demonstrating gitTio can be found at: [http://youtu.be/Tgyfo8YHKxk](http://youtu.be/Tgyfo8YHKxk)

## Quickstart [![gitTio](http://gitt.io/badge.png)](http://gitt.io/cli) [![npm](http://img.shields.io/npm/v/gittio.png)](https://www.npmjs.org/package/gittio)

1. Install [gitTio](http://npmjs.org/package/gittio) using [NPM](http://npmjs.org):

    ```
    [sudo] npm install -g gittio
    ```

2. Install missing (versions of) modules and widgets required in `tiapp.xml` and `app/config.json` and use the global path for modules:

    ```
    ~/myproject $ gittio install -g
    ```
    
3. Install the latest version of a component and add it to `tiapp.xml` or `app/config.json`:

    ```
    ~/myproject $ gittio install -g facebook
    ~/myproject $ gittio install nl.fokkezb.loading
    ```
    
## Commands
Use `gittio` or `gittio -h` for full usage, but this covers 80%:

### info
Looks up a component at [gitt.io](http://gitt.io) and displays or returns the info.

* Display in pretty format:

    ```
    gittio info facebook
    ```

* Display in JSON format:

    ```
    gittio info facebook -o json
    ```

### install
Installs all required or a specific component/version/platform.

Examples:

* Install missing (versions of) modules and widgets required in `tiapp.xml` and `app/config.json` and use the global path for modules:

    ```
    ~/myproject $ gittio install -g
    ```
    
    **NOTE:** For widgets, though not officially supported by Alloy, you can add dependecies to other widgets in `widget.json` using the same notation as in `config.json`. The CLI will install all dependencies but ATM not check for conflicts (#21). You can even add a `modules` property using the same notation to depend on modules, like `nl.fokkezb.drawer` depends on `dk.napp.drawer`.
    
* Install the latest version of a component and add it to `tiapp.xml` or `app/config.json`:

    ```
    ~/myproject $ gittio install -g facebook
    ~/myproject $ gittio install nl.fokkezb.loading
    ```

* Install a specific version of a component for a single platform only, even if it is already installed:

    ```
    ~/myproject $ gittio install -g facebook@3.1.1 -p ios -f
    ```
    
* Install the latest version of a module to the global path:

    ```
    ~ $ gittio install -g facebook
    ```

### update
Updates all components to their latest versions.

Examples:

* Install newer versions of globally installed modules:

    ```
    ~ $ gittio update -g
    ```
    
* Install newer versions of components required by a project and use the global path for modules:

    ```
    ~/myproject $ gittio update -g
    ```
    
* Install only newer versions of widgets:

    ```
    ~/myproject $ gittio update -t widget
    ```

### uninstall
Installs a specific component/version/platform.

Examples:

* Uninstall a component and remove it from `tiapp.xml` or `app/config.json`:

   ```
   ~/myproject $ gittio uninstall nl.fokkezb.loading
   ```

* Uninstall all (global) versions of a component:

    ```
    ~ $ gittio uninstall -g facebook
    ```
    
* Uninstall a component for a specific version and platform:

    ```
    ~ $ gittio uninstall -g facebook@3.1.1 -p ios
    ```
    
### demo
Demos a module by creating a project with the module example included.

```
~ $ gittio demo dk.napp.drawer
```

## Options
Use `gittio` or `gittio -h` for full usage, but this covers 80%:

### -g, --global
Searches and installs modules under the global module path (`~/Library/Application Support/Titanium/modules` on the Mac).

### -f, --force
Forces install of components even if they are already found. When you specify a version to install this option is set automatically.

### -p, --platform <platform>
Searches and installs modules only for the specified platform.

### -t, --type <type>
Installs or updates only missing components for type (`module` or `widget`).

### -o --output json
Output result of `info` command as `json`.

## Bugs
When you find issues, please [report](https://github.com/FokkeZB/gittio/issues) them. Be sure to include *all* of the output from the gittio command that didn't work as expected. Also please check if there's not already in issue for it.

## Legal Stuff
The *gitTio* search engine, registry and CLI are owned by [Fokke Zandbergen](http://fokkezb.nl). All rights reserved. See the included LICENSE file for more details.

*Appcelerator*, *Titanium* and *Alloy* are trademarks owned by [Appcelerator, Inc.](http://appcelerator.com). gitTio is not officially part of, owned by nor officially affiliated with Appcelerator.

The components in the gitTio registry are not part of gitTio itself, and are the sole property of their respective creators. There is absolutely no guarantee, warrantee, or assertion made as to the quality, fitness for a specific purpose, or lack of malice in any given component. Components exposed via gitTio are not affiliated with or endorsed by Fokke Zandbergen or Appcelerator.
