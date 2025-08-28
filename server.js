import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'bhandan';

let db;

// Connect to MongoDB
MongoClient.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
})
.then(client => {
  console.log('✅ Connected to MongoDB');
  db = client.db(DATABASE_NAME);
})
.catch(error => {
  console.error('❌ MongoDB connection failed:', error);
  process.exit(1);
});

// Helper function to get database
const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

// Collections
const COLLECTIONS = {
  MESSAGES: 'family_chat_messages',
  ROOMS: 'family_chat_rooms',
  ONLINE_STATUS: 'online_status'
};

// API Routes

// Send a new message
app.post('/api/chat/send', async (req, res) => {
  try {
    const { familyId, senderId, senderName, content, messageType = 'text' } = req.body;
    
    if (!familyId || !senderId || !senderName || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const database = getDatabase();
    const messagesCollection = database.collection(COLLECTIONS.MESSAGES);
    
    const newMessage = {
      familyId,
      senderId,
      senderName,
      content,
      messageType,
      id: new ObjectId().toString(),
      timestamp: new Date(),
      status: 'sent',
      readBy: [{
        userId: senderId,
        readAt: new Date()
      }],
      isDeleted: false
    };

    const result = await messagesCollection.insertOne(newMessage);
    
    // Update family room's last message
    const roomsCollection = database.collection(COLLECTIONS.ROOMS);
    await roomsCollection.updateOne(
      { familyId },
      {
        $set: {
          lastMessage: {
            content,
            timestamp: newMessage.timestamp,
            senderName
          },
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('✅ Message sent:', newMessage.id);
    res.json({ ...newMessage, _id: result.insertedId.toString() });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get family messages
app.get('/api/chat/messages/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const database = getDatabase();
    const messagesCollection = database.collection(COLLECTIONS.MESSAGES);
    
    const messages = await messagesCollection
      .find({ 
        familyId, 
        isDeleted: false 
      })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(`✅ Retrieved ${messages.length} messages for family ${familyId}`);
    res.json(messages.reverse()); // Return in ascending order (oldest first)
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get new messages since timestamp
app.get('/api/chat/new-messages/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { since } = req.query;
    
    if (!since) {
      return res.status(400).json({ error: 'Missing since timestamp' });
    }

    const database = getDatabase();
    const messagesCollection = database.collection(COLLECTIONS.MESSAGES);
    
    const sinceDate = new Date(since);
    const newMessages = await messagesCollection
      .find({
        familyId,
        timestamp: { $gt: sinceDate },
        isDeleted: false
      })
      .sort({ timestamp: 1 })
      .toArray();

    res.json(newMessages);
  } catch (error) {
    console.error('❌ Error fetching new messages:', error);
    res.status(500).json({ error: 'Failed to fetch new messages' });
  }
});

// Update online status
app.post('/api/chat/online-status', async (req, res) => {
  try {
    const { userId, familyId, isOnline } = req.body;
    
    if (!userId || !familyId || typeof isOnline !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const database = getDatabase();
    const onlineCollection = database.collection(COLLECTIONS.ONLINE_STATUS);
    
    await onlineCollection.updateOne(
      { userId, familyId },
      {
        $set: {
          isOnline,
          lastSeen: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating online status:', error);
    res.status(500).json({ error: 'Failed to update online status' });
  }
});

// Get online family members
app.get('/api/chat/online-members/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;

    const database = getDatabase();
    const onlineCollection = database.collection(COLLECTIONS.ONLINE_STATUS);
    
    // Consider users online if they were active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineMembers = await onlineCollection
      .find({
        familyId,
        isOnline: true,
        lastSeen: { $gte: fiveMinutesAgo }
      })
      .toArray();

    const onlineUserIds = onlineMembers.map(member => member.userId);
    res.json(onlineUserIds);
  } catch (error) {
    console.error('❌ Error fetching online members:', error);
    res.status(500).json({ error: 'Failed to fetch online members' });
  }
});

// Create or update family chat room
app.post('/api/chat/room', async (req, res) => {
  try {
    const { familyId, roomName, members } = req.body;
    
    if (!familyId || !roomName || !Array.isArray(members)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const database = getDatabase();
    const roomsCollection = database.collection(COLLECTIONS.ROOMS);
    
    const roomData = {
      familyId,
      roomName,
      members,
      roomType: 'family',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await roomsCollection.updateOne(
      { familyId },
      { $set: roomData },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error creating/updating room:', error);
    res.status(500).json({ error: 'Failed to create/update room' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Chat API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
