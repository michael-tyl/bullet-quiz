const {
    Worker,
    isMainThread,
    parentPort,
    workerData,
    threadId,
    MessageChannel,
} = require("worker_threads");

const envConfig = require("dotenv").config();
const express = require("express");
const Ably = require("ably");
const app = express();
const {ABLY_API_KEY, PORT} = process.env;

const TICK_MS = 100;

let rooms = {};
// increment id for every new room
let roomId = 0;

// can change uniqueId func later if necessary
const uniqueId = function() {
    return "id-" + Math.random().toString(36).substr(2, 16);
}

// instantiate to Ably
const realtime = Ably.Realtime({
    key: ABLY_API_KEY,
    echoMessages: false,
});
console.log("connected to Ably");

app.use(express.static("public"));

app.get("/auth", (request, response) => {
    const tokenParams = { clientId: uniqueId() };
    realtime.auth.createTokenRequest(tokenParams, function (err, tokenRequest) {
        if (err) {
            response
                .status(500)
                .send("Error requesting token: " + JSON.stringify(err));
        } else {
            response.setHeader("Content-Type", "application/json");
            response.send(JSON.stringify(tokenRequest));
        }
    });
});

app.get("/", (request, response) => {
    response.header("Access-Control-Allow-Origin", "*");
    response.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    response.sendFile(__dirname + "/index.html");
    console.log("index.html sent");
});

const listener = app.listen(PORT, () => {
    console.log("Listening on port " + listener.address().port);
});

// wait until connection with Ably is established
realtime.connection.once("connected", () => {
    globalChannel = realtime.channels.get(globalGameName);
    // subscribe to new players entering the game
    globalChannel.presence.subscribe("new-room", (room) => {
        generateNewGameThread(
            room.quizId
        );
    });
});

// create new game threads for each room
function generateNewGameThread(
    quizId
) {
    if (isHost && isMainThread) {
        const worker = new Worker("./server-worker.js", {
            workerData: {
                roomCode: roomId++,
                quizId: quizId
            },
        });
        console.log(`CREATING NEW THREAD WITH ID ${threadId}`);
        worker.on("error", (error) => {
            console.log(`WORKER EXITED DUE TO AN ERROR ${error}`);
        });
        worker.on("message", (msg) => {
            if (msg.roomName && !msg.resetEntry) {
                rooms[msg.roomName] = {
                    roomName: msg.roomName,
                    totalPlayers: msg.totalPlayers,
                    gameOn: msg.gameOn
                };
            } else if (msg.roomName && msg.resetEntry) {
                delete rooms[msg.roomName];
            }
        });
        worker.on("exit", (code) => {
            console.log(`WORKER EXITED WITH THREAD ID ${threadId}`);
            if (code !== 0) {
                console.log(`WORKER EXITED DUE TO AN ERROR WITH CODE ${code}`);
            }
        });
    }
  }