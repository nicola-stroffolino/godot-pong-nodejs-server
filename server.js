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
          socket = joinRoom(room, socket, data.Data.Nickname);
        } else {
          socket.send(JSON.stringify({ error: "Room already exists" }));
        }
        break;
      case "Join Room":
        let roomToJoin = getRoomByName(data.Data.Name);
        if (roomToJoin && roomToJoin.password === data.Data.Password) {
          socket = joinRoom(roomToJoin, socket, data.Data.Nickname);
        } else {
          socket.send(JSON.stringify({ error: "Room does not exist or incorrect password" }));
        }
        break;
      case "Player Move":
        let playerData = data.Data;
        let room = getRoomByName(socket.roomName);
        room.players.forEach(player => {
          if (player.id != playerData.id) {
            console.log('player ' + player.id + ' is receiving data.');
            player.send(JSON.stringify({ id: player.id, x: playerData.x, y: playerData.y }))
          }
        });
        break;
      default:
        break;
    }
  });

  socket.on("close", (code, reason) => {
    let room = getRoomByName(socket.roomName);
    if (room) {
      room.players = room.players.filter((p) => p !== socket);
      if (room.players.length === 0) {
        rooms = rooms.filter((r) => r !== room);
      }
    }
    console.log(`Player ${socket.nickname} disconnected`);
  });
});

function createRoom(name, password) {
  return {
    name: name,
    password: password,
    players: [],
  };
}

function joinRoom(room, socket, nickname) {
  socket.id = room.players.length + 1;
  socket.nickname = nickname;
  socket.roomName = room.name;
  room.players.push(socket);

  socket.send(JSON.stringify({ room: room, player: socket }));
  
  return socket;
}

function getRoomByName(name) {
  return rooms.find((room) => room.name === name);
}
