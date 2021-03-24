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
    const apprun = spawn(appinfo[appkey].path, appinfo[appkey].options, {
      detached: true,
      stdio: 'ignore'
    });

    apprun.unref();
}


exports.getAppList = getAppList;
exports.run = run;
exports.msg = mEmitter;

//  mEmitter.emit("auth", packet)

console.log("Launcher module has been initiated");


/*

//Example of a long-running process, by detaching and also ignoring its parent stdio file descriptors, in order to ignore the parent's termination:



const subprocess = spawn(process.argv[0], ['child_program.js'], {
  detached: true,
  stdio: 'ignore'
});

subprocess.unref();
//Alternatively one can redirect the child process' output into files:


const out = fs.openSync('./out.log', 'a');
const err = fs.openSync('./out.log', 'a');

const subprocess = spawn('prg', [], {
  detached: true,
  stdio: [ 'ignore', out, err ]
});

subprocess.unref();


*/
