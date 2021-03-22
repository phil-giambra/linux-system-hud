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

            wincmd.stopRealTimeData()
        } else {

            wincmd.startRealTimeData()


        }

    })

    const ret2 = globalShortcut.register('Super+Tab', () => {
        console.log('super Tab is pressed')


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

})
let realtime = true
let wincmd = {}
wincmd.loop = null
wincmd.startRealTimeData = function() {
    realtime = true
    hudClock.webContents.send("from_mainProcess", { type:"start_realtime_data" } )
    if (wincmd.loop === null){
        wincmd.loop = setInterval(function(){
            //do somthing
        },1000)
    }
    hudClock.show()


}
wincmd.stopRealTimeData = function() {
    realtime = false
    hudClock.webContents.send("from_mainProcess", { type:"stop_realtime_data" } )
    if (wincmd.loop !== null) {
        clearInterval(wincmd.loop)
        wincmd.loop = null
    }

    hudClock.hide()

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
