const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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
    console.log('❌ Call rejected by:', data.userName);
    // Just log for now, don't end the call
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

  // Handle WebRTC signaling
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
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
  console.log(`📊 Status available at: http://localhost:${PORT}/status`);
});
