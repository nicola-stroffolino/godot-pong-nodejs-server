const WebSocket = require("ws");
const fs = require("fs");

const port = 5000;
const wss = new WebSocket.Server({ port: port });
const defaultDeck = JSON.parse(fs.readFileSync("deck.json", "utf8"));

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
          socket.send(
            JSON.stringify({
              error: "Room does not exist or incorrect password",
            })
          );
          return;
        }

        let socket_2 = room.players.find((player) => player.id != socket.id);

        socket = joinRoom(room, socket, data.Nickname);

        room.deck = shuffleDeck(room.deck);
        socket.cards = drawCards(room.deck, 7);
        socket_2.cards = drawCards(room.deck, 7);
        room.discardPile = drawCards(room.deck, 1)[0];

        socket.send(
          JSON.stringify({
            responseType: "Game Started",
            cardsDrawn: socket.cards,
            opponentNickname: socket_2.nickname,
            opponentCardsDrawnNumber: socket_2.cards.length,
            discardPile: room.discardPile,
            deckCardsNumber: room.deck.length,
          })
        );

        socket_2.send(
          JSON.stringify({
            responseType: "Game Started",
            cardsDrawn: socket_2.cards,
            opponentNickname: socket.nickname,
            opponentCardsDrawnNumber: socket.cards.length,
            discardPile: room.discardPile,
            deckCardsNumber: room.deck.length,
          })
        );

        console.log(`Player '${socket.nickname}' joined room '${room.name}'.`);
        break;
      }
      case "Play Card": {
        let room = getRoomByName(socket.roomName);
        let socket_2 = room.players.find((player) => player.id != socket.id);

        let name = data.Name;
        let color = data.Color;
        let value = data.Value;

        let index = socket.cards.findIndex((card) => card === name);
        if (index !== -1) {
          socket.cards.splice(index, 1);
        } else {
          console.log(`Unexpected error, requested card not found.`);
        }

        room.discardPile = `${color}_${value}`;

        socket.send(
          JSON.stringify({
            responseType: "Card Played",
            discardPile: room.discardPile,
          })
        );

        socket_2.send(
          JSON.stringify({
            responseType: "Card Played",
            discardPile: room.discardPile,
          })
        );


        var winner = checkForWinner(socket, socket_2);
        if (winner != null) {
          console.log(`\n'${winner.nickname}' in room '${room.name}' has won!\n`);
          let loser = room.players.find((player) => player.id != winner.id);

          winner.send(
            JSON.stringify({
              responseType: "Game Ended",
              winner: true,
            })
          );

          loser.send(
            JSON.stringify({
              responseType: "Game Ended",
              winner: false,
            })
          );
          return;
        }

        switch (value) {
          case "Draw2": {
            changeTurn(socket_2);
            actionDrawCards(socket_2, 2);
            sendCheckCardsTo(socket_2);
            break;
          }
          case "Draw4": {
            changeTurn(socket_2);
            actionDrawCards(socket_2, 4);
            sendCheckCardsTo(socket_2);
            break;
          }
          case "Skip": {
            sendCheckCardsTo(socket); // this time socket needs to check its cards, because it's his turn again
            break;
          }
          case "Swap": {
            let tmp = socket.cards;
            socket.cards = socket_2.cards;
            socket_2.cards = tmp;

            socket.send(
              JSON.stringify({
                responseType: "Card Swapped",
                newCards: socket.cards,
              })
            );

            socket_2.send(
              JSON.stringify({
                responseType: "Card Swapped",
                newCards: socket_2.cards,
              })
            );
            
            changeTurn(socket_2);
            sendCheckCardsTo(socket_2);
            break;
          }
          default: 
            changeTurn(socket_2);
            sendCheckCardsTo(socket_2);
            break;
        }
        
        console.log(`Player '${socket.nickname}' in room '${room.name}' played card '${name}' (${color}, ${value}).`);

        break;
      }
      case "Draw Card": {
        let quantity = data.Quantity;
        
        actionDrawCards(socket, quantity);
        sendCheckCardsTo(socket);
        
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
      console.log(
        `Player '${socket.nickname}' disconnected from room '${room.name}'.`
      );
    }
  });
});


function createRoom(name, password) {
  return {
    name: name,
    password: password,
    players: [],
    deck: [...defaultDeck.deck], // copy the object without reference
    discardPile: null,
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
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


function checkForWinner(socket, socket_2) {
  if (socket.cards.length == 0) return socket;
  if (socket_2.cards.length == 0) return socket_2;
  return null;
}


function drawCards(array, count) {
  return array.splice(-count, count);
}


function actionDrawCards(socket, count) {
  let room = getRoomByName(socket.roomName);
  let socket_2 = room.players.find((player) => player.id != socket.id);

  let drawnCards = drawCards(room.deck, count);
  socket.cards = [...socket.cards, ...drawnCards];

  socket.send(
    JSON.stringify({
      responseType: "Card Drawn",
      drawnCards: drawnCards,
      deckCardsNumber: room.deck.length,
    })
  );

  socket_2.send(
    JSON.stringify({
      responseType: "Card Drawn",
      opponentCardsDrawnNumber: drawnCards.length,
      deckCardsNumber: room.deck.length,
    })
  );

  console.log(
    `Player '${socket.nickname}' in room '${room.name}' has drawn ${drawnCards.length} card(s) (${drawnCards}).`
  );
}


function changeTurn(socket) {
  socket.send(
    JSON.stringify({
      responseType: "Turn Changed",
      yourTurn: true,
    })
  );

  let room = getRoomByName(socket.roomName);
  let socket_2 = room.players.find((player) => player.id != socket.id);
  socket_2.send(
    JSON.stringify({
      responseType: "Turn Changed",
      yourTurn: false,
    })
  );
}

function sendCheckCardsTo(socket) {
  socket.send(JSON.stringify({ responseType: "Check Cards" }));
}
