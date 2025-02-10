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

// Stocarea separată pentru coșuri și comenzi
let carts = []; // [{tableId, items}] - pentru produse în coș
let orders = []; // [{tableId, items, hasNewChanges}] - pentru comenzi trimise

io.on('connection', (socket) => {
  console.log('Un client s-a conectat');

  // Trimite comenzile existente doar către dashboard
  socket.on('request-dashboard-data', () => {
    socket.emit('orders', orders);
  });

  // Gestionare cerere pentru coș
  socket.on('get-cart', ({ tableId }) => {
    const cart = carts.find(c => c.tableId === tableId) || { tableId, items: [] };
    const tableOrders = orders.find(o => o.tableId === tableId)?.items || [];
    socket.emit('cart-data', [...cart.items, ...tableOrders]);
  });

  // Gestionare adăugare produs în coș
  socket.on('add-to-cart', ({ tableId, item }) => {
    let cart = carts.find(c => c.tableId === tableId);
    if (!cart) {
      cart = { tableId, items: [] };
      carts.push(cart);
    }
    cart.items.push({ ...item, comandat: false });
    
    // Trimite actualizarea doar către clienții de la masa respectivă
    io.emit('cart-data', [...cart.items, ...(orders.find(o => o.tableId === tableId)?.items || [])]);
  });

  // Gestionare ștergere produs din coș
  socket.on('remove-from-cart', ({ tableId, itemIndex }) => {
    const cart = carts.find(c => c.tableId === tableId);
    if (cart) {
      cart.items.splice(itemIndex, 1);
      io.emit('cart-data', [...cart.items, ...(orders.find(o => o.tableId === tableId)?.items || [])]);
    }
  });

  // Gestionare trimitere comandă
  socket.on('new-order', ({ tableId, items }) => {
    console.log(`Comandă nouă primită de la masa ${tableId}:`, items);

    // Adaugă produsele la comenzi
    let existingOrder = orders.find(o => o.tableId === tableId);
    if (existingOrder) {
      items.forEach(item => {
        existingOrder.items.push({ ...item, comandat: true, viewed: false });
      });
      existingOrder.hasNewChanges = true;
    } else {
      orders.push({
        tableId: tableId,
        items: items.map(item => ({ ...item, comandat: true, viewed: false })),
        hasNewChanges: true
      });
    }

    // Golește coșul pentru masa respectivă
    const cartIndex = carts.findIndex(c => c.tableId === tableId);
    if (cartIndex !== -1) {
      carts[cartIndex].items = [];
    }

    // Trimite actualizări
    io.emit('orders', orders); // Actualizează dashboard-ul
    io.emit('cart-data', [...(carts.find(c => c.tableId === tableId)?.items || []), 
                         ...(orders.find(o => o.tableId === tableId)?.items || [])]); // Actualizează coșul
  });

  // Confirmarea vizualizării comenzilor
  socket.on('confirm-view', (tableId) => {
    const order = orders.find(o => o.tableId === tableId);
    if (order) {
      order.items.forEach(item => {
        item.viewed = true;
      });
      order.hasNewChanges = false;
      io.emit('orders', orders);
    }
  });

  // Solicitarea notei de plată
  socket.on('solicita-nota', ({ tableId }) => {
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

  // Resetarea mesei
  socket.on('reset-table', (tableId) => {
    orders = orders.filter(o => o.tableId !== tableId);
    carts = carts.filter(c => c.tableId !== tableId);
    io.emit('orders', orders);
    io.emit('cart-data', []); // Golește și coșul pentru masa respectivă
  });

  socket.on('disconnect', () => {
    console.log('Un client s-a deconectat');
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Serverul WebSocket rulează pe http://localhost:${PORT}`);
});
