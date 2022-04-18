const envConfig = require("dotenv").config();
const express = require("express");
const http = require("http");
const { SocketAddress } = require("net");
const path = require("path");
const socketIO = require("socket.io");
const { isObject } = require("util");
const TICK_MS = 30;

const app = express();
const {PORT} = process.env;
const server = http.createServer(app);
const io = socketIO(server);

let rooms = {};
let tickCounter = {};
let gameInterval;


app.use(express.static(__dirname));

app.get("/", (request, response) => {
    response.header("Access-Control-Allow-Origin", "*");
    response.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    response.sendFile(__dirname + "/index.html");
});

app.get("/gamesingle", (request, response) => {
    response.sendFile(__dirname + "/gamesingle.html");
});

app.get("/quizselect", (request, response) => {
    response.sendFile(__dirname + "/quizselect.html");
});

app.get("/game", (request, response) => {
    let requestedRoom = request.query.roomCode;
    console.log(requestedRoom);
    if (rooms[requestedRoom]) {
        response.sendFile(__dirname + "/game.html");
    } else {
        response.sendFile(__dirname + "/index.html");
    }
});

app.get("/host", (request, response) => {
    response.sendFile(__dirname + "/host.html");
});

server.listen(PORT);
console.log("Listening on port " + server.address().port);

// listen for connection on socket
io.on("connection", function (socket) {
    // when a host creates a new room
    socket.on("new-room", function (roomData) {
        let newCode = roomData.gameCode;
        console.log("creating new room!");
        rooms[newCode] = {
            roomCode: newCode,
            players: {},
            playerCount: 0,
            started: false
        };
        
    });

    // when a host disconnects
    socket.on("disconnect", () => {
        // TODO: Complete this
    });

    socket.on("player-state", (data) => {
        let playerId = data.clientId;
        if (rooms[data.gameCode] != null) rooms[data.gameCode].players[playerId] = data.player;
    });
    socket.on("new-player", (data) => {
        rooms[data.gameCode].playerCount++;
    })
    socket.on("start", (data) => {
        let newCode = data.gameCode;
        let arr = [];
        for (let i = 0; i < 53; i++) {
            arr.push(Math.random());
        }
        io.sockets.emit("random-arr:" + newCode, {
            randArr: arr
        });
    });
});

function gameTick() {
    for (gameCode in rooms) {   
        io.sockets.emit("game-state:" + gameCode, {
            players: rooms[gameCode].players,
            playerCount: rooms[gameCode].playerCount
        });
        tickCounter[gameCode]++;
    }
}

gameInterval = setInterval(gameTick, TICK_MS);