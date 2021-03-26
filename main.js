const {app, BrowserWindow,  BrowserView, ipcMain, Menu, globalShortcut} = require('electron')
const { fork , spawn } = require('child_process');
const fs = require('fs')
const path = require('path')
let args = process.argv

const util = require('./lib/utility.js')

let cloneObj = function(obj){ return JSON.parse(JSON.stringify(obj))}

const gotTheLock = app.requestSingleInstanceLock()
const user = process.env.USER
const os_platform = process.platform
let app_data_path

let HUD = {}
let KEYBIND = {}
let focused_hud = null
let xonly = false
let config = {
    keybinds:{
        hide_show:"Super+Space",
        focus_switch:"Super+Tab",
        quit:"Super+q"
    },
    default_huds:["volume"],
    autohide:true,
    autohide_delay:1000

}
app_data_path = process.env.HOME
app_data_path += "/.linux-system-hud/"
let realtime = false

if ( !fs.existsSync( app_data_path ) ) {
    console.log("CREATE: user data folder", app_data_path);
    fs.mkdirSync( app_data_path + "huds" , { recursive: true } )
    fs.mkdirSync( app_data_path + "hud_defs" , { recursive: true } )

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

function handleAnotherInstance(event, commandLine, workingDirectory) {
    console.log("handleAnotherInstance:", commandLine);
    console.log("handleAnotherInstance:", workingDirectory);
    // nothing to do here
}


function checkOkToQuit() {
    app.quit()
}


app.on('window-all-closed', function () { checkOkToQuit() })


app.on('will-quit',function(event) { console.log("going to quit"); })

app.whenReady().then(() => {

    if (!gotTheLock) {
        let lastarg = args.pop()
        if (lastarg === "--help") {
            showHelp()
        }
        else {
            console.log("Linux-system-hud is already running ");
            console.log(`Press ${config.keybinds.hide_show} to show it`);
            console.log(`Press ${config.keybinds.quit} to close it`);
            app.quit()
        }


    } else {

        app.on('second-instance', (event, commandLine, workingDirectory) => {

            handleAnotherInstance(event, commandLine, workingDirectory)
        })

        KEYBIND.hide_show = globalShortcut.register(config.keybinds.hide_show, () => {
            console.log('hide_show is pressed')
            if (realtime === true) {
                stopRealTimeData()
            } else {
                startRealTimeData()
            }

        })

        KEYBIND.focus_switch = globalShortcut.register(config.keybinds.focus_switch, () => {
            console.log('focus_switch is pressed')


        })
        KEYBIND.quit = globalShortcut.register(config.keybinds.quit, () => {
            console.log('quit is pressed')
            let x = 0
            for (let id in HUD){ x++; HUD[id].win.close() }
            if (x === 0) { checkOkToQuit() }
        })

        checkArgs()

    }


})






//----------------------HUD creation------------------------------------

let hud_defs = {}


function loadHudData() {
    console.log("LSH: Begin loading hud definitions ");
    let filelist, hpath
    let defpath = path.join(app_data_path, "hud_defs")
    hpath = path.join(__dirname, 'node_modules')
    config.default_huds.forEach((hudid, i) => {
        if (!fs.existsSync( path.join(defpath, hudid+".json") )){
            fs.copyFileSync( path.join(hpath, "/lshud-" + hudid + "/config.json") , path.join(defpath, hudid+".json") )
        }
        hud_defs[hudid] = JSON.parse( fs.readFileSync( path.join(defpath, hudid+".json") , 'utf8' ) )
        hud_defs[hudid].path = hpath + "/lshud-" + hudid
    });

    // default
    /*
    hpath = path.join(__dirname, 'huds')
    filelist =  fs.readdirSync( hpath , { withFileTypes:true })

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
    */
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
    // hide the default electron menu
    HUD[hudid].win.setMenuBarVisibility(false)
    // and load the html of the hud.
    HUD[hudid].win.loadFile( path.join(hdef.path ,`${hudid}.html`) )
    // check for and load browser views
    if (hdef.url !== null){
        console.log("create browserview");
        HUD[hudid].view = new BrowserView()
        HUD[hudid].view.setBounds(hdef.url_bounds)
        HUD[hudid].view.setAutoResize(hdef.url_auto_resize)
        HUD[hudid].view.webContents.loadURL(hdef.url)
        HUD[hudid].view.webContents.on("did-finish-load",() =>{
            console.log(`HUDVIEW ${hudid} did-finish-load`);

        })
        HUD[hudid].view.webContents.on("context-menu",(e) =>{
            console.log(`HUDVIEW ${hudid} context-menu`,e);

        })
        //HUD[hudid].view.webContents.openDevTools({mode:"detach"})
        HUD[hudid].win.setBrowserView(HUD[hudid].view)

    }
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
        hudSendPositionSize(hudid)
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
    HUD[hudid].win.on("resize",() =>{
        console.log(`HUD ${hudid} is resize`);
        hudSendPositionSize(hudid)
    })
    HUD[hudid].win.on("move",() =>{
        console.log(`HUD ${hudid} is move`);
        hudSendPositionSize(hudid)
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
        stopRealTimeData()
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
        startRealTimeData()
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

//-----------------------------HUD messages to MAIN-----------------------------



// these are common actions/requests for the hud windows
ipcMain.on("hud_window", (event, data) => {
    //console.log("hud_window",data);
    let hudid = data.hudid
    if (data.type === "window_button") {

        if (data.button === "win_pin_toggle"){
            if (hud_defs[hudid].is_pinned === true)
            { unsetPinHud(hudid) } else { setPinHud(hudid) }
        }
        if (data.button === "win_hidden_toggle"){
            if (hud_defs[hudid].is_hidden === true)
            { unsetHiddenHud(hudid) } else { setHiddenHud(hudid) }
        }
        if (data.button === "win_close"){
            HUD[hudid].win.close()
        }
        if (data.button === "win_devtools"){
            HUD[hudid].win.webContents.openDevTools({mode:"detach"})
        }

    }
    if (data.type === "request_hud_defs") {
        sendToHud(hudid,{ type:"request_hud_defs" , data:hud_defs })
    }
    if (data.type === "request_hud_list") {
        let hudlist = {}
        for (let hid in HUD){
            hudlist[hid] = {}
            for (let prop in HUD[hid]){
                if (prop !== "win") { hudlist[hid][prop] = HUD[hid][prop]  }
            }
        }
        sendToHud(hudid,{ type:"request_hud_list" , data:hudlist })
    }
    if (data.type === "window_move_resize") {
        console.log("window_move_resize", data.data);
        HUD[hudid].win.setBounds(data.data)
    }



})

// all huds can send their data out to be used by other huds
// this channel recives the output from huds and then sends it
// to any huds that are subscribed
ipcMain.on("data_update", (event, data) => {
    console.log("data_update", data);
    for (let id in HUD){
        if (hud_defs[id].subscribe.includes(data.type) || hud_defs[id].subscribe.includes("all")){
            HUD[id].win.webContents.send("data_update", data )
        }
    }
})


//-----------------------------MAIN messages to HUD-----------------------------



function sendToAllHuds(data){
    for (let id in HUD){
        HUD[id].win.webContents.send("from_mainProcess",data)
    }
}

function sendToHud(id,data) {
    if (HUD[id] && HUD[id].win) {
        HUD[id].win.webContents.send("from_mainProcess",data)
    }
}

function hudSendPositionSize(id){
    HUD[id].win.webContents.send("from_mainProcess",{
        type:"position_size_update", bounds:HUD[id].win.getBounds()
    })
}

//------------------- show and hide huds ---------------------------------------

function showNormalHuds(){
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
function hideNormalHuds(){
    for (let id in HUD){
        if (  hud_defs[id].hud_type === "normal" &&  hud_defs[id].is_hidden === false ) {
            if (hud_defs[id].is_pinned === false) {
                HUD[id].win.hide()
            }
        }
    }
}

// hide and show individual huds overriding pinned/hidden
function showHud(id) {
    // check if the hud exist
    if (!hud_defs[id] || hud_defs[id].active === false ) {
        console.log(`HUD ${id} is not defined or Inactive`);
        return;
    }
    if (!HUD[id]) {
        createHud(id)
        return;
    }
    if ( hud_defs[id].hud_type === "normal" || hud_defs[id].hud_type === "freestyle"  ) {
        if ( HUD[id].win ) { HUD[id].win.show() }
    }
    if (hud_defs[id].is_hidden === true) {
        unsetHiddenHud(id)
    }
}

function hideHud(id) {
    if (HUD[id] && HUD[id].win) {
        HUD[id].win.hide()
    }
    if (hud_defs[id].is_pinned === true) {
        unsetPinHud(id)
    }
}

//*** need to add config saves in these
function setPinHud(id) {
    hud_defs[id].is_pinned = true
}

function unsetPinHud(id) {
    hud_defs[id].is_pinned = false
}

function setHiddenHud(id) {
    hud_defs[id].is_hidden = true
}

function unsetHiddenHud(id) {
    hud_defs[id].is_hidden = false
}



let screen_size
let data_loop = null

function startRealTimeData() {
    console.log("realtime started");
    realtime = true

    //actl.getVolume()
    sendToAllHuds({ type:"start_realtime_data" })
    if (data_loop === null){
        data_loop = setInterval(function(){
            //do somthing
        },1000)
    }

    showNormalHuds()
}

function stopRealTimeData() {
    console.log("realtime ended");
    realtime = false
    sendToAllHuds({ type:"stop_realtime_data" })
    if (data_loop !== null) {
        clearInterval(data_loop)
        data_loop = null
    }

    hideNormalHuds()
}



function getScreenSize(){
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
         console.log("getScreenSize",s[0]);
         screen_size = { w:parseInt(s[0][0]), h:parseInt(s[0][1]) }

     })
}


getScreenSize();
//console.log("screen_size",screen_size);
//console.log(actl.getVolume());
