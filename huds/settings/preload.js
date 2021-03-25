const ipc = require('electron').ipcRenderer;

window.hudid = "settings"

window.lctl = require('./lib/settingsctl.js')

console.log("pre-load : " , __dirname);

window.lsh = {}
// ipc to the main process
window.lsh.send = function (channel,data) {
    ipc.send(channel, data)
}


ipc.on('from_mainProcess', (event, data) => {
    handleFromMainProcess(data)
})


//-------------- launch control messages-----------------------------------------
lctl.msg.on("somthing", function(vol){
    //handleVolumeUpdate(vol)
    //lsh.send("data_update", { type:"volume_update", data:vol , hudid:hudid} )

})

lctl.msg.on("somthing_else", function(err){
    //handleVolumeError(data)
    //lsh.send("data_update", { type:"volume_error", data:err, hudid:hudid} )
})

window.onload = function() {
    // ??
};
