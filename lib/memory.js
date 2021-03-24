function logBytes(x) {
  console.log(x[0], x[1] / (1000.0*1000), "MB")
}

function getMemory() {
  Object.entries(process.memoryUsage()).map(logBytes)
  Object.entries(process.getProcessMemoryInfo()).map(logBytes)
  Object.entries(process.getSystemMemoryInfo()).map(logBytes)
}

setInterval(getMemory, 15000)
