
let bg_img = document.getElementById("bg_img")
let bg_img_id = 0
let volume_change = document.getElementById("volume_change")
let volume_numeric_display = document.getElementById("volume_numeric_display")
let volume_level_display = document.getElementById("volume_level_display")

volume_change.addEventListener("wheel",handleVolumeChange)

function handleFromMainProcess(data){
    //console.log("handleFromMainProcess", data);
    if (data.type === "start_realtime_data"){
        console.log("start_realtime_data");
        STATE.realtime = true

    }
    if (data.type === "stop_realtime_data"){
        console.log("stop_realtime_data");
        STATE.realtime = false

    }
    if (data.type === "volume_update"){
        console.log("volume_update",data);
        handleVolumeUpdate(data.data)
    }


}
let clock

// menu and main button listeners
let window_buttons = document.getElementsByClassName("window_btn");
for (var i = 0; i < window_buttons.length; i++) {
    window_buttons[i].addEventListener("click", handleWindowButton);
}

//-----------------------window buttons----------------------------------------
// minimum/maximize/close
function handleWindowButton(event) {
    let btn_id
    if (typeof(event) === "string") {
        btn_id = event
    } else {
        btn_id = event.target.id
    }
    console.log("win-button", btn_id);
    lshapi.send("hud_clock_window",{type:"window_button", button:btn_id})
}

function handleVolumeChange(event) {
    //console.log("handleVolumeChange",event);
    let updown = "+"
    if (event.deltaY > 0) {
        console.log("volume down",event.deltaY);
        updown = "-"
    } else {
        console.log("volume up",event.deltaY);
    }
    lshapi.send("hud_clock_window", { type:"volume_change", value:updown } )


}


function handleVolumeUpdate(data) {
    volume_numeric_display.textContent = data.level
    volume_level_display.style.height = (data.level * 2) + "px"
}
