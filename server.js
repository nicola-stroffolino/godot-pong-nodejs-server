const WebSocket = require("ws");
const fs = require('fs');

const port = 5000;
const wss = new WebSocket.Server({ port: port });
const defaultDeck = JSON.parse(fs.readFileSync('deck.json', 'utf8'));

let rooms = [];

console.log(`running on port: ${port}`);

wss.on("connection", (socket) => {
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
          var socket_2 = roomToJoin.players.find((player) => player.id != socket.id);

          socket.send(JSON.stringify({ oppNickname: socket_2.nickname }));
          socket_2.send(JSON.stringify({ oppNickname: socket.nickname }));
          
          roomToJoin.deck = shuffleDeck(roomToJoin.deck);
          
          socket.cards = drawCards(roomToJoin.deck, 7);
          socket_2.cards = drawCards(roomToJoin.deck, 7);
          
          socket.send(JSON.stringify({ draw: socket.cards }));
          socket_2.send(JSON.stringify({ draw: socket_2.cards }));
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
            player.send(JSON.stringify({ id: player.id, x: playerData.x, y: playerData.y }));
          }
        });
        break;
      case "Play Card":

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
    console.log(`Player ${socket.nickname} - Room ${room.name} disconnected`);
  });
});

function createRoom(name, password) {
  return {
    name: name,
    password: password,
    players: [],
    deck: defaultDeck.deck
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

function shuffleDeck(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Scambio gli elementi
  }
  return array;
}

function drawCards(array, count) {
  return array.splice(-count, count);
}