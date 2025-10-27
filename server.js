import 'dotenv/config';
import express from 'express';
import { MongoClient, ObjectId, GridFSBucket } from 'mongodb';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';

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
let gridFSBucket; // GridFS bucket for storing images

// Middleware
app.use(cors());
app.use(express.json());

// Multer setup for handling multipart/form-data uploads (store in memory, then stream to GridFS)
const upload = multer({ storage: multer.memoryStorage() });

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
    // Notify about active call if exists
    if (activeCall && activeCall.familyId === familyId) {
      socket.emit('incoming-call', {
        callId: activeCall.callId,
        callerId: activeCall.callerId,
        callerName: activeCall.callerName,
        callType: activeCall.callType,
        familyId: activeCall.familyId
      });
      console.log('[DEBUG] Notified newly joined user about active call:', activeCall.callId);
    }
  });

  // Handle join family (different from join-family-room)
  socket.on('join-family', (data) => {
    const { familyId, userId, userName } = data;
    socket.join(`family-${familyId}`);
    socket.familyId = familyId;
    socket.userId = userId;
    socket.userName = userName;
    console.log(`👨‍👩‍👧‍👦 User ${userName} (${userId}) joined family: family-${familyId}`);
  });

  // Handle start-call (alias for initiate-call)
  socket.on('start-call', (data) => {
    console.log('[DEBUG] 📞 start-call received:', data);
    // Process the call directly instead of just emitting back to caller
    handleInitiateCall(socket, data);
  });

  // Handle user joined call notification
  socket.on('user-joined-call', (data) => {
    console.log('👤 User joined call:', data);
    const { callId, familyId, userId, userName } = data;
    socket.to(`family-${familyId}`).emit('user-joined-call', {
      callId,
      userId,
      userName,
      timestamp: new Date()
    });
  });

  // Handle sync call participants
  socket.on('sync-call-participants', (data) => {
    console.log('🔄 Sync call participants:', data);
    const { callId } = data;
    if (activeCall && activeCall.callId === callId) {
      socket.emit('call-participants-synced', {
        callId,
        participants: activeCall.participants || []
      });
    }
  });

  // Handle call initiation
  function handleInitiateCall(socket, data) {
    console.log('[DEBUG] 📞 initiate-call received:', data);
    
    // Check if there's already an active call
    if (activeCall) {
      socket.emit('call-blocked', {
        message: 'Another call is already in progress',
        activeCallId: activeCall.callId,
        activeCallType: activeCall.callType
      });
      console.log('[DEBUG] 🚫 Call blocked - another call active:', activeCall.callId);
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
    console.log('[DEBUG] New activeCall created:', activeCall);

    // Initialize participants with caller
    callParticipants.clear();
    callParticipants.set(data.callerId, {
      id: data.callerId,
      name: data.callerName,
      isConnected: true,
      role: 'caller'
    });
    console.log('[DEBUG] Caller added to callParticipants:', data.callerId);

    // Broadcast to all family members
    const roomName = `family-${data.familyId}`;
    const roomSockets = io.sockets.adapter.rooms.get(roomName);
    console.log('[DEBUG] Broadcasting incoming-call to room:', roomName);
    if (roomSockets) {
      console.log(`[DEBUG] Sockets in room ${roomName}:`, Array.from(roomSockets));
    } else {
      console.log(`[DEBUG] No sockets found in room ${roomName}`);
    }
    
    // Broadcast to ALL family members (including caller for confirmation)
    console.log('[DEBUG] Emitting incoming-call to room:', roomName, 'with data:', {
      callId: data.callId,
      callerId: data.callerId,
      callerName: data.callerName,
      callType: data.callType,
      familyId: data.familyId
    });
    io.to(roomName).emit('incoming-call', {
      callId: data.callId,
      callerId: data.callerId,
      callerName: data.callerName,
      callType: data.callType,
      familyId: data.familyId
    });
    console.log('[DEBUG] incoming-call emitted successfully');

    // Send current participants to caller immediately
    socket.emit('call-participants-updated', {
      participants: Array.from(callParticipants.values())
    });

    console.log('📱 Call initiated and broadcast to family. Active call:', activeCall.callId);
  }

  // Handle call initiation
  socket.on('initiate-call', (data) => {
    handleInitiateCall(socket, data);
  });

  // Handle call acceptance
  socket.on('accept-call', (data) => {
    console.log('✅ Call accepted by:', data);
    
    if (!activeCall || activeCall.callId !== data.callId) {
      socket.emit('call-error', { message: 'Invalid or expired call' });
      return;
    }

    // Add participant to call
    callParticipants.set(data.acceptedBy, {
      id: data.acceptedBy,
      name: data.acceptedByName,
      isConnected: true,
      role: 'participant'
    });

    // Notify ALL participants (including caller) about the acceptance
    io.to(`family-${activeCall.familyId}`).emit('call-accepted', {
      callId: data.callId,
      acceptedBy: data.acceptedBy,
      acceptedByName: data.acceptedByName,
      participants: Array.from(callParticipants.values())
    });

    // Also emit user-joined-call for real-time updates
    io.to(`family-${activeCall.familyId}`).emit('user-joined-call', {
      userId: data.acceptedBy,
      userName: data.acceptedByName,
      callId: data.callId,
      participants: Array.from(callParticipants.values())
    });

    console.log(`🎉 ${data.acceptedByName} joined the call. Total participants:`, callParticipants.size);
    console.log('📊 Current participants:', Array.from(callParticipants.values()));
  });

  // Handle call rejection
  socket.on('reject-call', (data) => {
    console.log('❌ Call rejected by user:', data);
    
    if (activeCall && activeCall.callId === data.callId) {
      // Notify all participants about the rejection
      io.to(`family-${activeCall.familyId}`).emit('call-rejected', {
        callId: data.callId,
        rejectedBy: data.rejectedBy,
        rejectedByName: data.rejectedByName
      });
      
      console.log(`❌ ${data.rejectedByName} rejected the call`);
    }
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
        callId: data.callId || activeCall.callId,
        participants: remainingParticipants
      });

      console.log(`👋 ${data.userName} left the call. Remaining participants:`, remainingParticipants.length);
      console.log('📊 Updated participant list:', remainingParticipants.map(p => p.name));

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

  // Handle participant synchronization requests
  socket.on('sync-call-participants', (data) => {
    console.log('🔄 Syncing call participants for:', data.callId);
    
    if (activeCall && activeCall.callId === data.callId) {
      const participants = Array.from(callParticipants.values());
      
      // Send updated participant list to all family members
      io.to(`family-${activeCall.familyId}`).emit('call-participants-synced', {
        callId: data.callId,
        participants: participants
      });
      
      console.log('📊 Participants synced:', participants.length, 'participants');
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

  // Handle ICE candidate exchange (used by webrtc-service)
  socket.on('ice-candidate', (data) => {
    console.log('🧊 ICE candidate received:', data);
    socket.to(data.targetSocketId).emit('ice-candidate', data);
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
    db = client.db('bhandan');
    // Initialize GridFS bucket for images
    gridFSBucket = new GridFSBucket(db, { bucketName: 'chat_images' });
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

// Chat API routes (compatible with ChatInterface)
app.post('/api/chat/send', async (req, res) => {
  try {
    const { familyId, senderId, senderName, content, messageType = 'text' } = req.body;
    
    const newMessage = {
      id: new ObjectId().toString(),
      familyId,
      senderId,
      senderName,
      content,
      message: content, // For compatibility with family_messages collection
      messageType,
      timestamp: new Date(),
      status: 'sent',
      readBy: [],
      isDeleted: false,
      isRead: false
    };
    
    const result = await db.collection('family_chat_messages').insertOne(newMessage);
    
    // Emit real-time message to family room
    io.to(`family-${familyId}`).emit('new-message', {
      ...newMessage,
      _id: result.insertedId
    });
    
    res.json({ 
      success: true, 
      message: {
        ...newMessage,
        _id: result.insertedId
      }
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/api/chat/messages/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    const messages = await db.collection('family_chat_messages')
      .find({ familyId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray();
    
    // Transform messages to match ChatMessage interface
    const transformedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      id: msg.id || msg._id.toString(),
      familyId: msg.familyId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      content: msg.content || msg.message,
      timestamp: msg.timestamp,
      status: msg.status || 'sent',
      messageType: msg.messageType || 'text',
      readBy: msg.readBy || [],
      isDeleted: msg.isDeleted || false,
      imageId: msg.imageId,
      imageUrl: msg.imageUrl
    }));
    
    res.json(transformedMessages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Upload chat image and create an image message
app.post('/api/chat/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { familyId, senderId, senderName, content: caption } = req.body;
    if (!familyId || !senderId || !senderName) {
      return res.status(400).json({ error: 'Missing required fields: familyId, senderId, senderName' });
    }

    // Stream the file buffer to GridFS
    const uploadStream = gridFSBucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: {
        uploadedAt: new Date(),
        familyId,
        senderId,
        senderName,
        size: req.file.size
      }
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error:', err);
      res.status(500).json({ error: 'Failed to upload image' });
    });

    uploadStream.on('finish', async () => {
      const imageId = uploadStream.id.toString();
      const imageUrl = `/api/chat/image/${imageId}`;

      const newMessage = {
        id: new ObjectId().toString(),
        familyId,
        senderId,
        senderName,
        content: caption && String(caption).trim().length > 0 ? String(caption) : req.file.originalname,
        message: caption && String(caption).trim().length > 0 ? String(caption) : req.file.originalname,
        messageType: 'image',
        timestamp: new Date(),
        status: 'sent',
        readBy: [],
        isDeleted: false,
        imageId,
        imageUrl
      };

      const result = await db.collection('family_chat_messages').insertOne(newMessage);

      // Emit real-time message to family room
      io.to(`family-${familyId}`).emit('new-message', {
        ...newMessage,
        _id: result.insertedId
      });

      res.json({ success: true, message: { ...newMessage, _id: result.insertedId } });
    });
  } catch (error) {
    console.error('Error uploading chat image:', error);
    res.status(500).json({ error: 'Failed to upload chat image' });
  }
});

// Stream image from GridFS by id
app.get('/api/chat/image/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const _id = new ObjectId(id);
    // Find file metadata to set headers
    const fileDoc = await db.collection('chat_images.files').findOne({ _id });
    if (!fileDoc) {
      return res.status(404).json({ error: 'Image not found' });
    }
    const contentType = fileDoc.contentType || fileDoc.metadata?.contentType;
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    const readStream = gridFSBucket.openDownloadStream(_id);
    readStream.on('error', (err) => {
      console.error('GridFS read error:', err);
      res.status(500).end();
    });
    readStream.pipe(res);
  } catch (error) {
    console.error('Error retrieving image:', error);
    res.status(500).json({ error: 'Failed to retrieve image' });
  }
});

app.get('/api/chat/new-messages/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { since } = req.query;
    
    if (!since) {
      return res.status(400).json({ error: 'since parameter is required' });
    }
    
    const sinceDate = new Date(since);
    const messages = await db.collection('family_chat_messages')
      .find({ 
        familyId,
        timestamp: { $gt: sinceDate }
      })
      .sort({ timestamp: 1 })
      .toArray();
    
    // Transform messages to match ChatMessage interface
    const transformedMessages = messages.map(msg => ({
      _id: msg._id,
      id: msg.id || msg._id.toString(),
      familyId: msg.familyId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      content: msg.content || msg.message,
      timestamp: msg.timestamp,
      status: msg.status || 'sent',
      messageType: msg.messageType || 'text',
      readBy: msg.readBy || [],
      isDeleted: msg.isDeleted || false,
      imageId: msg.imageId,
      imageUrl: msg.imageUrl
    }));
    
    res.json(transformedMessages);
  } catch (error) {
    console.error('Error fetching new messages:', error);
    res.status(500).json({ error: 'Failed to fetch new messages' });
  }
});

app.post('/api/chat/room', async (req, res) => {
  try {
    const { familyId, roomName, roomType = 'family', members } = req.body;
    
    const room = {
      familyId,
      roomName,
      roomType,
      members: members || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('family_rooms').insertOne(room);
    res.json({ success: true, room: { ...room, _id: result.insertedId } });
  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.post('/api/chat/online-status', async (req, res) => {
  try {
    const { userId, familyId, isOnline } = req.body;
    
    const status = {
      userId,
      familyId,
      isOnline,
      lastSeen: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('online_status').replaceOne(
      { userId, familyId },
      status,
      { upsert: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating online status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.get('/api/chat/online-members/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    
    const onlineMembers = await db.collection('online_status')
      .find({ familyId, isOnline: true })
      .toArray();
    
    res.json({ onlineMembers });
  } catch (error) {
    console.error('Error fetching online members:', error);
    res.status(500).json({ error: 'Failed to fetch online members' });
  }
});

// Family Posts API endpoints
app.post('/api/posts/create', upload.array('images', 10), async (req, res) => {
  try {
    const { familyId, userId, userName, description } = req.body;
    
    if (!familyId || !userId || !userName) {
      return res.status(400).json({ error: 'Missing required fields: familyId, userId, userName' });
    }

    const images = [];
    
    // Process uploaded images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadStream = gridFSBucket.openUploadStream(file.originalname, {
          contentType: file.mimetype,
          metadata: {
            uploadedAt: new Date(),
            familyId,
            userId,
            userName,
            size: file.size,
            type: 'post_image'
          }
        });

        uploadStream.end(file.buffer);
        
        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
        });

        images.push({
          imageId: uploadStream.id.toString(),
          imageUrl: `/api/posts/image/${uploadStream.id.toString()}`,
          originalName: file.originalname
        });
      }
    }

    const newPost = {
      id: new ObjectId().toString(),
      familyId,
      userId,
      userName,
      description: description || '',
      images,
      likes: [],
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('family_posts').insertOne(newPost);
    
    // Emit real-time notification to family members
    io.to(`family-${familyId}`).emit('new-post', {
      ...newPost,
      _id: result.insertedId
    });

    res.json({ 
      success: true, 
      post: { ...newPost, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.get('/api/posts/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { limit = 20, skip = 0 } = req.query;
    
    const posts = await db.collection('family_posts')
      .find({ familyId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray();
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, userName } = req.body;
    
    if (!userId || !userName) {
      return res.status(400).json({ error: 'Missing userId or userName' });
    }

    const post = await db.collection('family_posts').findOne({ id: postId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingLike = post.likes.find(like => like.userId === userId);
    let updatedLikes;
    
    if (existingLike) {
      // Unlike
      updatedLikes = post.likes.filter(like => like.userId !== userId);
    } else {
      // Like
      updatedLikes = [...post.likes, { userId, userName, likedAt: new Date() }];
    }

    await db.collection('family_posts').updateOne(
      { id: postId },
      { 
        $set: { 
          likes: updatedLikes,
          updatedAt: new Date()
        }
      }
    );

    // Emit real-time update
    io.to(`family-${post.familyId}`).emit('post-liked', {
      postId,
      likes: updatedLikes,
      action: existingLike ? 'unlike' : 'like',
      userId,
      userName
    });

    res.json({ success: true, likes: updatedLikes });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

app.post('/api/posts/:postId/comment', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, userName, comment } = req.body;
    
    if (!userId || !userName || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const post = await db.collection('family_posts').findOne({ id: postId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const newComment = {
      id: new ObjectId().toString(),
      userId,
      userName,
      comment: comment.trim(),
      createdAt: new Date()
    };

    const updatedComments = [...post.comments, newComment];

    await db.collection('family_posts').updateOne(
      { id: postId },
      { 
        $set: { 
          comments: updatedComments,
          updatedAt: new Date()
        }
      }
    );

    // Emit real-time update
    io.to(`family-${post.familyId}`).emit('post-commented', {
      postId,
      comment: newComment,
      totalComments: updatedComments.length
    });

    res.json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Stream post images from GridFS
app.get('/api/posts/image/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const _id = new ObjectId(id);
    
    const fileDoc = await db.collection('chat_images.files').findOne({ _id });
    if (!fileDoc) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const contentType = fileDoc.contentType || fileDoc.metadata?.contentType;
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    const readStream = gridFSBucket.openDownloadStream(_id);
    readStream.on('error', (err) => {
      console.error('GridFS read error:', err);
      res.status(500).end();
    });
    readStream.pipe(res);
  } catch (error) {
    console.error('Error retrieving post image:', error);
    res.status(500).json({ error: 'Failed to retrieve image' });
  }
});

// Profile photo upload endpoint
app.post('/api/profile/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, familyId } = req.body;
    if (!userId || !familyId) {
      return res.status(400).json({ error: 'Missing required fields: userId, familyId' });
    }

    // Check if database and GridFS are initialized
    if (!db || !gridFSBucket) {
      console.error('Database or GridFS bucket not initialized');
      return res.status(500).json({ error: 'Database not ready' });
    }

    console.log('Uploading profile photo for user:', userId, 'file:', req.file.originalname);

    // Stream the file buffer to GridFS
    const uploadStream = gridFSBucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: {
        uploadedAt: new Date(),
        userId,
        familyId,
        size: req.file.size,
        type: 'profile_photo'
      }
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to upload profile photo' });
      }
    });

    uploadStream.on('finish', async () => {
      try {
        const photoId = uploadStream.id.toString();
        const photoUrl = `/api/profile/photo/${photoId}`;

        console.log('Profile photo uploaded successfully:', photoId);

        if (!res.headersSent) {
          res.json({ 
            success: true, 
            photoId,
            photoUrl,
            message: 'Profile photo uploaded successfully'
          });
        }
      } catch (finishError) {
        console.error('Error in upload finish handler:', finishError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to complete upload' });
        }
      }
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ error: 'Failed to upload profile photo' });
  }
});

// Get profile photo by ID
app.get('/api/profile/photo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if database and GridFS are initialized
    if (!db || !gridFSBucket) {
      console.error('Database or GridFS bucket not initialized');
      return res.status(500).json({ error: 'Database not ready' });
    }

    const _id = new ObjectId(id);
    
    console.log('Retrieving profile photo:', id);
    
    // Find file metadata to set headers
    const fileDoc = await db.collection('chat_images.files').findOne({ _id });
    if (!fileDoc) {
      console.log('Profile photo not found in database:', id);
      return res.status(404).json({ error: 'Profile photo not found' });
    }
    
    console.log('Found profile photo metadata:', fileDoc.filename, fileDoc.contentType);
    
    const contentType = fileDoc.contentType || fileDoc.metadata?.contentType;
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    const readStream = gridFSBucket.openDownloadStream(_id);
    readStream.on('error', (err) => {
      console.error('GridFS read error:', err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
    readStream.pipe(res);
  } catch (error) {
    console.error('Error retrieving profile photo:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to retrieve profile photo' });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
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

// Debug endpoint to check Gemini status
app.get('/api/relationship/status', async (req, res) => {
  try {
    const geminiService = await import('./services/gemini-service.js');
    res.json({
      geminiAvailable: geminiService.isGeminiAvailable(),
      apiKeySet: !!process.env.GEMINI_API_KEY,
      apiKeyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
connectDB().then(async () => {
  // Initialize Gemini API
  const geminiService = await import('./services/gemini-service.js');
  const geminiApiKey = process.env.GEMINI_API_KEY;
  geminiService.initializeGemini(geminiApiKey);
  
  server.listen(PORT, () => {
    console.log(`🚀 Socket.IO server running on port ${PORT}`);
    console.log(`📊 Status available at: http://localhost:${PORT}/status`);
  });
});


// Relationship analysis endpoint
app.post('/api/relationship/analyze', async (req, res) => {
  try {
    const { personAId, personBId, familyId } = req.body;
    
    // Validate request parameters
    if (!personAId || !personBId || !familyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: personAId, personBId, familyId'
      });
    }
    
    if (personAId === personBId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot analyze relationship between the same person'
      });
    }
    
    // Check if Gemini is available
    const geminiService = await import('./services/gemini-service.js');
    
    if (!geminiService.isGeminiAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Relationship analysis service is not configured. Please set GEMINI_API_KEY environment variable.'
      });
    }
    
    // Import Neo4j functions
    const neo4jService = await import('./services/neo4j-relationship-service.js');
    
    // Get person details
    const [personA, personB] = await Promise.all([
      neo4jService.getPersonDetails(personAId, familyId),
      neo4jService.getPersonDetails(personBId, familyId)
    ]);
    
    if (!personA || !personB) {
      return res.status(404).json({
        success: false,
        error: 'One or both persons not found in the family tree'
      });
    }
    
    // Get relationship path from Neo4j
    const path = await neo4jService.getRelationshipPath(personAId, personBId, familyId);
    
    if (!path) {
      return res.json({
        success: true,
        analysis: `No direct relationship path found between ${personA.name} and ${personB.name} in the family tree.`,
        path: null
      });
    }
    
    // Analyze relationship with Gemini
    const analysis = await geminiService.analyzeRelationship(path, personA, personB);
    
    res.json({
      success: true,
      analysis,
      path
    });
    
  } catch (error) {
    console.error('❌ Error analyzing relationship:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze relationship. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
