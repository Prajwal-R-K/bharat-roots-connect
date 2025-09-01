import { io, Socket } from 'socket.io-client';

export interface CallData {
  callId: string;
  callerId: string;
  callerName: string;
  familyId: string;
  callType: 'voice' | 'video';
  participants: string[];
  status: 'ringing' | 'connected' | 'ended' | 'missed';
  startTime?: Date;
  endTime?: Date;
}

export interface CallParticipant {
  userId: string;
  userName: string;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
}

class WebRTCService {
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private currentCall: CallData | null = null;
  private participants: Map<string, CallParticipant> = new Map();
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private isInitialized = false;
  private isConnected = false;
  private currentUser: any = null;

  // Call state persistence keys
  private readonly CALL_STATE_KEY = 'webrtc_call_state';
  private readonly CALL_PARTICIPANTS_KEY = 'webrtc_call_participants';

  // ICE servers for NAT traversal
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  // Event callbacks
  public onIncomingCall: ((call: CallData) => void) | null = null;
  public onCallStarted: ((call: CallData) => void) | null = null; // New callback for when caller starts a call
  public onCallConnected: ((call: CallData) => void) | null = null;
  public onCallAccepted: ((call: CallData) => void) | null = null; // New callback for when call is accepted
  public onCallEnded: ((call: CallData) => void) | null = null;
  public onParticipantJoined: ((participant: CallParticipant) => void) | null = null;
  public onParticipantLeft: ((userId: string) => void) | null = null;
  public onStreamReceived: ((userId: string, stream: MediaStream) => void) | null = null;
  public onConnectionStatusChanged: ((connected: boolean) => void) | null = null;

