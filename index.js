const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Stocarea comenzilor
let orders = []; // Ex: [{ tableId: 1, items: [{ name: 'Pizza', price: 25, comandat: false, viewed: false }], hasNewChanges: true }]

io.on('connection', (socket) => {
  console.log('Un client s-a conectat');

  // Trimite comenzile existente clientului care se conectează
  socket.emit('orders', orders);
  console.log('Comenzi trimise la conectare:', orders);

  // Gestionare cerere pentru coș
  socket.on('get-cart', ({ tableId }) => {
    const order = orders.find(o => o.tableId == tableId);
    socket.emit('cart-data', order ? order.items : []);
  });

  // Gestionare adăugare produs în coș
    
    socket.on('add-to-cart', ({ tableId, item }) => {
      let order = orders.find(o => o.tableId == tableId);
      if (order) {
        order.items.push({ ...item, comandat: false });
        order.hasNewChanges = true; // Setăm hasNewChanges la true
      } else {
        orders.push({ tableId: tableId, items: [{ ...item, comandat: false }], hasNewChanges: true });
      }
      io.emit('cart-data', orders.find(o => o.tableId == tableId).items);
      io.emit('orders', orders); // Emit orders to update the dashboard
    });
 

  // Gestionare ștergere produs din coș (înainte de comandă)
  socket.on('remove-from-cart', ({ tableId, itemIndex }) => {
    let order = orders.find(o => o.tableId == tableId);
    if (order) {
      order.items.splice(itemIndex, 1);
      io.emit('cart-data', order.items);
    }
  });

  // Gestionare trimitere comandă
  socket.on('new-order', ({ tableId, items }) => {
    console.log(`Comandă nouă primită de la masa ${tableId}:`, items);

    let existingOrder = orders.find(o => o.tableId === tableId);
    if (existingOrder) {
      items.forEach(item => {
        item.comandat = true; // Marchează produsele ca fiind comandate
        item.viewed = false; // Marchează produsele ca nevizualizate
        existingOrder.items.push(item);
      });
      existingOrder.hasNewChanges = true; // Setăm hasNewChanges la true
    } else {
      const newOrder = {
        tableId: tableId,
        items: items.map(item => ({ ...item, comandat: true, viewed: false })),
        hasNewChanges: true,
      };
      orders.push(newOrder);
    }

    console.log('Comenzi după trimitere:', JSON.stringify(orders, null, 2));
    io.emit('orders', orders);
  });

  // Confirmarea vizualizării comenzilor
  socket.on('confirm-view', (tableId) => {
    console.log(`Confirmare vizualizare pentru masa ${tableId}`);
    const order = orders.find(o => o.tableId === tableId);
    if (order) {
      order.items.forEach(item => {
        item.viewed = true;
      });
      order.hasNewChanges = false;
    }

    console.log('Comenzi după confirmare vizualizare:', JSON.stringify(orders, null, 2));
    io.emit('orders', orders);
  });

  // Solicitarea notei de plată (se gestionează ca o comandă nouă)
  socket.on('solicita-nota', ({ tableId }) => {
    console.log(`Nota de plată solicitată pentru masa ${tableId}`);
    const order = orders.find(o => o.tableId === tableId);
    if (order) {
      const notaItem = {
        name: "Solicitare Notă de Plată",
        price: 0,
        comandat: true,
        viewed: false
      };
      order.items.push(notaItem);
      order.hasNewChanges = true;
      io.emit('orders', orders);
    }
  });

  // Resetarea mesei (după plată)
  socket.on('reset-table', (tableId) => {
    console.log(`Resetare masă ${tableId}`);
    orders = orders.filter((order) => order.tableId !== tableId);
    io.emit('orders', orders);
  });

  // Deconectare client
  socket.on('disconnect', () => {
    console.log('Un client s-a deconectat');
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Serverul WebSocket rulează pe http://localhost:${PORT}`);
});
