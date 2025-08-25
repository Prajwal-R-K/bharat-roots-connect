// Simple Express API for chat functionality
// This connects to MongoDB and provides REST endpoints for the chat

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'bhandan';
let db = null;

// Middleware
app.use(cors({
  origin: ['http://localhost:8082', 'http://localhost:5173'], // Allow Vite dev servers
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB:', DB_NAME);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Chat API is running!', 
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

// Get messages for a family
app.get('/api/messages/:familyTreeId', async (req, res) => {
  try {
    const { familyTreeId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const messages = await db.collection('messages')
      .find({ familyTreeId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    // Return in chronological order
    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Save a new message
app.post('/api/messages', async (req, res) => {
  try {
    const messageData = req.body;
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Validate required fields
    if (!messageData.familyTreeId || !messageData.senderId || !messageData.message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const message = {
      ...messageData,
      timestamp: new Date(),
      messageId: messageData.messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const result = await db.collection('messages').insertOne(message);
    res.json({ 
      success: true, 
      messageId: result.insertedId,
      message: message
    });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Create or get chat room
app.post('/api/chatroom', async (req, res) => {
  try {
    const { familyTreeId, members } = req.body;
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Check if chat room already exists
    let chatRoom = await db.collection('chatrooms').findOne({ familyTreeId });
    
    if (!chatRoom) {
      // Create new chat room
      chatRoom = {
        familyTreeId,
        members,
        createdAt: new Date()
      };
      
      await db.collection('chatrooms').insertOne(chatRoom);
    } else {
      // Update members if needed
      await db.collection('chatrooms').updateOne(
        { familyTreeId },
        { $set: { members } }
      );
      chatRoom.members = members;
    }

    res.json(chatRoom);
  } catch (error) {
    console.error('Error handling chat room:', error);
    res.status(500).json({ error: 'Failed to handle chat room' });
  }
});

// Get chat room info
app.get('/api/chatroom/:familyTreeId', async (req, res) => {
  try {
    const { familyTreeId } = req.params;
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const chatRoom = await db.collection('chatrooms').findOne({ familyTreeId });
    res.json(chatRoom);
  } catch (error) {
    console.error('Error fetching chat room:', error);
    res.status(500).json({ error: 'Failed to fetch chat room' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
async function startServer() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 Chat API server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💬 Ready to handle chat requests!`);
  });
}

startServer().catch(console.error);
