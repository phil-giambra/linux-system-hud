const {app, BrowserWindow,  BrowserView, ipcMain, Menu, globalShortcut} = require('electron')
const { fork , spawn , execSync } = require('child_process');
const fs = require('fs')
const path = require('path')
let args = process.argv

const util = require('./lib/utility.js')

let cloneObj = function(obj){ return JSON.parse(JSON.stringify(obj))}

const gotTheLock = app.requestSingleInstanceLock()
const user = process.env.USER
const os_platform = process.platform

let HUD = {}
let HDEF = {}
let KEYBIND = {}
let focused_hud = null
let xonly = false
let realtime = false
let screen_size
let data_loop = null
let config = {
    keybinds:{
        hide_show:"Super+Space",
        focus_switch:"Super+Tab",
        quit:"Super+q"
    },
    default_huds:["lshud-volume","lshud-settings"],
    autohide:true,
    autohide_delay:1000

}
// check for linux system commands
let lcmds = {
    xrandr:null, amixer:null, zip:null, unzip:null, tar:null
}

try { lcmds.xrandr = execSync("which xrandr").toString().trim() }
catch (e) {lcmds.xrandr = null }
try { lcmds.amixer = execSync("which amixer").toString().trim() }
catch (e) {lcmds.amixer = null }
try { lcmds.zip = execSync("which zip").toString().trim() }
catch (e) {lcmds.zip = null }
try { lcmds.unzip = execSync("which unzip").toString().trim() }
catch (e) {lcmds.unzip = null }
try { lcmds.tar = execSync("which tar").toString().trim() }
catch (e) {lcmds.tar = null }







console.log(lcmds);
//-----------------------USER DATA-------------------------------------------

// setup base data paths


let appdata = {}
appdata.base = path.join( process.env.HOME , ".linux-system-hud" )
appdata.huds = path.join( appdata.base, "huds" )
appdata.hdef = path.join( appdata.base, "hdef" )
appdata.shared = path.join( appdata.huds, "lshub-shared" )

console.log("appdata",appdata);


if ( !fs.existsSync( appdata.base ) ) {
    console.log("LSH: create user data folders", appdata.base);
    for (let p in appdata) {
        fs.mkdirSync( appdata[p] , { recursive: true } )
    }

    saveConfig()
    resetCustomShared()

} else {
    if ( fs.existsSync( path.join( appdata.base , "config.json" ) ) ) {
        console.log('LSH: loading main config.');
        config = JSON.parse( fs.readFileSync( path.join( appdata.base , "config.json" ) , 'utf8' ) )
    } else {
        saveConfig()
    }

}

function saveConfig(){
    fs.writeFileSync(path.join(appdata.base , "config.json"), JSON.stringify(config,null,4) ) //
}

function saveHudConfig(hudid){
    fs.writeFileSync(path.join(appdata.hdef , `${hudid}.json`), JSON.stringify(HDEF[hudid],null,4) ) //
}


function resetCustomShared() {
    let app_share_path = path.join(__dirname,"node_modules","lshud-shared")
    let folders = ["assets","js","lib"]
    let files = [
        ["move.png","share.css"],
        ["share.js"],
        []
    ]
    folders.forEach((fol, i) => {
        fs.mkdirSync( path.join(appdata.shared, fol ) , { recursive: true } )
        let src = path.join( app_share_path , fol )
        let dest = path.join( appdata.shared , fol )
        files[i].forEach((file, ii) => {
            fs.copyFileSync( path.join(src,file), path.join(dest,file) )
        });

    });


}

//-------------------------COMMAND ARGS---------------------------------------
function checkArgs(cmdargs = args) {
    console.log("LSH: command args ", cmdargs);
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
    console.log("Linux-System-Hud Command & Config options");
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


app.on('will-quit',function(event) { console.log("LSH: going to quit"); })

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
            //console.log('hide_show is pressed')
            if (realtime === true) {
                stopRealTimeData()
            } else {
                startRealTimeData()
            }

        })

        KEYBIND.focus_switch = globalShortcut.register(config.keybinds.focus_switch, () => {
            //console.log('focus_switch is pressed')


        })
        KEYBIND.quit = globalShortcut.register(config.keybinds.quit, () => {
            //console.log('quit is pressed')
            let x = 0
            for (let id in HUD){ x++; HUD[id].win.close() }
            if (x === 0) { checkOkToQuit() }
        })

        checkArgs()

    }


})






