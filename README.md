# linux-system-hud
Linux system heads up display

***This app is currently under development and may not work***

#### What is this?
linux-system-hud (lshud) is a small framework used to create and manage    heads up displays (huds) for a Linux desktop. A hud can be pretty much any kind of dock, desktop-applet, system-utility or app.

It comes with a few built-in huds. You can use them and the lshud-template repository as a starting point to create your own awesome hud.

#### How to install?
 lshud is **NOT** ready to be installed and used yet, but if you want to try anyway.
 * NodeJS must be installed with electron installed globally
 * git must be installed
 * Get the install script `wget https://raw.githubusercontent.com/phil-giambra/linux-system-hud/main/install_dev.sh`
 * Read the install script `cat install_dev.sh`
 * If your OK with it then `bash install_dev.sh`

#### Compatibility / Requirements
* lshud is assumed to be run on a linux desktop running an Xorg server  
(may work with Wayland but as of yet untested)
* requires: `amixer` (for lshud-volume)
* optional: `zip`, `unzip`, `tar`,`xrandr`


#### Configuration
 When first run lshud will create folder `~/.linux-system-hud` containing the following

```
├── config.json         (main program config)
├── hdef                (location of individual hud config files)
└── huds                (location for custom huds or overrides of built in huds)
    └── lshub-shared    (copy of shared resources)
```


See the help object in lib/utility.js for more config documentation.
