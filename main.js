const {app, BrowserWindow, ipcMain, Menu, globalShortcut} = require('electron')
const { fork , spawn } = require('child_process');
const fs = require('fs')
const path = require('path')
let args = process.argv

const util = require('./lib/utility.js')
//const launch = require('./lib/launcher.js')
//const memuse = require('./lib/memory.js')

let cloneObj = function(obj){ return JSON.parse(JSON.stringify(obj))}

const gotTheLock = app.requestSingleInstanceLock()
const user = process.env.USER
const os_platform = process.platform
let app_data_path

let HUD = {}
let focused_hud = null
let xonly = false
let config = {
    keybinds:{
        hide_show:"Super+Space",
        focus_switch:"Super+Tab",
        quit:"Super+q"
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
        }
        if (item === "--xonly" ) {
            xonly = true
        }

    });

    // default no args
    if (optionSet === false){
        // create the huds
        loadHudData()
    }

}

function showHelp() {
    console.log("Linux-System-Hub Command & Config options");
    console.log(util.help);
    app.quit()
}


app.whenReady().then(() => {

    if (!gotTheLock) {
        let lastarg = args.pop()
        if (lastarg === "--help") {
            showHelp()
        }
        else {
            console.log("Linux-system-hud is already running ");
            console.log(`Press ${config.keybinds.hide_show} to show it`);
        }
        app.quit()

    } else {

        app.on('second-instance', (event, commandLine, workingDirectory) => {
            // nothing to do here
        })
    }

    const keybind1 = globalShortcut.register(config.keybinds.hide_show, () => {
        console.log('hide_show is pressed')
        if (realtime === true) {

            wincmd.stopRealTimeData()
        } else {

            wincmd.startRealTimeData()


        }

    })

    const keybind2 = globalShortcut.register(config.keybinds.focus_switch, () => {
        console.log('focus_switch is pressed')


    })
    const keybind3 = globalShortcut.register(config.keybinds.quit, () => {
        console.log('quit is pressed')
        for (let id in HUD){
            HUD[id].win.close()
        }

    })
    checkArgs()





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

}


function checkOkToQuit() {

    app.quit()

}

//----------------------HUD creation------------------------------------

let hud_defs = {}


function loadHudData() {
    console.log("LSH: Begin loading hud definitions ");
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

    console.log("LS: Finished loading hud definitions");
    // create all active huds
    for (let id in hud_defs){
        if (hud_defs[id].active === true){ createHud(id) }
    }
}


//*** test support for background_only huds
function createHud(hudid) {
    console.log("createHud", hudid);
    // Create the browser window.
    if ( HUD[hudid]) {
        console.log("hud already exists");
        return;
    }
    //reference this huds definition
    let hdef = hud_defs[hudid]
    // check weather to show this hud
    let show_win = true
    let paint_win = true
    if (hdef.hud_type === "normal" && hdef.is_hidden === true){ show_win = false }
    if (hdef.hud_type === "freestyle" && hdef.show_on_startup === false || hdef.hud_type === "background") {
        show_win = false
        //paint_win = false
    }


    HUD[hudid] = {}
    HUD[hudid].focus = false
    HUD[hudid].win = new BrowserWindow({
        x:hdef.x,
        y:hdef.y,
        width: hdef.width,
        height: hdef.height,
        //transparent:true,
        frame:hdef.frame,
        show:show_win,
        paintWhenInitiallyHidden:paint_win, // maybe don't need this
        //resizable:false,
        webPreferences: {
            contextIsolation: false,
            preload: path.join(hdef.path , 'preload.js')

        },
        //icon: path.join(__dirname, 'huds/assets/icons/logo.png')
    })

    // and load the html of the hud.
    HUD[hudid].win.loadFile( path.join(hdef.path ,`${hudid}.html`) )

    // Open the DevTools.
    if ( hdef.open_dev_tools === true ) {
        HUD[hudid].win.webContents.openDevTools({mode:"detach"})
    }

    // set always on top
    if ( hdef.always_on_top === true ) {
        HUD[hudid].win.setAlwaysOnTop(true)
    }



    HUD[hudid].win.webContents.on("did-finish-load",() =>{
        console.log(`HUD ${hudid} did-finish-load`);
        HUD[hudid].ready = true
        // send the hud it's config definition
        HUD[hudid].win.webContents.send("from_mainProcess",{type:"config_definition", data:hud_defs[hudid]})
        if (hdef.hud_type === "normal" ){ checkHudsReady(hudid) }

    })

    HUD[hudid].win.on("blur",() =>{
        console.log(`HUD ${hudid} is blurred`);
        HUD[hudid].focus = false
        if (config.autohide === true  ) {
            if ( hdef.hud_type === "normal" ||  hdef.hud_type === "freestyle"  ){
                setTimeout(checkAllBlurred,config.autohide_delay)
            }
        }

    })
    HUD[hudid].win.on("focus",() =>{
        console.log(`HUD ${hudid} is focused`);
        HUD[hudid].focus = true
        if ( hdef.hud_type === "normal" ) {
            focused_hud = hudid
        }

    })
    HUD[hudid].win.on("closed",() =>{
        destroyHud(hudid)

    })
}

// as it stands if any hud regardless of hud_type has focus
// then autohide will not happen
//*** maybe want to change this to check only normal huds here, would also
//    have to change the blur event
function checkAllBlurred() {
    console.log("checkAllBlurred");
    let allblurred = true
    for (let id in HUD){
        if (HUD[id].focus === true ) { allblurred = false }
    }
    if (allblurred === true && realtime === true ) {
        wincmd.stopRealTimeData()
    }
}

// on startup make sure all the huds have loaded up before showing them
//*** this may need to be adjusted/tested to handle hud_type:background  and
//    maybe for show_on_startup:false if they don't emit did-finish-load
function checkHudsReady(hud) {
    console.log("checkHudsReady",hud);

    let all_ready = true
    for (let id in HUD){
        if (hud_defs[id].active === true && !HUD[id].ready) { all_ready = false }
    }
    if (all_ready === true && realtime === false  ) {
        wincmd.startRealTimeData()
    }
}

function destroyHud(hudid){
    // close the hud and any other huds the depend on it
    if (!HUD[hudid]) { return;}

    delete HUD[hudid]
    /*
    // check for and close huds that depend on this one
    for (let id in HUD){
        if ( hud_defs[id].depends.includes(hudid)) {
            destroyHud(id)

        }
    }
    */
}

//-----------------------------HUD messages------------------------------------------



// these are common actions any hud window can take
ipcMain.on("hud_window", (event, data) => {
    //console.log("hud_window",data);
    let hudid = data.hudid
    if (data.type === "window_button") {

        if (data.button === "win_pin_toggle"){

        }
        if (data.button === "win_hidden_toggle"){

        }
        if (data.button === "win_close"){
            HUD[hudid].win.close()

        }
        if (data.button === "win_devtools"){
            HUD[data.hud].win.webContents.openDevTools({mode:"detach"})
        }

    }


})

// all huds can send their data out to be used by other huds
// this channel recives the output from huds and then sends it
// to any huds that are subscribed
ipcMain.on("data_update", (event, data) => {
    console.log("data_update", data);
    for (let id in HUD){
        if (hud_defs[id].subscribe.includes(data.type) || hud_defs[id].subscribe.includes("all")){
            HUD[id].win.webContents.send("from_mainProcess", data )
        }
    }
})



//-----------realtime data loop-----------------------------------------------

function showHuds(){
    //*** maybe check here for any active, non-hidden, normal huds that have been
    //    destroyed and recreate them
    for (let id in hud_defs){
        if (  hud_defs[id].hud_type === "normal" && hud_defs[id].active === true){
            if (!HUD[id]) { createHud(id)  }
        }
    }
    for (let id in HUD){
        if ( hud_defs[id].hud_type === "normal" &&  hud_defs[id].is_hidden === false ) {
            HUD[id].win.show()
        }
    }
}
function hideHuds(){
    for (let id in HUD){
        if (  hud_defs[id].hud_type === "normal" &&  hud_defs[id].is_hidden === false ) {
            if (hud_defs[id].is_pinned === false) {
                HUD[id].win.hide()
            }
        }
    }
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
