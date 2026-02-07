const stockfish = require("stockfish.js");
const engine = stockfish();
console.log("Stockfish loaded");
engine.onmessage = function(event) {
    const line = typeof event === "object" ? event.data : event;
    console.log("Line: " + line);
    if (line.includes("uciok")) {
        console.log("UCI OK received");
        process.exit(0);
    }
};
engine.postMessage("uci");
