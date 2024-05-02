const WebSocket = require("ws");

const port = 5000;
const wss = new WebSocket.Server({ port: port });

let gameState = [];

console.log(`running on port: ${port}`);

wss.on("connection", (socket) => {
  socket.on("message", (message) => {    
    let data = JSON.parse(message);
    
    switch (data.RequestType) {
      case "Create Room":
        
        break;
      case "Join Room":
        
        break;
      case "Join Room":
        
        break;
      default:
        break;
    }

    if (gameState.filter((el) => el.id == data.id).length > 0) {
      gameState = gameState.map((el) => {
        if (el.id == data.id) return data;
        else return el;
      });
    } else {
      console.log(`new player, id: ${data.id}`);
      gameState.push(data);
    }

    socket.send(JSON.stringify(gameState));
  });

  socket.on("close", (code, reason) => {
    gameState = gameState.filter((el) => el.id != parseInt(reason));
    console.log(`player ${reason} disconnected`);
  });
});
