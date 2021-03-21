
let bg_img = document.getElementById("bg_img")
let bg_img_id = 0
function handleFromMainProcess(data){
    //console.log("handleFromMainProcess", data);
    if (data.type === "start_realtime_data"){
        console.log("start_realtime_data");
        STATE.realtime = true
        requestAnimationFrame(animateBackground);
        //BYID("wrapper").style.background = `url(assets/bg.jpg?v=${data.id})`
    }
    if (data.type === "stop_realtime_data"){
        console.log("stop_realtime_data");
        STATE.realtime = false

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


function animateBackground(){
    console.log("animateBackground");
    if (STATE.realtime === true) {
        bg_img_id++
        bg_img.setAttribute("src", `assets/bg.jpg?v=${bg_img_id}`);
        setTimeout(function(){
            requestAnimationFrame(animateBackground);
        },1000)
    }


}
