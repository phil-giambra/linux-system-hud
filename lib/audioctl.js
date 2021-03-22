let vol = {
    level:0,
    mute:false

}
// amixer -D pulse sset Master 10%-
// amixer -D pulse sget Master
function updateVolumeLevel(){

}
exports.getRandomColor = () => {
  return allColors[Math.floor(Math.random() * allColors.length)];
}

exports.allColors = allColors;
