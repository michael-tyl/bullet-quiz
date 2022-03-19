const {
  Worker,
  isMainThread,
  parentPort,
  threadId,
  workerData,
} = require("worker_threads");
const envConfig = require("dotenv").config();
const Ably = require("ably");

const ABLY_API_KEY = process.env.ABLY_API_KEY;

const TICK_MS = 250;

let players = {};
let totalPlayers = 0;
let gameRoomChannel;
let gameCode = workerData.roomCode;

// instantiate to Ably
const realtime = Ably.Realtime({
    key: ABLY_API_KEY,
    echoMessages: false,
});
// wait until connection with Ably is established
realtime.connection.once("connected", () => {
    gameRoomChannel = realtime.channels.get(gameCode + ":primary");
  
    // subscribe to new players entering the game
    gameRoomChannel.presence.subscribe("enter", (player) => {
        console.log(gameCode + ": new player");
        let newPlayerId = player.clientId;
        totalPlayers++;
        players[newPlayerId] = {
            id: newPlayerId,
            x: 0,
            y: 0,
            score: 0,
            nickname: player.data.nickname,
        };
    });
  
    // subscribe to players leaving the game
    gameRoomChannel.presence.subscribe("leave", (player) => {
        delete players[player.clientId];
    });

    // wait for game to start
    gameRoomChannel.subscribe("start", (msg) => {
        console.log("starting game");
    });
});


// starts the game
const startGame = function() {
    let tickInterval = setInterval(() => {
        gameRoomChannel.publish("game-state", {
            playerList: players,
            playerCount: totalPlayers,
        });
    }, TICK_MS);
}

// TODO, simulate game data