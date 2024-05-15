const WebSocket = require("ws");
const fs = require('fs');

const port = 5000;
const wss = new WebSocket.Server({ port: port });
const defaultDeck = JSON.parse(fs.readFileSync('deck.json', 'utf8'));

let rooms = [];

console.log(`running on port: ${port}`);

wss.on("connection", (socket) => {
  socket.on("message", (message) => {
    let jsonMessage = JSON.parse(message);

    let requestType = jsonMessage.RequestType;
    let data = jsonMessage.Data;

    switch (requestType) {
      case "Create Room": {
        if (getRoomByName(data.Name)) {
          socket.send(JSON.stringify({ error: "Room already exists" }));
          return;
        }

        let room = createRoom(data.Name, data.Password);
        rooms.push(room);
        socket = joinRoom(room, socket, data.Nickname);

        console.log(`Player '${socket.nickname}' created room '${room.name}'.`);
        break;
      }
      case "Join Room": {
        let room = getRoomByName(data.Name);
        if (!room || room.password !== data.Password) {
          socket.send(JSON.stringify({ error: "Room does not exist or incorrect password" }));
          return;
        }

        let socket_2 = room.players.find((player) => player.id != socket.id);
        
        socket = joinRoom(room, socket, data.Nickname);

        room.deck = shuffleDeck(room.deck);
        socket.cards = drawCards(room.deck, 7);
        socket_2.cards = drawCards(room.deck, 7);
        room.discardPile = drawCards(room.deck, 1)[0];

        socket.send(JSON.stringify({
          responseType: 'Game Started',
          cardsDrawn: socket.cards,
          opponentNickname: socket_2.nickname,
          opponentCardsDrawnNumber: socket_2.cards.length,
          discardPile: room.discardPile
        }));

        socket_2.send(JSON.stringify({
          responseType: 'Game Started',
          cardsDrawn: socket_2.cards,
          opponentNickname: socket.nickname,
          opponentCardsDrawnNumber: socket.cards.length,
          discardPile: room.discardPile
        }));

        console.log(`Player '${socket.nickname}' joined room '${room.name}'.`);
        break;
      }
      case "Play Card": {
        let room = getRoomByName(socket.roomName);
        let socket_2 = room.players.find((player) => player.id != socket.id);

        let name = data.Name;
        let color = data.Color;
        let value = data.Value;
        
        socket.cards = socket.cards.filter(card => card !== name);
        socket_2.send(JSON.stringify({ oppCardsNumber: socket.cards.length }));
        
        room.discardPile = `${color}_${value}`;
        
        socket.send(JSON.stringify({
          responseType: 'Card Played',
          discardPile: room.discardPile,
          yourTurn: false,
        }));
        
        socket_2.send(JSON.stringify({
          responseType: 'Card Played',
          discardPile: room.discardPile,
          yourTurn: true,
        }));

        console.log(`Player '${socket.nickname}' in room '${room.name}' played card '${name}' (${color}, ${value}).`);
        
        var winner = CheckForWinner();
        if (winner != null) {
          // do something
        }

        break;
      }
      case "Draw Card": {
        let room = getRoomByName(socket.roomName);
        let socket_2 = room.players.find((player) => player.id != socket.id);
        
        let quantity = data.Quantity;

        let drawnCards = drawCards(room.deck, quantity);
        socket.cards = [...socket.cards, ...drawnCards];
        
        socket.send(JSON.stringify({
          responseType: 'Card Drawn',
          drawnCards: drawnCards
        }));

        socket_2.send(JSON.stringify({
          responseType: 'Card Drawn',
          opponentCardsDrawnNumber: drawnCards.length
        }));
        
        console.log(`Player '${socket.nickname}' has drawn ${drawnCards.length} card(s) (${drawnCards}).`);
        break;
      }
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
    console.log(`Player '${socket.nickname}' disconnected from room '${room.name}'.`);
  });
});

function createRoom(name, password) {
  return {
    name: name,
    password: password,
    players: [],
    deck: [...defaultDeck.deck], // copy the object without reference
    discardPile: null
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

function CheckForWinner(socket, socket_2) {
  if (socket.cards.length == 0) return socket;
  if (socket.cards.length == 0) return socket_2;
  return null;
}