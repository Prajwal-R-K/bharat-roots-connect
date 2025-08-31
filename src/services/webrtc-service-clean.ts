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
  private isInitialized = false;
  private currentUser: any = null;

  // Event callbacks
  public onIncomingCall: ((call: CallData) => void) | null = null;
  public onCallConnected: ((call: CallData) => void) | null = null;
  public onCallEnded: ((call: CallData) => void) | null = null;
  public onParticipantJoined: ((participant: CallParticipant) => void) | null = null;
  public onParticipantLeft: ((userId: string) => void) | null = null;
  public onStreamReceived: ((userId: string, stream: MediaStream) => void) | null = null;

  async initialize(userId: string, familyId: string, userName?: string) {
    if (this.isInitialized) {
      console.log('WebRTC Service already initialized');
      return;
    }

    try {
      console.log('🔄 Initializing WebRTC Service...', { userId, familyId, userName });
      
      this.currentUser = { userId, familyId, userName };
      
      // Connect to Socket.IO server
      this.socket = io('http://localhost:3001', {
        query: { userId, familyId, userName }
      });

      this.setupSocketListeners();
      this.isInitialized = true;
      
      console.log('✅ WebRTC Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC service:', error);
      throw error;
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔗 Socket connected to server:', this.socket?.id);
      
      // Join family room
      if (this.currentUser) {
        this.socket?.emit('join-family', {
          userId: this.currentUser.userId,
          familyId: this.currentUser.familyId,
          userName: this.currentUser.userName || 'Unknown'
        });
      }
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected from server');
    });

    // Call events
    this.socket.on('incoming-call', (callData: CallData) => {
      console.log('📞 Incoming call received:', callData);
      this.currentCall = callData;
      this.onIncomingCall?.(callData);
    });

    this.socket.on('call-accepted', (data: { callId: string, acceptedBy: string }) => {
      console.log('✅ Call accepted by:', data.acceptedBy);
      if (this.currentCall) {
        this.currentCall.status = 'connected';
        this.currentCall.startTime = new Date();
        this.onCallConnected?.(this.currentCall);
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

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('🚨 Socket error:', error);
    });
  }

  async startCall(familyMembers: string[], callType: 'voice' | 'video', callerName: string, familyId: string): Promise<string> {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📞 Starting call...', { callId, callType, familyMembers });

    // Get user media for the call
    try {
      await this.getUserMedia(callType);
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      throw new Error('Failed to access camera/microphone');
    }

    const callData: CallData = {
      callId,
      callerId: this.socket.id || '',
      callerName,
      familyId,
      callType,
      participants: familyMembers,
      status: 'ringing'
    };

    this.currentCall = callData;

    // Emit call to family members
    this.socket.emit('start-call', callData);

    console.log(`📢 ${callType} call initiated:`, callId);
    return callId;
  }

  async answerCall(callId: string): Promise<void> {
    if (!this.socket || !this.currentCall) {
      throw new Error('No active call to answer');
    }

    console.log('✅ Answering call:', callId);

    // Get user media based on call type
    try {
      await this.getUserMedia(this.currentCall.callType);
    } catch (error) {
      console.error('❌ Failed to get user media for answer:', error);
      throw new Error('Failed to access camera/microphone');
    }

    // Accept the call
    this.socket.emit('accept-call', { callId });
    
    console.log('📞 Call answered successfully:', callId);
  }

  rejectCall(callId: string): void {
    if (!this.socket) return;

    console.log('❌ Rejecting call:', callId);
    this.socket.emit('reject-call', { callId });
    this.endCall();
  }

  endCall(): void {
    if (!this.currentCall) return;

    const callId = this.currentCall.callId;
    console.log('📴 Ending call:', callId);

    if (this.socket) {
      this.socket.emit('end-call', { callId });
    }

    // Clean up local resources
    this.cleanup();

    if (this.currentCall) {
      this.currentCall.status = 'ended';
      this.currentCall.endTime = new Date();
      this.onCallEnded?.(this.currentCall);
      this.currentCall = null;
    }
  }

  private async getUserMedia(callType: 'voice' | 'video'): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video' ? { width: 640, height: 480 } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log(`📹 Got ${callType} stream:`, this.localStream.id);
      
      return this.localStream;
    } catch (error) {
      console.error('❌ Error getting user media:', error);
      throw error;
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

  private cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped track:', track.kind);
      });
      this.localStream = null;
    }
    
    // Clear participants
    this.participants.clear();
  }

  disconnect() {
    console.log('🔌 Disconnecting WebRTC Service...');
    
    this.cleanup();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isInitialized = false;
    this.currentCall = null;
    console.log('✅ WebRTC Service disconnected');
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;
