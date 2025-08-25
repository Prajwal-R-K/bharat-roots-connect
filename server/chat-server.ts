// Simple Node.js server for real-time chat functionality
// This is a basic implementation - in production, you'd want a more robust setup

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { MongoClient } from 'mongodb';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite dev server
    methods: ["GET", "POST"]
  }
});

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'bhandan';

let db: any = null;

// Connect to MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }
}

app.use(cors());
app.use(express.json());

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join family chat room
  socket.on('join_family_room', (familyTreeId) => {
    socket.join(familyTreeId);
    console.log(`User ${socket.id} joined family room: ${familyTreeId}`);
  });

  // Handle new message
  socket.on('new_message', async (messageData) => {
    try {
      // Save message to database
      if (db) {
        await db.collection('messages').insertOne({
          ...messageData,
          timestamp: new Date()
        });
      }

      // Broadcast to all users in the family room
      socket.to(messageData.familyTreeId).emit('message_received', messageData);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    socket.to(data.familyTreeId).emit('user_typing', {
      userId: data.userId,
      userName: data.userName
    });
  });

  socket.on('typing_stop', (data) => {
    socket.to(data.familyTreeId).emit('user_stopped_typing', {
      userId: data.userId
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'Chat server is running!' });
});

app.get('/api/messages/:familyTreeId', async (req, res) => {
  try {
    const { familyTreeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const messages = await db.collection('messages')
      .find({ familyTreeId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const messageData = req.body;
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const result = await db.collection('messages').insertOne({
      ...messageData,
      timestamp: new Date()
    });

    res.json({ success: true, messageId: result.insertedId });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

const PORT = process.env.PORT || 3001;

// Initialize database and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Chat server running on port ${PORT}`);
    console.log(`🌐 Socket.IO server ready for connections`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });
});

export default app;
