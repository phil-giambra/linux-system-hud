let BYID = function (id){ return document.getElementById(id) }
let cloneObj = function(obj){ return JSON.parse(JSON.stringify(obj))}
function generateUUIDv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

let config = {}
let STATE = {}

if (document.getElementById("top_panel")) {
    let top_panel = document.getElementById("top_panel")

    function hoverbarShowPanel(){
        console.log("showpanel");
        top_panel.style.top = "0px"
    }
    function hoverbarHidePanel(){
        console.log("hidepanel");

        top_panel.style.top = "-30px"
    }



}


if (document.getElementById("hoverbar")) {
    let hoverbar = document.getElementById("hoverbar")

    hoverbar.addEventListener("mouseenter",hoverbarShowPanel)
    top_panel.addEventListener("mouseleave",hoverbarHidePanel)
}

if (document.getElementById("resize_move_button")) {
    let resize_move_button = document.getElementById("resize_move_button")
    let move_resize_control = document.getElementById("move_resize_control")

    function showResizeMoveControl(){
        move_resize_control.style.display = " block"
    }
    function hideResizeMoveControl(){
        move_resize_control.style.display = " none"
    }

    resize_move_button.addEventListener("click",showResizeMoveControl)
    //move_resize_control.addEventListener("click",hideResizeMoveControl)

}
