const WebSocket = require("ws");

const port = 5000;
const wss = new WebSocket.Server({ port: port });

let rooms = [];

console.log(`running on port: ${port}`);

wss.on("connection", (socket) => {
  let player = null;

  socket.on("message", (message) => {
    let data = JSON.parse(message);

    switch (data.RequestType) {
      case "Create Room":
        if (!getRoomByName(data.Data.Name)) {
          let room = createRoom(data.Data.Name, data.Data.Password);
          rooms.push(room);
          player = joinRoom(room, socket, data.Data.Nickname);
        } else {
          socket.send(JSON.stringify({ error: "Room already exists" }));
        }
        break;
      case "Join Room":
        let roomToJoin = getRoomByName(data.Data.Name);
        if (roomToJoin && roomToJoin.password === data.Data.Password) {
          player = joinRoom(roomToJoin, socket, data.Data.Nickname);
        } else {
          socket.send(JSON.stringify({ error: "Room does not exist or incorrect password" }));
        }
        break;
      case "Start Room":
        // Not implemented for now
        break;
      default:
        break;
    }
  });

  socket.on("close", (code, reason) => {
    if (player) {
      let room = player.room;
      if (room) {
        room.players = room.players.filter((p) => p !== player);
        if (room.players.length === 0) {
          rooms = rooms.filter((r) => r !== room);
        }
      }
      console.log(`Player ${player.nickname} disconnected`);
    }
  });
});

function createRoom(name, password) {
  return {
    id: name,
    name: name,
    password: password,
    players: [],
  };
}

function joinRoom(room, socket, nickname) {
  let playerId = room.players.length + 1;
  let player = { id: playerId, nickname: nickname };
  room.players.push(player);

  socket.send(JSON.stringify({ room: room, player: player, prova: "ciao" }));
  
  return player;
}

function getRoomByName(name) {
  return rooms.find((room) => room.name === name);
}
