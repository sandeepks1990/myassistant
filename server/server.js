const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Allow CORS for all origins so Electron and external web viewers can connect
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Store in-memory recent history per room (keeps last 50 Q&A items)
const roomHistory = new Map();

function getRoomHistory(room) {
  if (!roomHistory.has(room)) {
    roomHistory.set(room, []);
  }
  return roomHistory.get(room);
}

function addToRoomHistory(room, item) {
  const history = getRoomHistory(room);
  history.push(item);
  if (history.length > 50) {
    history.shift();
  }
}

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// REST endpoint alternative to push Q&A (fallback if WebSocket is blocked)
app.post('/api/push-answer', (req, res) => {
  const { room = 'default', question, answer, id = Date.now().toString() } = req.body;
  if (!answer) {
    return res.status(400).json({ error: 'Answer content is required.' });
  }

  const payload = {
    id,
    question: question || 'Audio Question',
    answer,
    timestamp: new Date().toLocaleTimeString()
  };

  addToRoomHistory(room, payload);
  io.to(room).emit('new-answer', payload);

  res.status(200).json({ success: true, payload });
});

// Socket.io real-time connection
io.on('connection', (socket) => {
  let currentRoom = 'default';

  socket.on('join-room', ({ room = 'default', role = 'viewer' }) => {
    socket.leave(currentRoom);
    currentRoom = room.trim().toLowerCase() || 'default';
    socket.join(currentRoom);

    // Send existing history to newly joined viewer
    const history = getRoomHistory(currentRoom);
    socket.emit('room-joined', { room: currentRoom, history });
  });

  // Status updates: e.g. "Listening to speaker audio...", "Gemini generating answer..."
  socket.on('status-update', ({ room = currentRoom, status, text }) => {
    socket.to(room).emit('status-update', { status, text, timestamp: Date.now() });
  });

  // Final complete answer from Electron
  socket.on('send-answer', (data) => {
    const room = (data.room || currentRoom).trim().toLowerCase();
    const payload = {
      id: data.id || Date.now().toString(),
      question: data.question || 'Audio Question',
      answer: data.answer,
      timestamp: data.timestamp || new Date().toLocaleTimeString()
    };

    addToRoomHistory(room, payload);
    io.to(room).emit('new-answer', payload);
  });

  // Clear screen event
  socket.on('clear-screen', ({ room = currentRoom }) => {
    roomHistory.set(room, []);
    io.to(room).emit('screen-cleared');
  });

  socket.on('disconnect', () => {
    // client disconnected
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
