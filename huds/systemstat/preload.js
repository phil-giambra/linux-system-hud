const ipc = require('electron').ipcRenderer;

window.hudid = "systemstat"

window.lctl = require('./lib/systemstat.js')

console.log("pre-load : " , __dirname);

window.lsh = {}
// ipc to the main process
window.lsh.send = function (channel,data) {
    ipc.send(channel, data)
}


ipc.on('from_mainProcess', (event, data) => {
    handleFromMainProcess(data)
})

function handleFromMainProcess(data){
    //console.log();
}
//-------------- launch control messages-----------------------------------------
lctl.msg.on("somthing", function(vol){
    //handleVolumeUpdate(vol)
    //lsh.send("data_update", { type:"volume_update", data:vol , hudid:hudid} )

})

lctl.msg.on("somthing_else", function(err){
    //handleVolumeError(data)
    //lsh.send("data_update", { type:"volume_error", data:err, hudid:hudid} )
})

//let test = setInterval(sendData,1000)
function sendData() {
    lsh.send('data_update', { type:`${hudid} window onload`})
}

window.onload = function() {
    // ??
    console.log(`${hudid} window onload`);
    lsh.send('data_update', { type:`${hudid} window onload`})

};
