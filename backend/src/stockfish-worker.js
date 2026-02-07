// stockfish-worker.js
// Runs the Stockfish chess engine in a child process to avoid blocking the main loop
// and to isolate the global scope/environment polyfills required by stockfish.js (ASM.js).

// 1. Polyfill environment
global.self = global;
global.window = undefined;
global.importScripts = undefined;
global.location = { href: 'http://localhost/', protocol: 'http:' };
global.navigator = { userAgent: 'Node.js' };

// 2. Setup communication channels
// Messages FROM the engine come here
global.postMessage = function(msg) {
    if (process.send) {
        process.send(msg);
    } else {
        console.log(msg);
    }
};

// The engine might assign its own listener to this
global.onmessage = null; 

// 3. Load the engine
const path = require('path');

let stockfishPath;
try {
    stockfishPath = require.resolve('stockfish.js/stockfish.js', {
        paths: [process.cwd(), __dirname]
    });
} catch (resolveErr) {
    // Fallback to relative lookup
    stockfishPath = path.join(__dirname, '..', 'node_modules', 'stockfish.js', 'stockfish.js');
}

try {
    require(stockfishPath);
} catch (err) {
    console.error("Failed to load stockfish library:", err);
    process.exit(1);
}

// 4. Listen for messages FROM the parent process
process.on('message', (msg) => {
    if (typeof msg === 'string') {
        if (msg === 'quit') {
            process.exit(0);
        }
        
        // Send command to engine
        if (typeof global.onmessage === 'function') {
            global.onmessage({ data: msg });
        } else {
            console.error("Stockfish engine not ready (global.onmessage is null)");
        }
    }
});

// 5. Initialize
// Sending 'uci' triggers the startup info if not already sent
if (typeof global.onmessage === 'function') {
    global.onmessage({ data: 'uci' });
}
