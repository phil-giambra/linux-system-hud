const {app, BrowserWindow, ipcMain, Menu, globalShortcut} = require('electron')
const { fork , spawn } = require('child_process');
const fs = require('fs')
const path = require('path')
let args = process.argv

//const actl = require('./lib/audioctl.js')
//const launch = require('./lib/launcher.js')
//const memuse = require('./lib/memory.js')

let cloneObj = function(obj){ return JSON.parse(JSON.stringify(obj))}

const gotTheLock = app.requestSingleInstanceLock()
const user = process.env.USER
const os_platform = process.platform
let app_data_path

let HUD = {}
let focused_hud = null
let config = {
    keybinds:{
        hide_show:"Super+Space",
        focus_switch:"Super+Tab"
    },
    autohide:true,
    autohide_delay:1000

}
app_data_path = process.env.HOME
app_data_path += "/.linux-system-hud/"
let realtime = false

if ( !fs.existsSync( app_data_path ) ) {
    console.log("CREATE: user data folder", app_data_path);
    fs.mkdirSync( app_data_path + "huds" , { recursive: true } )

    saveConfig()

} else {
    if (fs.existsSync(app_data_path + "config.json")) {
        console.log('LOAD: config.json.');
        config = JSON.parse( fs.readFileSync(app_data_path + "config.json",'utf8') )
    } else {
        saveConfig()
    }

}

function saveConfig(){
    fs.writeFileSync(app_data_path + "config.json", JSON.stringify(config,null,4) ) //
}


function checkArgs(cmdargs = args) {
    console.log(cmdargs);
    let optionSet = false
    cmdargs.forEach((item, i) => {
        // show help for command line
        if (item === "--help" ) {
            showHelp();
            optionSet = true
            return;
        }

        // show the config window
        if (item === "--config" ) {
            console.log("config option");
            optionSet = true
            return;
        }
    });

    // default to the mode specified in config
    if (optionSet === false){
        console.log("starting normal by config setting");

    }


}

function showHelp() {
    console.log("Linux-System-Hub Command options");

}


app.whenReady().then(() => {

    if (!gotTheLock) {
        let lastarg = args.pop()
        if (lastarg === "--help") {
            showHelp()
        }
        else if (lastarg === "--config") {
            console.log("You must close any existing lshud instances before running --config");
        }

        else {
            console.log("Showing existing instance");
        }
        //stdin.setRawMode(false);
        app.quit()
    } else {
        app.on('second-instance', (event, commandLine, workingDirectory) => {
            // Someone tried to run a second instance, we should focus our window.
            handleAnotherInstance( event, commandLine, workingDirectory )

        })
        //*** setup the application menu
        //console.log("local menu",Menu.getApplicationMenu());

        checkArgs()
    }

    const ret = globalShortcut.register(config.keybinds.hide_show, () => {
        console.log('hide_show is pressed')
        if (realtime === true) {

            wincmd.stopRealTimeData()
        } else {

            wincmd.startRealTimeData()


        }

    })

    const ret2 = globalShortcut.register(config.keybinds.focus_switch, () => {
        console.log('focus_switch is pressed')


    })

    // create the huds
    loadHudData()




})


app.on('window-all-closed', function () {

    checkOkToQuit()

})


app.on('will-quit',function(event) {
    console.log("going to quit");

})


function handleAnotherInstance(event, commandLine, workingDirectory) {
    console.log("handleAnotherInstance:", commandLine);
    console.log("handleAnotherInstance:", workingDirectory);
    let lastoption = commandLine.pop()
    if (lastoption === "--help") {
        // do nothing
    }

    else {
        //*** if there are any open windows focus them

    }


}


function checkOkToQuit() {
    process.stdin.setRawMode(false);
    app.quit()

}

//----------------------HUD creation------------------------------------

let hud_defs = {
    /*
    volume:{
        x:0, y:800, width:115 , height: 280,
        frame:false, msg:["vol","vol_err"], active:true
    }
    */
}


function loadHudData() {
    console.log("LS: Begin loading hud data ");
    // default
    let hpath = path.join(__dirname, 'huds')
    let filelist =  fs.readdirSync( hpath , { withFileTypes:true })
    //console.log("datastore dir",filelist);

    for (let i = 0; i < filelist.length; i++) {
        //console.log(filelist[i]);
        if (filelist[i].isDirectory()) {
            let hudid = filelist[i].name
            if ( fs.existsSync( hpath + "/" + hudid + "/config.json" )  ){
                console.log("found a hud data folder");

                hud_defs[hudid] = JSON.parse( fs.readFileSync(hpath + "/" + hudid + "/config.json",'utf8') )
                hud_defs[hudid].path = hpath + "/" + hudid
            }
        }
    }

    // plugins
    hpath = app_data_path + "huds"
    filelist =  fs.readdirSync( hpath , { withFileTypes:true })
    //console.log("datastore dir",filelist);

    for (let i = 0; i < filelist.length; i++) {
        //console.log(filelist[i]);
        if (filelist[i].isDirectory()) {
            let hudid = filelist[i].name
            if ( fs.existsSync( hpath + "/" + hudid + "/config.json" )  ){
                console.log("found a hud data folder");

                hud_defs[hudid] = JSON.parse( fs.readFileSync(hpath + "/" + hudid + "/config.json",'utf8') )
                hud_defs[hudid].path = hpath + "/" + hudid
            }
        }
    }

    console.log("LS: Finished loading data stores");

    for (let id in hud_defs){
        if (hud_defs[id].active === true){ createHud(id) }
    }
}


