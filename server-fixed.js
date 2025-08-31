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

  // Join family room
  socket.on('join-family-room', (familyId) => {
    socket.join(`family-${familyId}`);
    console.log(`👨‍👩‍👧‍👦 User ${socket.id} joined family room: family-${familyId}`);
  });

  // Handle call initiation
  socket.on('initiate-call', (data) => {
    console.log('📞 Call initiation request:', data);
    
    // Check if there's already an active call
    if (activeCall) {
      socket.emit('call-blocked', {
        message: 'Another call is already in progress',
        activeCallId: activeCall.callId,
        activeCallType: activeCall.callType
      });
      console.log('🚫 Call blocked - another call active:', activeCall.callId);
      return;
    }

    // Start new call
    activeCall = {
      callId: data.callId,
      callerId: data.callerId,
      callerName: data.callerName,
      callType: data.callType,
      familyId: data.familyId,
      startTime: new Date()
    };

    // Initialize participants with caller
    callParticipants.clear();
    callParticipants.set(data.callerId, {
      id: data.callerId,
      name: data.callerName,
      isConnected: true,
      role: 'caller'
    });

    // Broadcast to all family members
    socket.to(`family-${data.familyId}`).emit('incoming-call', {
      callId: data.callId,
      callerId: data.callerId,
      callerName: data.callerName,
      callType: data.callType
    });

    // Send current participants to caller immediately
    socket.emit('call-participants-updated', {
      participants: Array.from(callParticipants.values())
    });

    console.log('📱 Call initiated and broadcast to family. Active call:', activeCall.callId);
  });

  // Handle call acceptance
  socket.on('accept-call', (data) => {
    console.log('✅ Call accepted by:', data);
    
    if (!activeCall || activeCall.callId !== data.callId) {
      socket.emit('call-error', { message: 'Invalid or expired call' });
      return;
    }

    // Add participant to call
    callParticipants.set(data.userId, {
      id: data.userId,
      name: data.userName,
      isConnected: true,
      role: 'participant'
    });

    // Notify all participants about the new joiner
    io.to(`family-${activeCall.familyId}`).emit('user-joined-call', {
      userId: data.userId,
      userName: data.userName,
      participants: Array.from(callParticipants.values())
    });

    // Send call accepted confirmation with participants
    socket.emit('call-accepted', {
      callId: data.callId,
      participants: Array.from(callParticipants.values())
    });

    console.log(`🎉 ${data.userName} joined the call. Total participants:`, callParticipants.size);
  });

  // Handle call rejection
  socket.on('reject-call', (data) => {
    console.log('❌ Call rejected by user:', data);
    // Just log for now, the leave-call event will handle participant removal
  });

  // Handle call end
  socket.on('end-call', (data) => {
    console.log('📴 Call ended by:', data);
    
    if (activeCall) {
      // Notify all participants that call ended
      io.to(`family-${activeCall.familyId}`).emit('call-ended', {
        callId: activeCall.callId,
        endedBy: data.userId
      });

      // Clear call state
      activeCall = null;
      callParticipants.clear();
      
      console.log('📴 Call completely ended and state cleared');
    }
  });

  // Handle participant leaving
  socket.on('leave-call', (data) => {
    console.log('👋 Participant leaving call:', data);
    
    if (activeCall && callParticipants.has(data.userId)) {
      callParticipants.delete(data.userId);
      
      // Notify remaining participants immediately
      const remainingParticipants = Array.from(callParticipants.values());
      io.to(`family-${activeCall.familyId}`).emit('user-left-call', {
        userId: data.userId,
        userName: data.userName,
        callId: data.callId,
        participants: remainingParticipants
      });

      console.log(`👋 ${data.userName} left the call. Remaining participants:`, remainingParticipants.length);

      // If no participants left, end the call
      if (callParticipants.size === 0) {
        console.log('📴 Call ended - no participants remaining');
        io.to(`family-${activeCall.familyId}`).emit('call-ended', {
          callId: activeCall.callId,
          endedBy: 'system-no-participants'
        });
        activeCall = null;
      }
    }
  });

  // Handle call state synchronization after page refresh
  socket.on('sync-call-state', (data) => {
    console.log('🔄 Call state sync requested:', data);
    
    if (activeCall && activeCall.callId === data.callId) {
      // Check if user is already in the call participants
      const isInCall = callParticipants.has(data.userId);
      
      // Send current call state and participants to the requesting user
      socket.emit('call-state-synced', {
        callId: activeCall.callId,
        callData: activeCall,
        participants: Array.from(callParticipants.values())
      });
      
      if (isInCall) {
        // User is already in call, send active call state
        socket.emit('call-participants-updated', {
          participants: Array.from(callParticipants.values())
        });
        console.log('📡 Restored call state for existing participant:', data.userId);
      } else {
        // User was not in call, treat as incoming call
        socket.emit('incoming-call', {
          callId: activeCall.callId,
          callerId: activeCall.callerId,
          callerName: activeCall.callerName,
          callType: activeCall.callType
        });
        console.log('📡 Sent incoming call to user who missed it:', data.userId);
      }
      
      console.log('📡 Call state synchronized for user:', data.userId);
    } else {
      console.log('❌ No matching active call to sync for:', data.userId, 'Active call:', activeCall?.callId);
      // Clear any stale state on client side
      socket.emit('call-ended', {
        callId: data.callId,
        endedBy: 'system-not-found'
      });
    }
  });

  // WebRTC signaling
  socket.on('webrtc-offer', (data) => {
    socket.to(data.targetId).emit('webrtc-offer', {
      offer: data.offer,
      callerId: socket.id
    });
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(data.targetId).emit('webrtc-answer', {
      answer: data.answer,
      answerId: socket.id
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.targetId).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      fromId: socket.id
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
    
    // Remove from active call if present
    for (let [participantId, participant] of callParticipants) {
      if (participantId === socket.id) {
        callParticipants.delete(participantId);
        
        if (activeCall) {
          io.to(`family-${activeCall.familyId}`).emit('user-left-call', {
            userId: participantId,
            userName: participant.name,
            participants: Array.from(callParticipants.values())
          });
        }
        break;
      }
    }

    // End call if no participants left
    if (callParticipants.size === 0 && activeCall) {
      activeCall = null;
      console.log('📴 Call ended due to all participants disconnecting');
    }
  });
});

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    db = client.db('bharat-roots-connect');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