//----------------------LOAD HUD DATA------------------------------------
function resetHudDef(hudid){
    let src = appdata.huds
    let dest = path.join( appdata.hdef, hudid + ".json")
    if (config.default_huds.includes(hudid)){
        src = path.join(__dirname, 'node_modules')
    }
    src = path.join(src,hudid,"config.json")
    fs.copyFileSync(src,dest )
}

function loadHudData() {
    console.log("LSH: Begin loading hud definitions ");
    let filelist, hpath
    // default
    hpath = path.join(__dirname, 'node_modules')
    config.default_huds.forEach((hudid, i) => {
        if (!fs.existsSync( path.join(appdata.hdef, hudid+".json") )){
            resetHudDef(hudid)
        }
        HDEF[hudid] = JSON.parse( fs.readFileSync( path.join(appdata.hdef, hudid+".json") , 'utf8' ) )
        HDEF[hudid].path = path.join(hpath, hudid)
    });



    // plugins
    hpath = appdata.huds
    filelist =  fs.readdirSync( hpath , { withFileTypes:true })
    for (let i = 0; i < filelist.length; i++) {
        //console.log(filelist[i]);
        if (filelist[i].isDirectory()) {
            let hudid = filelist[i].name
            if ( fs.existsSync( path.join( hpath , hudid , "config.json" ) )  ){
                console.log("LSH: found hud folder ", hudid);
                if (!fs.existsSync( path.join(appdata.hdef, hudid+".json") )){
                    resetHudDef(hudid)
                }
                HDEF[hudid] = JSON.parse( fs.readFileSync( path.join(appdata.hdef, hudid+".json") , 'utf8' ) )
                HDEF[hudid].path = path.join(hpath, hudid)

            }
        }
    }

    console.log("LSH: Finished loading hud definitions");
    // create all active huds
    for (let id in HDEF){
        if (HDEF[id].active === true){ createHud(id) }
    }
}


//--------------------------HUD CREATE------------------------------------

function createBrowserView(hudid,bv, setin = false){
    // check if we already have it
    if (HUD[hudid].views[bv.name] && setin === true ) {
        console.log("setting existing browser view");
        HUD[hudid].win.setBrowserView(HUD[hudid].views[bv.name])

    }
    HUD[hudid].views[bv.name] = new BrowserView()
    if (setin === true) {
        console.log("setin view");
        HUD[hudid].win.setBrowserView(HUD[hudid].views[bv.name])
    }
    HUD[hudid].views[bv.name].setBounds(bv.bounds)
    HUD[hudid].views[bv.name].setAutoResize(bv.auto_resize)
    HUD[hudid].views[bv.name].webContents.loadURL(bv.url)
    HUD[hudid].views[bv.name].webContents.on("did-finish-load",() =>{
        console.log(`LSH:HUD BVIEW ${hudid} - ${bv.name} did-finish-load`);

    })
    HUD[hudid].views[bv.name].webContents.on("context-menu",(e) =>{
        console.log(`LSH:HUDVIEW ${hudid} context-menu`,e);

    })
    if (bv.dev_tools){
        HUD[hudid].views[bv.name].webContents.openDevTools({mode:"detach"})
    }


}


