const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Starea comenzilor curente
let orders = []; // Ex: [{ tableId: 1, items: [{ name: 'Pizza', price: 25, viewed: false }], hasNewChanges: true }]

io.on('connection', (socket) => {
  console.log('Un client s-a conectat');

  // Trimite comenzile existente clientului care se conectează
  socket.emit('orders', orders);
  console.log('Comenzi trimise la conectare:', orders);

  // Gestionare comandă nouă
  socket.on('new-order', (order) => {
    console.log(`Comandă nouă primită de la masa ${order.tableId}:`, order.items);
  
    const existingOrder = orders.find((o) => o.tableId === order.tableId);
  
    if (existingOrder) {
      const previousCount = existingOrder.items.length;
      const newItems = order.items.map((item) => ({
        ...item,
        viewed: false, // Produsele noi nu sunt vizualizate
      }));
  
      // Adaugă noile produse și setează `hasNewChanges` doar dacă există produse noi
      existingOrder.items.push(...newItems);
      existingOrder.hasNewChanges = existingOrder.items.length > previousCount;
    } else {
      // Creează o comandă nouă
      const newOrder = {
        tableId: order.tableId,
        items: order.items.map((item) => ({
          ...item,
          viewed: false,
        })),
        hasNewChanges: true, // Este o comandă complet nouă
      };
      orders.push(newOrder);
    }
  
    console.log('Comenzi după modificare:', JSON.stringify(orders, null, 2)); // Log aici
    io.emit('orders', orders); // Trimite comenzile actualizate tuturor clienților
  });
  
  // Confirmarea vizualizării comenzilor pentru o masă
socket.on('confirm-view', (tableId) => {
  console.log(`Confirmare vizualizare pentru masa ${tableId}`);
  const order = orders.find((o) => o.tableId === tableId);

  if (order) {
    // Marchează toate produsele ca fiind vizualizate
    order.items.forEach((item) => {
      item.viewed = true;
    });
    order.hasNewChanges = false; // Marchează masa ca fără modificări
  }

  console.log('Comenzi după confirmare vizualizare:', JSON.stringify(orders, null, 2));
  io.emit('orders', orders); // Trimite comenzile actualizate tuturor clienților
});

  // Gestionare resetare masă
  socket.on('reset-table', (tableId) => {
    console.log(`Resetare masă ${tableId}`);
    orders = orders.filter((order) => order.tableId !== tableId);
    console.log('Comenzi după resetare:', orders);
    io.emit('orders', orders);
  });

  socket.on('disconnect', () => {
    console.log('Un client s-a deconectat');
  });
});


const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Serverul WebSocket rulează pe http://localhost:${PORT}`);
});