// Family chat routes
app.post('/api/family/room', async (req, res) => {
  try {
    const { familyId, familyName } = req.body;
    
    const room = {
      familyId,
      familyName,
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    const result = await db.collection('family_rooms').insertOne(room);
    res.json({ success: true, roomId: result.insertedId });
  } catch (error) {
    console.error('Error creating family room:', error);
    res.status(500).json({ error: 'Failed to create family room' });
  }
});

app.post('/api/family/message', async (req, res) => {
  try {
    const { familyId, senderId, senderName, message, messageType = 'text' } = req.body;
    
    const newMessage = {
      familyId,
      senderId,
      senderName,
      message,
      messageType,
      timestamp: new Date(),
      isRead: false
    };
    
    const result = await db.collection('family_messages').insertOne(newMessage);
    
    // Emit real-time message to family room
    io.to(`family-${familyId}`).emit('new-message', {
      ...newMessage,
      _id: result.insertedId
    });
    
    res.json({ success: true, messageId: result.insertedId });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/api/family/messages/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await db.collection('family_messages')
      .find({ familyId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .toArray();
    
    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    activeCall: activeCall,
    participants: Array.from(callParticipants.values()),
    timestamp: new Date().toISOString()
  });
});

// Start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Socket.IO server running on port ${PORT}`);
    console.log(`📊 Status available at: http://localhost:${PORT}/status`);
  });
});
