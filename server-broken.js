import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017';
const client = new MongoClient(MONGODB_URI);
let db;

// Middleware
app.use(cors());
app.use(express.json());

// Track active calls and participants
let activeCall = null;
let callParticipants = new Map(); // participantId -> { id, name, isConnected }

// Socket connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
    const { signal, to } = data;
    
    // Forward signal to specific user
    socket.to(to).emit('webrtc-signal', {
      signal,
      from: socket.id
    });
    
    console.log(`🌐 WebRTC signal forwarded from ${socket.id} to ${to}`);
  });

  // WebRTC Offer/Answer signaling
  socket.on('webrtc-offer', (data) => {
    const { offer, targetUserId } = data;
    
    // Find target socket and forward offer
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId === targetUserId);
    
    if (targetSocket) {
      targetSocket.emit('webrtc-offer', {
        offer,
        fromUserId: socket.userId
      });
      console.log(`📨 WebRTC offer sent from ${socket.userId} to ${targetUserId}`);
    }
  });

  socket.on('webrtc-answer', (data) => {
    const { answer, targetUserId } = data;
    
    // Find target socket and forward answer
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId === targetUserId);
    
    if (targetSocket) {
      targetSocket.emit('webrtc-answer', {
        answer,
        fromUserId: socket.userId
      });
      console.log(`📨 WebRTC answer sent from ${socket.userId} to ${targetUserId}`);
    }
  });

  socket.on('ice-candidate', (data) => {
    const { candidate, targetUserId } = data;
    
    // Find target socket and forward ICE candidate
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId === targetUserId);
    
    if (targetSocket) {
      targetSocket.emit('ice-candidate', {
        candidate,
        fromUserId: socket.userId
      });
      console.log(`🧊 ICE candidate sent from ${socket.userId} to ${targetUserId}`);
    }
  });dleware
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

// Socket.IO for real-time communication and WebRTC signaling
const familyRooms = new Map(); // Track users in family rooms
const activeCalls = new Map(); // Track active calls

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join family room
  socket.on('join-family', (data) => {
    const { userId, familyId, userName } = data;
    
    socket.join(familyId);
    socket.userId = userId;
    socket.familyId = familyId;
    socket.userName = userName;
    
    // Track user in family room
    if (!familyRooms.has(familyId)) {
      familyRooms.set(familyId, new Set());
    }
    familyRooms.get(familyId).add(socket.id);
    
    // Notify family members that user is online
    socket.to(familyId).emit('user-online', {
      userId,
      userName,
      timestamp: new Date()
    });
    
    console.log(`✅ ${userName} joined family ${familyId}`);
  });

  // Handle call initiation
  socket.on('start-call', (callData) => {
    console.log('📞 Starting call:', callData);
    
    const { callId, familyId, callType, callerName } = callData;
    
    // Store active call
    activeCalls.set(callId, {
      ...callData,
      participants: new Set([socket.id]),
      startTime: new Date()
    });
    
    // Notify all family members about incoming call
    socket.to(familyId).emit('incoming-call', callData);
    
    console.log(`📢 ${callType} call initiated by ${callerName} in family ${familyId}`);
  });

  // Handle call acceptance
  socket.on('accept-call', (data) => {
    const { callId } = data;
    const call = activeCalls.get(callId);
    
    if (call) {
      call.participants.add(socket.id);
      
      // Notify caller that call was accepted
      socket.to(call.familyId).emit('call-accepted', {
        callId,
        acceptedBy: socket.userName || socket.userId
      });
      
      // Join call room
      socket.join(`call_${callId}`);
      
      // Notify existing participants about new participant
      socket.to(`call_${callId}`).emit('participant-joined', {
        userId: socket.userId,
        userName: socket.userName || 'Unknown'
      });
      
      console.log(`✅ ${socket.userName} accepted call ${callId}`);
    }
  });

  // Handle call rejection
  socket.on('reject-call', (data) => {
    const { callId } = data;
    const call = activeCalls.get(callId);
    
    if (call) {
      socket.to(call.familyId).emit('call-rejected', {
        callId,
        rejectedBy: socket.userName || socket.userId
      });
      
      console.log(`❌ ${socket.userName} rejected call ${callId}`);
    }
  });

  // Handle call end
  socket.on('end-call', (data) => {
    const { callId } = data;
    const call = activeCalls.get(callId);
    
    if (call) {
      // Notify all participants that call ended
      io.to(`call_${callId}`).emit('call-ended', {
        callId,
        endedBy: socket.userName || socket.userId
      });
      
      // Remove call from active calls
      activeCalls.delete(callId);
      
      console.log(`📴 Call ${callId} ended by ${socket.userName}`);
    }
  });

  // WebRTC signaling for peer-to-peer connection
  socket.on('webrtc-signal', (data) => {
    const { signal, to } = data;
    
    // Forward signal to specific user
    socket.to(to).emit('webrtc-signal', {
      signal,
      from: socket.id
    });
    
    console.log(`� WebRTC signal forwarded from ${socket.id} to ${to}`);
  });

  // Handle typing indicators for chat
  socket.on('typing-start', () => {
    if (socket.familyId) {
      socket.to(socket.familyId).emit('user-typing', {
        userId: socket.userId,
        userName: socket.userName
      });
    }
  });

  socket.on('typing-stop', () => {
    if (socket.familyId) {
      socket.to(socket.familyId).emit('user-stop-typing', {
        userId: socket.userId
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
    
    if (socket.familyId && socket.userId) {
      // Remove from family room tracking
      const familyRoom = familyRooms.get(socket.familyId);
      if (familyRoom) {
        familyRoom.delete(socket.id);
        if (familyRoom.size === 0) {
          familyRooms.delete(socket.familyId);
        }
      }
      
      // Notify family members that user went offline
      socket.to(socket.familyId).emit('user-offline', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });
      
      // Handle active calls
      for (const [callId, call] of activeCalls.entries()) {
        if (call.participants.has(socket.id)) {
          call.participants.delete(socket.id);
          
          // If caller disconnected, end the call
          if (call.callerId === socket.id) {
            io.to(`call_${callId}`).emit('call-ended', {
              callId,
              endedBy: socket.userName || 'Unknown'
            });
            activeCalls.delete(callId);
          } else {
            // Notify remaining participants
            socket.to(`call_${callId}`).emit('participant-left', {
              userId: socket.userId
            });
          }
        }
      }
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO enabled for real-time communication`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