//*** test support for background_only huds
function createHud(hudid) {
    console.log("LSH: createHud() ", hudid);
    // Create the browser window.
    if ( HUD[hudid]) {
        console.log(`LSH: hud ${hudid} already exists`);
        return;
    }
    //reference this huds definition
    let hdef = HDEF[hudid]
    // check weather to show this hud
    let show_win = true
    let paint_win = true
    let skip_taskbar = true
    if (hdef.hud_type === "normal" && hdef.is_hidden === true){ show_win = false }
    if (hdef.hud_type === "freestyle" && hdef.show_on_startup === false || hdef.hud_type === "background") {
        show_win = false
        //paint_win = false
    }
    if (hdef.hud_type === "freestyle" ){ skip_taskbar = false  }


    HUD[hudid] = {}
    HUD[hudid].focus = false
    HUD[hudid].win = new BrowserWindow({
        x:hdef.x,
        y:hdef.y,
        width: hdef.width,
        height: hdef.height,
        transparent:hdef.transparent,
        frame:hdef.frame,
        show:show_win,
        skipTaskbar:skip_taskbar,
        paintWhenInitiallyHidden:paint_win, // maybe don't need this
        resizable:hdef.resizable,
        webPreferences: {
            contextIsolation: false,
            preload: path.join(hdef.path , 'preload.js')

        },
        icon: path.join(hdef.path, 'assets/icon.png')
    })
    // hide the default electron menu
    HUD[hudid].win.setMenuBarVisibility(false)
    // set skiptaskbar
    HUD[hudid].win.setSkipTaskbar(skip_taskbar)
    // load the html of the hud or specified url.
    if (hdef.load_url === null){
        HUD[hudid].win.loadFile( path.join(hdef.path ,`index.html`) )
    } else {
        HUD[hudid].win.loadURL( hdef.load_url )
    }

    HUD[hudid].views = {}
    // check for and load browser views
    if (hdef.browser_views.length > 0){
        hdef.browser_views.forEach((bv, i) => {
            let setin = false
            if (i = 0 && hdef.load_browser_view === true ) { setin = true }
            if (bv.auto_load === true || setin === true){
                createBrowserView(hudid,bv, setin)
            }
        });
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
        console.log(`LSH: hud ${hudid} did-finish-load`);
        HUD[hudid].ready = true
        // send the hud it's config definition
        HUD[hudid].win.webContents.send("from_mainProcess",{type:"config_definition", data:HDEF[hudid]})
        hudSendPositionSize(hudid)
        if (hdef.hud_type === "normal" ){ checkHudsReady(hudid) }

    })

    HUD[hudid].win.on("blur",() =>{
        //console.log(`HUD ${hudid} is blurred`);
        HUD[hudid].focus = false
        if (config.autohide === true  ) {
            if ( hdef.hud_type === "normal" ||  hdef.hud_type === "freestyle"  ){
                setTimeout(checkAllBlurred,config.autohide_delay)
            }
        }

    })
    HUD[hudid].win.on("focus",() =>{
        //console.log(`HUD ${hudid} is focused`);
        HUD[hudid].focus = true
        if ( hdef.hud_type === "normal" ) {
            focused_hud = hudid
        }

    })
    HUD[hudid].win.on("resize",() =>{
        //console.log(`HUD ${hudid} is resize`);
        hudSendPositionSize(hudid)
    })
    HUD[hudid].win.on("move",() =>{
        //console.log(`HUD ${hudid} is move`);
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
    //console.log("checkAllBlurred");
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
    //console.log("checkHudsReady",hud);

    let all_ready = true
    for (let id in HUD){
        if (HDEF[id].active === true && !HUD[id].ready) { all_ready = false }
    }
    if (all_ready === true && realtime === false  ) {
        startRealTimeData()
    }
}

function destroyHud(hudid){
    // close the hud
    if (!HUD[hudid]) { return;}

    delete HUD[hudid]
    /*
    // check for and close huds that depend on this one
    for (let id in HUD){
        if ( HDEF[id].depends.includes(hudid)) {
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
        if (data.button === "win_minimize"){
            HUD[hudid].win.minimize()
        }
        if (data.button === "win_maximize"){
            if (HUD[hudid].win.isMaximized()){
                HUD[hudid].win.unmaximize()
            } else {
                HUD[hudid].win.maximize()
            }

        }
        if (data.button === "win_pin_toggle"){
            handleHudSettingChange({ change:{
                hudid:hudid, key:"is_pinned", value: !HDEF[hudid].is_pinned
            } })
        }
        if (data.button === "win_hidden_toggle"){
            handleHudSettingChange({ change:{
                hudid:hudid, key:"is_hidden", value: !HDEF[hudid].is_hidden
            } })
        }
        if (data.button === "win_close"){
            HUD[hudid].win.close()
        }
        if (data.button === "win_devtools"){
            HUD[hudid].win.webContents.openDevTools({mode:"detach"})
        }

    }
    if (data.type === "request_hud_defs") {
        sendToHud(hudid,{ type:"request_hud_defs" , data:HDEF })
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
        //console.log("window_move_resize", data.data);
        if (data.data === null) {
            hudSendPositionSize(hudid)
        } else {
            HUD[hudid].win.setBounds(data.data)
        }

    }
    //request_browser_view
    if (data.type === "request_browser_view") {
        console.log("request_browser_view", data);
        if (data.remove !== undefined){
            HUD[hudid].win.setBrowserView(null)
        }
        if (data.destroy !== undefined){
            console.log("destroying browser view");
            delete HUD[hudid].views[data.destroy]
            console.log(HUD[hudid].views);
        }
        if (data.viewid !== undefined) {
            createBrowserView(hudid,HUD[hudid].views[data.viewid], true)

        }
        if (data.view !== undefined)  {
            createBrowserView(hudid,data.view, true)
        }
        if (data.reload !== undefined)  {
            if (HUD[hudid].views[data.reload]){
                HUD[hudid].views[data.reload].webContents.reload()
            }

        }
    }
    // settings changes
    if (data.type === "setting_change"){
        handleHudSettingChange(data)
    }


})

// all huds can send their data out to be used by other huds
// this channel recives the output from huds and then sends it
// to any huds that are subscribed
ipcMain.on("data_update", (event, data) => {
    //console.log("data_update", data);
    for (let id in HUD){
        if (HDEF[id].subscribe.includes(data.type) || HDEF[id].subscribe.includes("all")){
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
    for (let id in HDEF){
        if (  HDEF[id].hud_type === "normal" && HDEF[id].active === true){
            if (!HUD[id]) { createHud(id)  }
        }
    }
    for (let id in HUD){
        if ( HDEF[id].hud_type === "normal" &&  HDEF[id].is_hidden === false ) {
            HUD[id].win.show()
        }
    }
}
function hideNormalHuds(){
    for (let id in HUD){
        if (  HDEF[id].hud_type === "normal" &&  HDEF[id].is_hidden === false ) {
            if (HDEF[id].is_pinned === false) {
                HUD[id].win.hide()
            }
        }
    }
}

// hide and show individual huds overriding pinned/hidden
function showHud(id) {
    // check if the hud exist
    if (!HDEF[id] || HDEF[id].active === false ) {
        console.log(`LSH hud ${id} is not defined or it is inactive`);
        return;
    }
    if (!HUD[id]) {
        createHud(id)
        return;
    }
    if ( HDEF[id].hud_type === "normal" || HDEF[id].hud_type === "freestyle"  ) {
        if ( HUD[id].win ) { HUD[id].win.show() }
    }

}

function hideHud(id) {
    if (HUD[id] && HUD[id].win) {
        HUD[id].win.hide()
    }
}




function startRealTimeData() {
    console.log("LSH: realtime started");
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
    console.log("LSH: realtime ended");
    realtime = false
    sendToAllHuds({ type:"stop_realtime_data" })
    if (data_loop !== null) {
        clearInterval(data_loop)
        data_loop = null
    }

    hideNormalHuds()
}



function getScreenSize(){
    if (lcmds.xrandr === null) {
        screen_size = { w: 1920, h: 1080 }
    }
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
         //console.log("getScreenSize",s[0]);
         screen_size = { w:parseInt(s[0][0]), h:parseInt(s[0][1]) }
         console.log("LSH computed screen size ", screen_size);
     })
}



function handleHudSettingChange(data) {
    console.log("handleHudSettingChange", data);
    let hudid = data.change.hudid
    let key = data.change.key
    let value = data.change.value
    if (!HDEF[hudid]) { return;}
    // for app settings and redirect
    if ( key.startsWith("app_") ) {
        handleAppSettingChange(data)
        return
    }
    if (key === "active") {
        HDEF[hudid].active = value
        if (value === false) {
            // stop the hud if it is running
            if( HUD[hudid] && HUD[hudid].win){
                HUD[hudid].win.close()
            }
        } else {
            // show or start the hud if it is not running
            showHud(hudid)
        }

    }
    if (key === "is_pinned"){
        HDEF[hudid].is_pinned = value
        if (value === true) {
            if (HDEF[hudid].is_hidden === true) {HDEF[hudid].is_hidden = false}
            showHud(hudid)
        }
        else if ( realtime === false ) { hideHud(hudid) }
    }
    if (key === "is_hidden"){
        HDEF[hudid].is_hidden = value
        if (value === true ) {
            if (HDEF[hudid].is_pinned === true) {HDEF[hudid].is_pinned = false}
            hideHud(hudid)
        }
        else if ( realtime === true ) { showHud(hudid) }
    }

    saveHudConfig(hudid)
    sendToHud("lshud-settings",{type:"request_hud_defs", data:HDEF})

}


function handleAppSettingChange(data) {
    console.log("handleAppSettingChange", data);
    let hudid = data.change.hudid
    let key = data.change.key
    let key_chain = data.change.key_chain
    let value = data.change.value
    let place = HDEF[hudid].app
    key_chain.forEach((item, i) => {
        place = place[item]
    });
    place = value
    sendToHud("lshud-settings",{type:"app_setting_change", data:data.change, app:HDEF[hudid].app })
    sendToHud(hudid,{type:"app_setting_change", data:data.change, app:HDEF[hudid].app })
}


getScreenSize();
