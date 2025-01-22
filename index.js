const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Permite conexiuni de la toate originile
  },
});

let orders = []; // Stocarea comenzilor în memorie

// Gestionarea conexiunilor WebSocket
io.on('connection', (socket) => {
  console.log('Un client s-a conectat');

  // Trimite comenzile existente noului client
  socket.emit('orders', orders);

  // Primește o comandă nouă
  socket.on('new-order', (order) => {
    console.log('Comandă nouă:', order);
    orders.push(order); // Adaugă comanda în lista locală
    io.emit('orders', orders); // Trimite tuturor clienților actualizați
  });

  socket.on('disconnect', () => {
    console.log('Un client s-a deconectat');
  });
});

const PORT = 4000;
server.listen(PORT, '0.0.0.0' ,() => {
  console.log(`Server WebSocket ascultă pe portul ${PORT}`);
});
