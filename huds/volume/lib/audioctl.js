const { spawn } = require('child_process');

const EventEmitter = require('events');
class ModEmitter extends EventEmitter {}
let mEmitter = new ModEmitter();
let use_pulse = true
let vol_step = 5

function usePulse(value){
    use_pulse = value
}

function setStep(value){
    value = parseInt(value)
    if (value === NaN){
        return
        emitError("Volume step must be a number")
    }
    if (value < 1) { value = 1}
    vol_step = value
}

// amixer -D pulse sset Master 10%-
// amixer -D pulse sget Master
function setVolume(value){
    let mod
    if (value === undefined){ getVolume(); return; }
    if ( value === "+" || value === "-"){
        mod = vol_step + "%" +value
    }
    else if ( value === "toggle") {
        mod = value
    }
    else if ( parseInt(value) !== NaN) {
        mod = value + "%"
    }
    else {
        emitError("setVolume requires '+' , '-' , 'toggle' or a number")
        return;
    }
    let errorbuf= ""
    let databuf = ""
    let options = ["-D","pulse", "sset", "Master", `${mod}` ]
    if (use_pulse === false) { options.splice(0,2) }
    let setspawn = spawn( "amixer", options )
    setspawn.stdout.on('data', (data) => { databuf += data });
    setspawn.stderr.on('data', (data) => { errorbuf += data});
    setspawn.on('exit', (code) => {
        console.log(`setspawn exited with code ${code}`);
        if (code !== 0 ){
            emitError(`setVolume Error ${databuf}\n ${errorbuf}`)
            return
        }
        emitVolume(parseVolume(databuf))
    });

}


function getVolume(){
    let errorbuf= ""
    let databuf = ""
    let options = ["-D","pulse", "sget", "Master" ]
    if (use_pulse === false) { options.splice(0,2) }
    let getspawn = spawn("amixer", options)
    getspawn.stdout.on('data', (data) => { databuf += data });
    getspawn.stderr.on('data', (data) => { console.log("stderr",data.toString());});
    getspawn.on('exit', (code) => {
        console.log(`getspawn exited with code ${code}`);
        if (code !== 0 ){
            emitError(`getVolume Error ${databuf}\n ${errorbuf}`)
            return
        }
        emitVolume(parseVolume(databuf))
    });
}

function parseVolume(str) {
    let muteed = {on:false,off:true}
    let vol= { level:0 , mute: false }
    let s = str.trim().split("\n")
    s.forEach((item, i) => {
        let parts = item.trim().replace(/]/g,"").split("[")
        if (parts.length === 3){
            console.log( parts );
            vol.level = parseInt( parts[1].trim().replace("%","") )
            vol.mute = muteed[parts[2]]
        }


    });

    return vol
}

function emitVolume(vol) {
    console.log("emitVolume", vol);
    mEmitter.emit("volume_update", vol)
}

function emitError(err){
    console.log("emitError", err);
    mEmitter.emit("volume_error", err)
}

/*
exports.getRandomColor = () => {
  return allColors[Math.floor(Math.random() * allColors.length)];
}
*/
exports.setStep = setStep;
exports.usePulse = usePulse;
exports.getVolume = getVolume;
exports.setVolume = setVolume;
exports.msg = mEmitter;

//  mEmitter.emit("auth", packet)

console.log("Audio control module has been initiated");

//setVolume(50)
//getVolume()