  // Save call state to localStorage
  private saveCallState(): void {
    try {
      if (this.currentCall) {
        const callState = {
          ...this.currentCall,
          startTime: this.currentCall.startTime?.toISOString(),
          endTime: this.currentCall.endTime?.toISOString(),
          isUserCaller: this.currentCall.callerId === this.currentUser?.userId,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(this.CALL_STATE_KEY, JSON.stringify(callState));
        
        const participantsArray = Array.from(this.participants.entries()).map(([id, participant]) => [id, {
          ...participant,
          stream: null // Can't serialize MediaStream
        }]);
        localStorage.setItem(this.CALL_PARTICIPANTS_KEY, JSON.stringify(participantsArray));
        
        console.log('💾 Call state saved to localStorage with UI context');
      }
    } catch (error) {
      console.error('❌ Failed to save call state:', error);
    }
  }

  // Restore call state from localStorage
  private restoreCallState(): boolean {
    try {
      const savedCallState = localStorage.getItem(this.CALL_STATE_KEY);
      const savedParticipants = localStorage.getItem(this.CALL_PARTICIPANTS_KEY);
      
      if (savedCallState) {
        const callData = JSON.parse(savedCallState);
        
        // Convert ISO strings back to Date objects
        if (callData.startTime) callData.startTime = new Date(callData.startTime);
        if (callData.endTime) callData.endTime = new Date(callData.endTime);
        
        // Only restore if call is still active (not ended and not too old)
        const now = new Date();
        const callAge = callData.startTime ? now.getTime() - callData.startTime.getTime() : 0;
        const maxCallAge = 2 * 60 * 60 * 1000; // 2 hours
        
        if (callData.status !== 'ended' && callAge < maxCallAge) {
          this.currentCall = callData;
          
          // Restore participants
          if (savedParticipants) {
            const participantsArray = JSON.parse(savedParticipants);
            this.participants.clear();
            participantsArray.forEach(([id, participant]) => {
              this.participants.set(id, participant);
            });
          }
          
          console.log('🔄 Call state restored from localStorage:', callData.callId);
          return true;
        } else {
          console.log('🧹 Clearing old call state');
          this.clearCallState();
        }
      }
    } catch (error) {
      console.error('❌ Failed to restore call state:', error);
      this.clearCallState();
    }
    return false;
  }

  // Clear call state from localStorage
  private clearCallState(): void {
    try {
      localStorage.removeItem(this.CALL_STATE_KEY);
      localStorage.removeItem(this.CALL_PARTICIPANTS_KEY);
      console.log('🧹 Call state cleared from localStorage');
    } catch (error) {
      console.error('❌ Failed to clear call state:', error);
    }
  }

  async initialize(userId: string, familyId: string, userName?: string): Promise<void> {
    // Prevent multiple initializations
    if (this.isInitialized && this.isConnected && this.socket?.connected) {
      console.log('WebRTC Service already initialized and connected');
      return;
    }

    try {
      console.log('🔄 Initializing WebRTC Service...', { userId, familyId, userName });
      
      this.currentUser = { userId, familyId, userName };
      
      // Only disconnect if we have a different socket or user
      if (this.socket && (
        this.socket.disconnected || 
        this.currentUser.userId !== userId || 
        this.currentUser.familyId !== familyId
      )) {
        console.log('🔄 Disconnecting existing socket for reinitialization');
        this.socket.disconnect();
        this.socket = null;
        this.isConnected = false;
        this.isInitialized = false;
      }
      
      // Create new socket only if needed
      if (!this.socket) {
        this.socket = io('http://localhost:3001', {
          query: { userId, familyId, userName },
          timeout: 15000,
          transports: ['websocket', 'polling'],
          forceNew: true
        });

        await this.waitForConnection();
        this.setupSocketListeners();
      }
      
      this.isInitialized = true;
      console.log('✅ WebRTC Service initialized successfully');
      
      // Try to restore any existing call state
      const hasRestoredCall = this.restoreCallState();
      if (hasRestoredCall && this.currentCall) {
        console.log('🔄 Restored active call, notifying UI:', this.currentCall.callId);
        
        // Determine if user is caller or receiver and trigger appropriate callback
        const isUserCaller = this.currentCall.callerId === userId;
        
        // Always restore participants first
        this.participants.forEach(participant => {
          this.onParticipantJoined?.(participant);
        });
        
        // Trigger UI callbacks based on call status and user role
        if (isUserCaller) {
          // For caller, check call status to determine UI state
          if (this.currentCall.status === 'ringing') {
            // Still ringing - show calling interface
            this.onCallStarted?.(this.currentCall);
            console.log('📞 Restored caller calling interface for call:', this.currentCall.callId);
          } else if (this.currentCall.status === 'connected') {
            // Call is connected - show active call interface
            this.onCallStarted?.(this.currentCall);
            // Also trigger call accepted to transition to active state
            setTimeout(() => {
              this.onCallAccepted?.(this.currentCall!);
            }, 100);
            console.log('📞 Restored caller active interface for call:', this.currentCall.callId);
          }
        } else {
          // For receiver, show the active call interface
          this.onCallConnected?.(this.currentCall);
          console.log('📞 Restored receiver interface for call:', this.currentCall.callId);
        }
        
        // Request current call state from server to sync - but don't rejoin family room yet
        if (this.socket && this.socket.connected) {
          // First sync the call state
          this.socket.emit('sync-call-state', { 
            callId: this.currentCall.callId,
            userId: userId 
          });
          
          // Then rejoin the family room after a short delay to ensure sync completes
          setTimeout(() => {
            if (this.socket && this.currentUser) {
              this.socket.emit('join-family-room', this.currentUser.familyId);
              this.socket.emit('join-family', {
                userId: this.currentUser.userId,
                familyId: this.currentUser.familyId,
                userName: this.currentUser.userName || 'Unknown'
              });
              console.log('🏠 Re-joined family rooms after call restoration');
            }
          }, 500);
        }
      } else {
        // No call to restore, join family room normally
        if (this.socket && this.socket.connected && this.currentUser) {
          this.socket.emit('join-family-room', this.currentUser.familyId);
          this.socket.emit('join-family', {
            userId: this.currentUser.userId,
            familyId: this.currentUser.familyId,
            userName: this.currentUser.userName || 'Unknown'
          });
          console.log('🏠 Joined family rooms during normal initialization');
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC service:', error);
      this.isInitialized = false;
      this.isConnected = false;
      throw error;
    }
  }

  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not created'));
        return;
      }

      // Check if already connected
      if (this.socket.connected) {
        this.isConnected = true;
        console.log('🔗 Socket already connected:', this.socket.id);
        this.onConnectionStatusChanged?.(true);
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 15 seconds'));
      }, 15000);

      // Remove existing listeners to prevent duplicates
      this.socket.off('connect');
      this.socket.off('connect_error');
      this.socket.off('disconnect');

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.isConnected = true;
        console.log('🔗 Socket connected to server:', this.socket?.id);
        this.onConnectionStatusChanged?.(true);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Socket connection error:', error);
        this.isConnected = false;
        this.onConnectionStatusChanged?.(false);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected from server, reason:', reason);
        this.isConnected = false;
        this.onConnectionStatusChanged?.(false);
        
        // Don't auto-reconnect if it was a manual disconnect
        if (reason !== 'io client disconnect') {
          console.log('🔄 Attempting to reconnect...');
        }
      });
    });
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Remove any existing listeners to prevent duplicates
    this.socket.removeAllListeners('incoming-call');
    this.socket.removeAllListeners('call-accepted');
    this.socket.removeAllListeners('call-rejected');
    this.socket.removeAllListeners('call-ended');
    this.socket.removeAllListeners('participant-joined');
    this.socket.removeAllListeners('participant-left');
    this.socket.removeAllListeners('user-joined-call');
    this.socket.removeAllListeners('call-participants-synced');
    this.socket.removeAllListeners('stream-data');
    this.socket.removeAllListeners('webrtc-offer');
    this.socket.removeAllListeners('webrtc-answer');
    this.socket.removeAllListeners('ice-candidate');

    // Join family room after connection is established (always join to receive notifications)
    if (this.currentUser && this.isConnected) {
      // Join both family room formats for compatibility
      this.socket.emit('join-family-room', this.currentUser.familyId);
      this.socket.emit('join-family', {
        userId: this.currentUser.userId,
        familyId: this.currentUser.familyId,
        userName: this.currentUser.userName || 'Unknown'
      });
      console.log('🏠 [DEBUG] Joined family rooms during initialization:', this.currentUser.familyId);
    }

    // Call events
    this.socket.on('incoming-call', (callData: CallData) => {
      console.log('📞 Incoming call received:', callData);
      console.log('🔍 Current user ID:', this.currentUser?.userId);
      console.log('🔍 Call from:', callData.callerId);
      
      // Prevent duplicate incoming calls
      if (this.currentCall && this.currentCall.callId === callData.callId) {
        console.log('⚠️ Duplicate incoming call ignored:', callData.callId);
        return;
      }
      
      // If there's already an active call, automatically reject this incoming call
      if (this.currentCall) {
        console.log('⚠️ Rejecting incoming call - already in call:', callData.callId);
        this.socket.emit('reject-call', { 
          callId: callData.callId, 
          reason: 'user_busy' 
        });
        return;
      }
      
      this.currentCall = callData;
      this.onIncomingCall?.(callData);
    });

    this.socket.on('call-accepted', (data: { callId: string, acceptedBy: string, acceptedByName?: string, participants?: any[] }) => {
      console.log('✅ Call accepted by:', data.acceptedBy);
      if (this.currentCall) {
        this.currentCall.status = 'connected';
        this.currentCall.startTime = new Date();
        
        // Update participants list from server data if provided
        if (data.participants) {
          console.log('🔄 Updating participants from server:', data.participants);
          this.participants.clear();
          data.participants.forEach(p => {
            if (p.id !== this.currentUser?.userId) {
              const participant: CallParticipant = {
                userId: p.id,
                userName: p.name,
                isMuted: p.isMuted || false,
                isVideoOff: p.isVideoOff || false
              };
              this.participants.set(p.id, participant);
              this.onParticipantJoined?.(participant);
            }
          });
        } else {
          // Fallback: add the participant who accepted
          if (data.acceptedBy !== this.currentUser?.userId) {
            const participant: CallParticipant = {
              userId: data.acceptedBy,
              userName: data.acceptedByName || 'Family Member',
              isMuted: false,
              isVideoOff: false
            };
            this.participants.set(data.acceptedBy, participant);
            console.log('🔄 Adding participant who accepted:', participant.userName);
            this.onParticipantJoined?.(participant);
          }
        }
        
        // Save updated state
        this.saveCallState();
        
        // Trigger the call accepted callback (for caller to transition from calling to active)
        this.onCallAccepted?.(this.currentCall);
      }
    });

    this.socket.on('call-rejected', (data: { callId: string, rejectedBy: string }) => {
      console.log('❌ Call rejected by:', data.rejectedBy);
      this.endCall();
    });

    this.socket.on('call-ended', (data: { callId: string, endedBy: string }) => {
      console.log('📴 Call ended by:', data.endedBy);
      this.endCall();
    });

    this.socket.on('participant-joined', (data: { userId: string, userName: string }) => {
      console.log('👤 Participant joined:', data.userName);
      const participant: CallParticipant = {
        userId: data.userId,
        userName: data.userName,
        isMuted: false,
        isVideoOff: false
      };
      this.participants.set(data.userId, participant);
      this.onParticipantJoined?.(participant);
    });

    this.socket.on('participant-left', (data: { userId: string }) => {
      console.log('👤 Participant left:', data.userId);
      this.participants.delete(data.userId);
      this.onParticipantLeft?.(data.userId);
    });

    // Handle when someone joins the call (specific to our implementation)
    this.socket.on('user-joined-call', (data: { userId: string, userName: string, callId: string }) => {
      console.log('👤 User joined call:', data.userName, 'CallId:', data.callId);
      if (this.currentCall && this.currentCall.callId === data.callId) {
        const participant: CallParticipant = {
          userId: data.userId,
          userName: data.userName,
          isMuted: false,
          isVideoOff: false
        };
        this.participants.set(data.userId, participant);
        console.log('🔄 Real-time participant added:', data.userName);
        this.onParticipantJoined?.(participant);
        
        // Save updated state
        this.saveCallState();
        
        // Request participant sync to ensure everyone has the latest list
        this.socket.emit('sync-call-participants', { callId: data.callId });
      }
    });

    // Handle when someone leaves the call (specific to our implementation)
    this.socket.on('user-left-call', (data: { userId: string, userName: string, callId: string, participants?: any[] }) => {
      console.log('👤 User left call:', data.userName, 'CallId:', data.callId);
      if (this.currentCall && this.currentCall.callId === data.callId) {
        // Remove the participant
        this.participants.delete(data.userId);
        console.log('🔄 Real-time participant removed:', data.userName);
        this.onParticipantLeft?.(data.userId);
        
        // Save updated state
        this.saveCallState();
        
        // If participants list is provided, sync with it
        if (data.participants) {
          console.log('🔄 Syncing participants after user left:', data.participants.length);
          this.participants.clear();
          data.participants.forEach(p => {
            if (p.userId !== this.currentUser?.userId) { // Don't add yourself
              const participant: CallParticipant = {
                userId: p.userId,
                userName: p.userName,
                isMuted: p.isMuted || false,
                isVideoOff: p.isVideoOff || false
              };
              this.participants.set(p.userId, participant);
            }
          });
        }
      }
    });

    // Handle participant list synchronization
    this.socket.on('call-participants-synced', (data: { callId: string, participants: any[] }) => {
      console.log('🔄 Syncing call participants:', data.participants);
      if (this.currentCall && this.currentCall.callId === data.callId) {
        // Clear current participants and rebuild from server data
        this.participants.clear();
        data.participants.forEach(p => {
          if (p.userId !== this.currentUser?.userId) { // Don't add yourself
            const participant: CallParticipant = {
              userId: p.userId,
              userName: p.userName,
              isMuted: p.isMuted || false,
              isVideoOff: p.isVideoOff || false
            };
            this.participants.set(p.userId, participant);
          }
        });
        // Trigger a full UI refresh
        console.log('🔄 Participants synced, current count:', this.participants.size);
      }
    });

    // Handle call state synchronization response
    this.socket.on('call-state-synced', (data: { callId: string, callData: any, participants: any[] }) => {
      console.log('🔄 Received call state sync:', data);
      if (this.currentCall && this.currentCall.callId === data.callId) {
        // Update participants from server
        this.participants.clear();
        data.participants.forEach(p => {
          if (p.id !== this.currentUser?.userId) { // Don't add yourself
            const participant: CallParticipant = {
              userId: p.id,
              userName: p.name,
              isMuted: p.isMuted || false,
              isVideoOff: p.isVideoOff || false
            };
            this.participants.set(p.id, participant);
          }
        });
        
        // Update call data
        this.currentCall.status = data.callData.status || 'connected';
        
        // Save updated state
        this.saveCallState();
        
        console.log('✅ Call state synchronized with server, participants:', this.participants.size);
      }
    });

    // WebRTC signaling events
    this.socket.on('webrtc-offer', (data: { offer: RTCSessionDescriptionInit, fromUserId: string }) => {
      console.log('📨 Received WebRTC offer from:', data.fromUserId);
      this.handleOffer(data.offer, data.fromUserId);
    });

    this.socket.on('webrtc-answer', (data: { answer: RTCSessionDescriptionInit, fromUserId: string }) => {
      console.log('📨 Received WebRTC answer from:', data.fromUserId);
      this.handleAnswer(data.answer, data.fromUserId);
    });

    this.socket.on('ice-candidate', (data: { candidate: RTCIceCandidateInit, fromUserId: string }) => {
      console.log('🧊 Received ICE candidate from:', data.fromUserId);
      this.handleIceCandidate(data.candidate, data.fromUserId);
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('🚨 Socket error:', error);
    });
  }

  async startCall(familyMembers: string[], callType: 'voice' | 'video', callerName: string, familyId: string): Promise<string> {
    if (!this.socket || !this.socket.connected) {
      console.error('❌ Cannot start call: Socket not connected', { 
        hasSocket: !!this.socket, 
        isConnected: this.isConnected,
        socketConnected: this.socket?.connected 
      });
      throw new Error('Socket not connected. Please wait for connection or refresh the page.');
    }

    // Check if there's already an active call
    if (this.currentCall) {
      console.warn('⚠️ Cannot start new call: Call already in progress');
      throw new Error('A call is already in progress. Please end the current call before starting a new one.');
    }

    // Update internal state to match socket state
    if (this.socket.connected && !this.isConnected) {
      this.isConnected = true;
      console.log('🔄 Updated connection state to match socket state');
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📞 Starting call...', { callId, callType, familyMembers, callerName, familyId });

    // Check and request permissions first
    try {
      console.log('🔐 Checking media permissions...');
      await this.checkMediaPermissions(callType);
      console.log('✅ Media permissions granted');
    } catch (error) {
      console.error('❌ Media permissions denied:', error);
      throw error;
    }

    // Get user media for the call
    try {
      await this.getUserMedia(callType);
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      throw error;
    }

    const callData: CallData = {
      callId,
      callerId: this.currentUser?.userId || this.socket.id || '',
      callerName,
      familyId,
      callType,
      participants: familyMembers,
      status: 'ringing'
    };

    this.currentCall = callData;
    
    // Save call state to persist across page refreshes
    this.saveCallState();

    // Show calling UI to the caller immediately
    if (this.onCallStarted) {
      this.onCallStarted(callData);
    }

    // Emit call to family members with debug logging
    console.log('📤 Emitting start-call to server:', callData);
    console.log('🔗 Socket connected:', this.socket.connected);
    console.log('👥 Family members to call:', familyMembers);
    this.socket.emit('start-call', callData);

    // Create peer connections for all family members except self
    const otherMembers = familyMembers.filter(memberId => memberId !== this.currentUser?.userId);
    for (const memberId of otherMembers) {
      await this.createOffer(memberId);
    }

    console.log(`📢 ${callType} call initiated:`, callId);
    return callId;
  }

  async answerCall(callId: string): Promise<void> {
    if (!this.socket || !this.currentCall) {
      throw new Error('No active call to answer');
    }

    // Prevent multiple answer attempts for the same call
    if (this.currentCall.status !== 'ringing') {
      console.log('⚠️ Call already answered or ended:', this.currentCall.status);
      return;
    }

    console.log('✅ Answering call:', callId);

    // Update call status immediately to prevent duplicate answers
    this.currentCall.status = 'connected';

    // Check and request permissions first
    try {
      console.log('🔐 Checking media permissions for answer...');
      await this.checkMediaPermissions(this.currentCall.callType);
      console.log('✅ Media permissions granted for answer');
    } catch (error) {
      console.error('❌ Media permissions denied for answer:', error);
      // Revert status on error
      this.currentCall.status = 'ringing';
      throw error;
    }

    // Get user media based on call type
    try {
      await this.getUserMedia(this.currentCall.callType);
    } catch (error) {
      console.error('❌ Failed to get user media for answer:', error);
      // Revert status on error
      this.currentCall.status = 'ringing';
      throw error;
    }

    // Accept the call with user information for immediate participant updates
    this.socket.emit('accept-call', { 
      callId,
      acceptedBy: this.currentUser?.userId,
      acceptedByName: this.currentUser?.name
    });
    
    // Notify others that this user joined the call (redundant but ensures delivery)
    this.socket.emit('user-joined-call', { 
      callId, 
      familyId: this.currentCall.familyId,
      userId: this.currentUser?.userId,
      userName: this.currentUser?.name
    });
    
    // Create peer connections for other participants
    if (this.currentCall) {
      const otherParticipants = this.currentCall.participants.filter(
        participantId => participantId !== this.currentUser?.userId
      );
      
      // Note: Peer connections will be established through WebRTC offers/answers
      // The caller already sent offers, we just need to respond with answers
      console.log('🤝 Ready for peer connections with:', otherParticipants);
    }
    
    console.log('📞 Call answered successfully:', callId);
  }

  rejectCall(callId: string): void {
    if (!this.socket) return;

    console.log('❌ Rejecting call:', callId);
    
    // Emit reject-call with proper field names
    this.socket.emit('reject-call', { 
      callId,
      rejectedBy: this.currentUser?.userId || this.socket.id,
      rejectedByName: this.currentUser?.name || 'Unknown User'
    });
    
    // Clean up local state without ending the call for others
    this.cleanup();
    if (this.currentCall) {
      this.currentCall.status = 'ended';
      this.currentCall.endTime = new Date();
      this.onCallEnded?.(this.currentCall);
      this.currentCall = null;
      
      // Clear call state since this user rejected/left
      this.clearCallState();
    }
  }

  endCall(): void {
    if (!this.currentCall) return;

    const callId = this.currentCall.callId;
    console.log('📴 Ending call:', callId);

    if (this.socket) {
      // Notify that this user is leaving the call
      this.socket.emit('leave-call', { 
        callId, 
        userId: this.currentUser?.userId || this.socket.id,
        userName: this.currentUser?.name || 'Unknown User'
      });
      
      // Also emit end-call for full call termination if needed
      this.socket.emit('end-call', { callId });
    }

    // Clean up local resources
    this.cleanup();

    if (this.currentCall) {
      this.currentCall.status = 'ended';
      this.currentCall.endTime = new Date();
      this.onCallEnded?.(this.currentCall);
      this.currentCall = null;
      
      // Clear call state from storage since call ended
      this.clearCallState();
    }
  }

  private async getUserMedia(callType: 'voice' | 'video'): Promise<MediaStream> {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      }

      // Request permissions first
      console.log(`🎤 Requesting ${callType} permissions...`);

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        },
        video: callType === 'video' ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log(`✅ Got ${callType} stream:`, {
        id: this.localStream.id,
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length
      });
      
      // Log track details
      this.localStream.getAudioTracks().forEach(track => {
        console.log('🎤 Audio track:', track.label, 'enabled:', track.enabled);
      });
      
      if (callType === 'video') {
        this.localStream.getVideoTracks().forEach(track => {
          console.log('📹 Video track:', track.label, 'enabled:', track.enabled);
        });
      }
      
      return this.localStream;
    } catch (error: any) {
      console.error('❌ Error getting user media:', error);
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera/microphone access denied. Please allow access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera/microphone found. Please connect a camera/microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera/microphone is already in use by another application. Please close other applications and try again.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Camera/microphone does not meet the requirements. Please try with different settings.');
      } else if (error.name === 'SecurityError') {
        throw new Error('Camera/microphone access blocked due to security settings. Please use HTTPS or allow access in browser settings.');
      } else {
        throw new Error(`Media access error: ${error.message || 'Unknown error'}`);
      }
    }
  }

  // Media controls
  toggleMute(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      console.log('🔇 Audio muted:', !audioTrack.enabled);
      return !audioTrack.enabled;
    }
    return false;
  }

  toggleVideo(): boolean {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      console.log('📹 Video disabled:', !videoTrack.enabled);
      return !videoTrack.enabled;
    }
    return false;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getParticipants(): CallParticipant[] {
    return Array.from(this.participants.values());
  }

  getCurrentCall(): CallData | null {
    return this.currentCall;
  }

  // Expose generic event subscription helpers so other features can reuse the same socket
  // without creating duplicate connections.
  public on<T = any>(event: string, handler: (data: T) => void): void {
    if (!this.socket) return;
    this.socket.on(event, handler as any);
  }

  public off(event: string, handler?: (...args: any[]) => void): void {
    if (!this.socket) return;
    if (handler) {
      this.socket.off(event, handler as any);
    } else {
      this.socket.removeAllListeners(event);
    }
  }

  // Check and request media permissions
  async checkMediaPermissions(callType: 'voice' | 'video'): Promise<{ audio: boolean; video: boolean }> {
    const permissions = { audio: false, video: false };

    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        const audioPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        permissions.audio = audioPermission.state === 'granted';

        if (callType === 'video') {
          const videoPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          permissions.video = videoPermission.state === 'granted';
        }

        console.log('🔍 Current permissions:', permissions);
      } else {
        console.log('⚠️ Permissions API not available, will request during getUserMedia');
      }

      // If permissions are not granted, try to request them
      if (!permissions.audio || (callType === 'video' && !permissions.video)) {
        console.log('📋 Requesting media permissions...');
        
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video'
          });
          
          // Stop the temporary stream
          stream.getTracks().forEach(track => track.stop());
          
          permissions.audio = true;
          if (callType === 'video') {
            permissions.video = true;
          }
        } catch (error: any) {
          console.error('❌ Permission request failed:', error.name);
          throw new Error(`Permission denied: ${error.message}`);
        }
      }

      return permissions;
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      throw error;
    }
  }

  // Get available media devices
  async getMediaDevices(): Promise<{ audioInputs: MediaDeviceInfo[]; videoInputs: MediaDeviceInfo[]; audioOutputs: MediaDeviceInfo[] }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('Media devices enumeration not supported');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const result = {
        audioInputs: devices.filter(device => device.kind === 'audioinput'),
        videoInputs: devices.filter(device => device.kind === 'videoinput'), 
        audioOutputs: devices.filter(device => device.kind === 'audiooutput')
      };

      console.log('🎤📹 Available devices:', {
        microphones: result.audioInputs.length,
        cameras: result.videoInputs.length,
        speakers: result.audioOutputs.length
      });

      return result;
    } catch (error) {
      console.error('❌ Error getting media devices:', error);
      throw error;
    }
  }

  // Test media access (useful for debugging)
  async testMediaAccess(callType: 'voice' | 'video'): Promise<boolean> {
    try {
      console.log(`🧪 Testing ${callType} access...`);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });

      console.log('✅ Media access test successful:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      });

      // Stop test stream
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error: any) {
      console.error('❌ Media access test failed:', error.name, error.message);
      return false;
    }
  }

  // Create a peer connection for a specific user
  private createPeerConnection(userId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          targetUserId: userId
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('📹 Received remote stream from:', userId);
      const [remoteStream] = event.streams;
      if (this.onStreamReceived) {
        this.onStreamReceived(userId, remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('✅ Peer connection established with:', userId);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.removePeerConnection(userId);
      }
    };

    // Add local stream tracks to the peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    this.peerConnections.set(userId, pc);
    return pc;
  }

  // Remove peer connection
  private removePeerConnection(userId: string) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
      console.log('🗑️ Removed peer connection for:', userId);
    }
  }

  // Create and send offer to a peer
  private async createOffer(userId: string) {
    const pc = this.createPeerConnection(userId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (this.socket) {
        this.socket.emit('webrtc-offer', {
          offer,
          targetUserId: userId
        });
      }
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      this.removePeerConnection(userId);
    }
  }

  // Handle received offer
  private async handleOffer(offer: RTCSessionDescriptionInit, fromUserId: string) {
    const pc = this.createPeerConnection(fromUserId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (this.socket) {
        this.socket.emit('webrtc-answer', {
          answer,
          targetUserId: fromUserId
        });
      }
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      this.removePeerConnection(fromUserId);
    }
  }

  // Handle received answer
  private async handleAnswer(answer: RTCSessionDescriptionInit, fromUserId: string) {
    const pc = this.peerConnections.get(fromUserId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('❌ Error handling answer:', error);
        this.removePeerConnection(fromUserId);
      }
    }
  }

  // Handle received ICE candidate
  private async handleIceCandidate(candidate: RTCIceCandidateInit, fromUserId: string) {
    const pc = this.peerConnections.get(fromUserId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
      }
    }
  }

  private cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped track:', track.kind);
      });
      this.localStream = null;
    }
    
    // Close all peer connections
    this.peerConnections.forEach((pc, userId) => {
      pc.close();
      console.log('🗑️ Closed peer connection for:', userId);
    });
    this.peerConnections.clear();
    
    // Clear participants
    this.participants.clear();
  }

  getConnectionStatus(): { connected: boolean; initialized: boolean } {
    return {
      connected: this.isConnected && !!this.socket?.connected,
      initialized: this.isInitialized
    };
  }

  disconnect() {
    console.log('🔌 Disconnecting WebRTC Service...');
    
    this.cleanup();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isInitialized = false;
    this.isConnected = false;
    this.currentCall = null;
    this.onConnectionStatusChanged?.(false);
    console.log('✅ WebRTC Service disconnected');
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;