//*** add support for background_only always_on_top
function createHud(hudid) {
    console.log("createHud", hudid);
    // Create the browser window.
    if ( HUD[hudid]) {
        console.log("hud already exists");
        return;
     }
    HUD[hudid] = {}
    HUD[hudid].focus = false
    HUD[hudid].win = new BrowserWindow({
        x:hud_defs[hudid].x,
        y:hud_defs[hudid].y,
        width: hud_defs[hudid].width,
        height: hud_defs[hudid].height,
        //transparent:true,
        frame:hud_defs[hudid].frame,
        show:hud_defs[hudid].show_on_startup
        //resizable:false,
        webPreferences: {
            contextIsolation: false,
            preload: path.join(hud_defs[hudid].path , 'preload.js')
            //preload: path.join(__dirname, 'preload.js')
        },
        //icon: path.join(__dirname, 'huds/assets/icons/logo.png')
    })

    // and load the index.html of the app.
    HUD[hudid].win.loadFile( path.join(hud_defs[hudid].path ,`${hudid}.html`) )
    //HUD[hudid].win.loadFile( path.join(__dirname,`huds/${hudid}.html`) )
    // Open the DevTools.
    if ( hud_defs[hudid].open_dev_tools === true ) {
        HUD[hudid].win.webContents.openDevTools({mode:"detach"})
    }

    // set always on top
    if ( hud_defs[hudid].always_on_top === true ) {
        HUD[hudid].win.setAlwaysOnTop(true)
    }

    HUD[hudid].win.webContents.on("did-finish-load",() =>{
        console.log(`HUD ${hudid} did-finish-load`);
        checkHudsReady(hudid)
    })
    HUD[hudid].win.on("blur",() =>{
        console.log(`HUD ${hudid} is blurred`);
        HUD[hudid].focus = false
        if (config.autohide === true) {
            setTimeout(checkAllBlurred,config.autohide_delay)
        }

    })
    HUD[hudid].win.on("focus",() =>{
        console.log(`HUD ${hudid} is focused`);
        HUD[hudid].focus = true
        focused_hud = hudid
    })
}

function checkAllBlurred() {
    console.log("checkAllBlurred");
    let allblurred = true
    for (let id in HUD){
        if (HUD[id].focus === true) { allblurred = false }
    }
    if (allblurred === true && realtime === true ) {
        wincmd.stopRealTimeData()
    }
}

function checkHudsReady(hud) {
    console.log("checkHudsReady",hud);
    HUD[hud].ready = true
    let all_ready = true
    for (let id in HUD){
        if (!HUD[id].ready) { all_ready = false }
    }
    if (all_ready === true) {
        if (realtime === false ){ wincmd.startRealTimeData() }
    }
}

function destroyHud(hudid){
    // close the hud and any other huds the depend on it
    if (!HUD[hudid]) { return;}
    if (HUD[hudid].win) {
         HUD[hudid].win.close()
     }
    delete HUD[hudid]
    for (let id in HUD){
        if ( hud_defs[id].depends.includes(hudid)) {
            destroyHud(id)

        }

    }
}

//-----------------------------HUD messages------------------------------------------



// these are common actions any hud window can take
ipcMain.on("hud_window", (event, data) => {
    //console.log("hud_window",data);
    let hudid = data.hudid
    if (data.type === "window_button") {

        if (data.button === "win_background_only"){

        }
        if (data.button === "win_maximize"){

        }
        if (data.button === "win_close"){
            destroyHud(hudid)
            //for (let id in HUD){ HUD[id].win.close() }
        }
        if (data.button === "win_devtools"){
            HUD[data.hud].win.webContents.openDevTools()
        }

    }


})

// all huds can send there data out to be used by other huds
ipcMain.on("data_update", (event, data) => {
    //console.log("data_update", data);
    for (let id in HUD){
        if (hud_defs[id].subscribe.includes(data.type) || hud_defs[id].subscribe.includes("all")){
            HUD[id].win.webContents.send("from_mainProcess", data )
        }
    }
})



//-----------realtime data loop-----------------------------------------------

function showHuds(){
    for (let id in HUD){ HUD[id].win.show()}
}
function hideHuds(){
    for (let id in HUD){ HUD[id].win.hide()}
}
function sendToAllHuds(data){
    for (let id in HUD){
        HUD[id].win.webContents.send("from_mainProcess",data)
    }
}



let wincmd = {}
wincmd.loop = null
wincmd.startRealTimeData = function() {
    console.log("realtime started");
    realtime = true
    //actl.getVolume()
    sendToAllHuds({ type:"start_realtime_data" })
    if (wincmd.loop === null){
        wincmd.loop = setInterval(function(){
            //do somthing
        },1000)
    }

    showHuds()
}

wincmd.stopRealTimeData = function() {
    console.log("realtime ended");
    realtime = false
    sendToAllHuds({ type:"stop_realtime_data" })
    if (wincmd.loop !== null) {
        clearInterval(wincmd.loop)
        wincmd.loop = null
    }

    hideHuds()
}



wincmd.getScreenSize = function(){
    let databuf = ""
    let probespawn = spawn("sh", ["-c","xrandr --current | grep '*+'" ])
       probespawn.stdout.on('data', (data) => { databuf += data });
       probespawn.stderr.on('data', (data) => { console.log("stderr",data.toString());});
       probespawn.on('exit', (code) => {
         //console.log(`probespawn exited with code ${code}`);
         //
         let s = databuf.trim().split("\n")
         s.forEach((item, i) => {
             s[i] = item.trim().split(" ")
             s[i] = s[i][0].trim().split("x")
         });
         console.log("wincmd.getScreenSize",s[0]);
         wincmd.screen = { w:parseInt(s[0][0]), h:parseInt(s[0][1]) }

     })
}


wincmd.getScreenSize();
//console.log(actl.getVolume());
