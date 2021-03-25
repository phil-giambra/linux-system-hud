//const { spawn } = require('child_process');
//const fs = require('fs')
//const path = require('path')
const EventEmitter = require('events');
class ModEmitter extends EventEmitter {}
let mEmitter = new ModEmitter();

exports.msg = mEmitter;

//  mEmitter.emit("auth", packet)

console.log("template module has been initiated");
