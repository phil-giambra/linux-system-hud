

const EventEmitter = require('events');
class ModEmitter extends EventEmitter {}
let mEmitter = new ModEmitter();


let help = {
    config:{

        keybinds:{
            info:"See https://www.electronjs.org/docs/api/accelerator for proper syntax of keybinds ",
            hide_show:"string |( 'Super+Space' ) this keybind will hide/show the normal huds ",
            focus_switch:"string |( 'Super+Tab' ) this keybind will switch focus between the huds  ",
            quit:"string |( 'Super+q' ) this keybind will close all huds and completely exit  ",
        },
        autohide:"Bool | if true all 'normal' type huds will be hidden anytime they have all lost focus ",
        autohide_delay:"Int | millisecond delay before auto-hiding  ",
    },
    hud_config:{
        id:"string | the hud id should be unique and a valid javascript keyname with no underscores ",
        name:"string | the display name of the hud for list, menus etc.",
        hud_type:`string | { normal|background|freestyle }
            normal - this type will be treated as a group for hide/show
            background  - this type has no display window ( can still provide a settings window  )
            freestyle -  this type is treated more or less as an independent app   `,
        load_url: `string or null | if a string url is provided it will be loaded in the window `,
        load_browser_view:"bool | if true browser_views[0] will be loaded and set in the window on startup",
        browser_views:`Array | browser view definitions for this hud
            [{  "name":"weather"
                "url":"https://wttr.in/14716_tqp0.png",
                "bounds":{ "x": 0, "y": 0, "width": 300, "height": 300   },
                "auto_resize": {"horizontal":true, "vertical":true},
                "auto_load" :true,
                "dev_tools": false
            }]
        `,
        x:"Int | window position ",
        y:"Int | window position ",
        width:"Int | window width " ,
        height: "Int | window height ",
        frame:"Bool | window has frame ",
        transparent:`Bool | transparent window *** not implemented yet ` ,
        resizable:`Bool | window can be resized` ,
        subscribe:"Array | data channels this hud wants to receive data-updates on ",
        offer:"Array | data channels this hud provides for other huds to use ",
        active:"Bool | should the hud be loaded ",
        is_hidden:"Bool | for normal huds only, when true the hud will not be shown (but still loaded and ready to show) ",
        is_pinned:"Bool | for normal huds only, when true the hud will not be hidden ",
        always_on_top:"Bool | should this hud stay above other windows ",
        show_on_startup:`Bool | only checked for freestyle huds to see if the should be displayed at startup `,
        open_dev_tools:"Bool | open chrome developer tools window when hud is created ",
        app:"object | arbitrary data used by this hud can be changed/saved with setHudConfig()"

    }
}

exports.help = help;
exports.msg = mEmitter;

//  mEmitter.emit("auth", packet)

console.log("systemstat module has been initiated");
