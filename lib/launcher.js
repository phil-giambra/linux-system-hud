const { spawn } = require('child_process');
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events');
class ModEmitter extends EventEmitter {}
let mEmitter = new ModEmitter();
let config_path = null

let appinfo = {
    xterm:{ path:"/usr/bin/xterm", name:"xterm", options:[]  },
    steam:{ path:"/usr/bin/steam", name:"Steam", options:[]  }

}

function setConfig(cpath){
    config_path = cpath
    readConfig()
}

function readConfig() {
    if (fs.existsSync( path.join(config_path,"launcher.json") ) ) {
        appinfo = JSON.parse( fs.readFileSync( path.join(config_path,"launcher.json") ) )
    } else {
        saveConfig()
    }
}

function saveConfig(){
    //fs.writeFileSync( path.join(config_path,"launcher.json") , JSON.stringify(appinfo,null,4) ) //
}

function getAppList() {
    return appinfo
}


function run(appkey) {
    console.log("Launching --> ", appinfo[appkey].name);

}


exports.getAppList = getAppList;
exports.run = run;
exports.msg = mEmitter;

//  mEmitter.emit("auth", packet)

console.log("Launcher module has been initiated");
