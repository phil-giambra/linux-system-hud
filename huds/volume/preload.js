const ipc = require('electron').ipcRenderer;

window.actl = require('./lib/audioctl.js')

console.log("pre-load : " , __dirname);

window.lsh = {}
// ipc to the main process
window.lsh.send = function (channel,data) {
    ipc.send(channel, data)
}


ipc.on('from_mainProcess', (event, data) => {
    handleFromMainProcess(data)
})


//-------------- audio control messages-----------------------------------------
actl.msg.on("volume_update", function(vol){
    handleVolumeUpdate(vol)
    lsh.send("data_update", { type:"volume_update", data:vol , hudid:"volume"} )

})

actl.msg.on("volume_error", function(err){

    lsh.send("data_update", { type:"volume_error", data:err, hudid:"volume"} )
})

window.onload = function() {
  actl.getVolume()
};
