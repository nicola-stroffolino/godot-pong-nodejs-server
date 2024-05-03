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
        let room = createRoom(data.Data.Name, data.Data.Password);
        rooms.push(room);
        joinRoom(room, socket);
        break;
      case "Join Room":
        let roomToJoin = rooms.find((room) => room.players.length < 2 && room.name === data.RoomName && room.password === data.RoomPassword); // Find a room with available slot, matching name, and password
        if (roomToJoin) {
          joinRoom(roomToJoin, socket);
        } else {
          socket.send(JSON.stringify({ error: "No matching rooms found" }));
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
      // Remove the player from the room when the socket is closed
      let room = player.room;
      if (room) {
        room.players = room.players.filter((p) => p !== player);
        if (room.players.length === 0) {
          // Remove the room if there are no players left
          const index = rooms.indexOf(room);
          if (index !== -1) {
            rooms.splice(index, 1);
          }
        }
      }
      console.log(`Player ${player.id} disconnected`);
    }
  });
});

function createRoom(name, password) {
  return {
    id: rooms.length, // Use the index of the room in the array as the ID
    name: name,
    password: password,
    players: [],
  };
}

function joinRoom(room, socket) {
  let playerId = room.players.length + 1; // Generate player ID
  let player = { id: playerId, socket: socket, room: room };
  room.players.push(player);
  socket.send(JSON.stringify({ roomId: room.id, playerId: playerId }));
}

/*
when creating a room the server will receive a json with this info

{
RequestType: "Create Room",
Data: {
Name: 
Password:
Nickname:
}
}

as i want that everytime you create or join a room you as the player will choose your nickname for that room
*/