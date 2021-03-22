
let bg_img = document.getElementById("bg_img")
let bg_img_id = 0
win_list_cont = document.getElementById("window_list")
win_list_cont.addEventListener("click", handleWinListButton);

function handleFromMainProcess(data){
    //console.log("handleFromMainProcess", data);
    if (data.type === "start_realtime_data"){
        console.log("start_realtime_data");
        STATE.realtime = true
        //requestAnimationFrame(animateBackground);
        //BYID("wrapper").style.background = `url(assets/bg.jpg?v=${data.id})`
    }
    if (data.type === "stop_realtime_data"){
        console.log("stop_realtime_data");
        STATE.realtime = false

    }
    if (data.type === "window_list"){
        updateWindowList(data.list, data.ids)

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
let win_list = {}
function updateWindowList(list,ids) {
    console.log("updateWindowList", list);
    // add new windows
    list.forEach((item, i) => {
        if (!win_list[item.id]){
            win_list[item.id] = item
            win_list_cont.insertAdjacentHTML("beforeend", `<p id="win_btn_${item.id}">${item.id} | ${item.name}</p>`);
        }
    });
    // remove old windows
    for (let id in win_list){
        if (!ids.includes(id)){
            delete win_list[id]
            win_list_cont.removeChild(BYID("win_btn_"+id))
        }
    }



}

function handleWinListButton(event) {
    let btn_id
    if (typeof(event) === "string") {
        btn_id = event
    } else {
        btn_id = event.target.id
    }
    if (!btn_id.startsWith("win_btn_")) { return; }
    let winid = btn_id.replace("win_btn_","")
    console.log("handleWinListButton", winid);
    lshapi.send("hud_clock_window",{type:"window_list_button", id:winid})
}
