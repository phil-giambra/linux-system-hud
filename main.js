const {app, BrowserWindow, ipcMain, Menu, globalShortcut} = require('electron')
const { fork , spawn } = require('child_process');
const fs = require('fs')
const path = require('path')
let args = process.argv

let cloneObj = function(obj){ return JSON.parse(JSON.stringify(obj))}

const gotTheLock = app.requestSingleInstanceLock()
const user = process.env.USER
const os_platform = process.platform
let app_data_path
let hudClock = null
let config = {


}
app_data_path = process.env.HOME
app_data_path += "/.config/linux-system-hud/"


if ( !fs.existsSync( app_data_path ) ) {
    console.log("CREATE: user data folder", app_data_path);
    //fs.mkdirSync( app_data_path , { recursive: true } )

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
    //fs.writeFileSync(app_data_path + "config.json", JSON.stringify(config,null,4) ) //
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

    const ret = globalShortcut.register('Super+Space', () => {
        console.log('super is pressed')
        console.log("is isVisible",hudClock.isVisible())
        console.log("isFocused",hudClock.isFocused())
        if (realtime === true) {
            //hudClock.hide()
            wincmd.stopRealTimeData()
        } else {

            wincmd.startRealTimeData()
            //hudClock.show()

        }

    })

    const ret2 = globalShortcut.register('Super+Tab', () => {
        console.log('super Tab is pressed')
        if (realtime === true) {
            wincmd.stopRealTimeData()
        }
        wincmd.raiseWindow(wincmd.list[wincmd.pos].id)
        wincmd.pos += 1
        if (wincmd.pos > wincmd.list.length - 1){ wincmd.pos = 0 }

    })

    createHudClock()

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
        //hudClock.show()
    }


}


function checkOkToQuit() {
    process.stdin.setRawMode(false);
    app.quit()

}

//-----------------------------HUD CLOCK------------------------------------------


function createHudClock () {
    console.log("createHudClock", wincmd.screen);
    // Create the browser window.
    hudClock = new BrowserWindow({
        x:0,
        y:0,
        width: wincmd.screen.w,
        height: wincmd.screen.h,
        //transparent:true,
        frame:false,
        //resizable:false,
        webPreferences: {
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        },
        //icon: path.join(__dirname, 'huds/assets/icons/logo.png')
    })

    // and load the index.html of the app.
    hudClock.loadFile( path.join(__dirname,'huds/hud_clock.html') )
    // Open the DevTools.
    hudClock.webContents.openDevTools()
    wincmd.startRealTimeData()
}



ipcMain.on("hud_clock_window", (event, data) => {
    console.log("hud_clock_window",data);
    if (data.type === "window_button") {
        //hudClock.
        if (data.button === "win_minimize"){
            wincmd.stopRealTimeData()
        }
        if (data.button === "win_maximize"){
            //hudClock.show()
        }
        if (data.button === "win_close"){
            hudClock.close()
        }
        if (data.button === "win_devtools"){
            hudClock.webContents.openDevTools()
        }

    }
    if (data.type === "window_list_button"){
        wincmd.stopRealTimeData()
        wincmd.raiseWindow(data.id)

    }

})
let realtime = true
let wincmd = {}
let selfid = ""
wincmd.loop = null
wincmd.startRealTimeData = function() {
    realtime = true
    hudClock.webContents.send("from_mainProcess", { type:"start_realtime_data" } )
    if (wincmd.loop === null){
        wincmd.loop = setInterval(function(){
            //wincmd.getScreenImage()
            wincmd.getWindows()
        },1000)
    }
    //hudClock.show()
    hudClock.setPosition( 0 , 0)
    wincmd.raiseWindow(selfid)

}
wincmd.stopRealTimeData = function() {
    realtime = false
    hudClock.webContents.send("from_mainProcess", { type:"stop_realtime_data" } )
    if (wincmd.loop !== null) {
        clearInterval(wincmd.loop)
        wincmd.loop = null
    }

    //hudClock.hide()
    hudClock.setPosition( -200 - wincmd.screen.w, 0)
    wincmd.raiseWindow(wincmd.list[wincmd.pos].id)
}

wincmd.bg_id = 0
wincmd.getScreenImage = function(){
    console.log("getScreenImage",wincmd.list[wincmd.pos].id);
    let snap = spawn("import", ["-window",wincmd.list[wincmd.pos].id, "huds/assets/bg.jpg"])
       snap.stdout.on('data', (data) => { databuf += data });
       snap.stderr.on('data', (data) => { console.log("stderr",data.toString());});
       snap.on('exit', (code) => {
         console.log(`snap exited with code ${code}`);

         //hudClock.webContents.send("from_mainProcess", {type:"background_reload", id:wincmd.bg_id} )
         wincmd.bg_id++

     })

}
wincmd.list = []
wincmd.pos = 0



wincmd.raiseWindow = function(id) {
    let databuf = ""
    let raise = spawn("xdo", ["raise", id ])
       raise.stdout.on('data', (data) => { databuf += data });
       raise.stderr.on('data', (data) => { console.log("stderr",data.toString());});
       raise.on('exit', (code) => {
         console.log(`raise exited with code ${code}`);


     })
     let activate = spawn("xdo", ["activate", id ])
        activate.stdout.on('data', (data) => { databuf += data });
        activate.stderr.on('data', (data) => { console.log("stderr",data.toString());});
        activate.on('exit', (code) => {
          console.log(`activate exited with code ${code}`);
          console.log("wincmd.raiseWindow",id, databuf);

      })
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
wincmd.getWindows = function(){
    console.log("wincmd.getWindows");
    let databuf = ""
    let scan = spawn("xwininfo", ["-tree","-root" ])
       scan.stdout.on('data', (data) => { databuf += data });
       scan.stderr.on('data', (data) => { console.log("stderr",data.toString());});
       scan.on('exit', (code) => {
         console.log(`scan exited with code ${code}`);

         let wins = []
         let lines = databuf.split("\n")
         lines.forEach((item, i) => {
             if (i > 5) {
                 if (!item.includes("(has no name)")){
                     if (!item.includes("10x10+10+10") && !item.includes("16x16+0+0")){
                         if (!item.includes("children:")){
                             if (!item.includes("child:")){
                                 if (!item.includes("+-")){
                                     if (item != ""){
                                         wins.push(item.trim().split('"'))
                                     }
                                 }
                             }
                         }
                     }
                 }
             }
         });
         //console.log(wins);
         let winlist = []
         let winids = []
         wins.forEach((item, i) => {
             if (item[1] === "linux-system-hud_self") {selfid = item[0].trim()}
             if ( item[1] !== item[3] && item[1] !== item[5] && item[1] !== "linux-system-hud_self"){
                 winids.push(item[0].trim())
                 winlist.push({
                     id:item[0].trim(),
                     name:item[1],
                     class: item[3],
                     geo: item[6].split(" ")[2]
                 })
             }

         });
         wincmd.list = winlist
         //console.log(winlist);
         if (wincmd.loop !== null){
             // send to client
             hudClock.webContents.send("from_mainProcess", {type:"window_list", list:wincmd.list ,ids:winids} )
         }


     })
}

wincmd.getScreenSize()
wincmd.getWindows()
//wincmd.getScreenImage()
//console.log(wincmd.getScreenSize());
//console.log(wincmd.getWindows());
