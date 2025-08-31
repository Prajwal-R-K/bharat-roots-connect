import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Users,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { webrtcService, CallData, CallParticipant } from '@/services/webrtc-service';
import { cn } from '@/lib/utils';

interface CallManagerProps {
  user: any;
  familyMembers: any[];
  onCallEnd?: () => void;
}

export const CallManager: React.FC<CallManagerProps> = ({ 
  user, 
  familyMembers, 
  onCallEnd 
}) => {
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize WebRTC service with user information
    webrtcService.initialize(user.userId, user.familyTreeId, user.name);

    // Set up event listeners
    webrtcService.onIncomingCall = (call: CallData) => {
      console.log('📞 Incoming call in CallManager:', call);
      setIncomingCall(call);
      // Play ringtone sound
      playRingtone();
    };

    webrtcService.onCallConnected = (call: CallData) => {
      console.log('✅ Call connected in CallManager:', call);
      setCurrentCall(call);
      setIncomingCall(null);
      startCallTimer();
      stopRingtone();
    };

    webrtcService.onCallEnded = (call: CallData) => {
      setCurrentCall(null);
      setIncomingCall(null);
      setParticipants([]);
      stopCallTimer();
      stopRingtone();
      onCallEnd?.();
    };

    webrtcService.onParticipantJoined = (participant: CallParticipant) => {
      setParticipants(prev => [...prev, participant]);
    };

    webrtcService.onParticipantLeft = (userId: string) => {
      setParticipants(prev => prev.filter(p => p.userId !== userId));
    };

    webrtcService.onStreamReceived = (userId: string, stream: MediaStream) => {
      const videoElement = remoteVideosRef.current.get(userId);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    };

    return () => {
      webrtcService.disconnect();
      stopCallTimer();
      stopRingtone();
    };
  }, [user.userId, user.familyTreeId]);

  useEffect(() => {
    // Set up local video stream when call is connected
    if (currentCall && localVideoRef.current) {
      const localStream = webrtcService.getLocalStream();
      if (localStream && currentCall.callType === 'video') {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [currentCall]);

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);
  };

  const playRingtone = () => {
    // You can add actual ringtone audio here
    console.log('🔔 Playing ringtone...');
  };

  const stopRingtone = () => {
    console.log('🔇 Stopping ringtone...');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartCall = async (callType: 'voice' | 'video') => {
    try {
      const memberIds = familyMembers
        .filter(member => member.userId !== user.userId)
        .map(member => member.userId);
      
      await webrtcService.startCall(
        memberIds, 
        callType, 
        user.name, 
        user.familyTreeId
      );
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const handleAnswerCall = () => {
    if (incomingCall) {
      webrtcService.answerCall(incomingCall.callId);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      webrtcService.rejectCall(incomingCall.callId);
      setIncomingCall(null);
      stopRingtone();
    }
  };

  const handleEndCall = () => {
    webrtcService.endCall();
  };

  const handleToggleMute = () => {
    const muted = webrtcService.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleVideo = () => {
    const videoOff = webrtcService.toggleVideo();
    setIsVideoOff(videoOff);
  };

  // Incoming Call Modal
  if (incomingCall) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center max-w-sm w-full mx-4">
          <div className="mb-6">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarFallback className="text-2xl">
                {incomingCall.callerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold mb-2">{incomingCall.callerName}</h3>
            <Badge variant="outline" className="mb-2">
              {incomingCall.callType === 'video' ? 'Video Call' : 'Voice Call'}
            </Badge>
            <p className="text-sm text-gray-500">Incoming family call...</p>
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button
              onClick={handleRejectCall}
              variant="destructive"
              size="lg"
              className="rounded-full p-4"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              onClick={handleAnswerCall}
              variant="default"
              size="lg"
              className="rounded-full p-4 bg-green-500 hover:bg-green-600"
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Active Call Interface
  if (currentCall) {
    return (
      <div className={cn(
        "fixed inset-0 bg-black flex flex-col z-50",
        isFullscreen && "absolute"
      )}>
        {/* Call Header */}
        <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-green-500">
              {currentCall.callType === 'video' ? 'Video Call' : 'Voice Call'}
            </Badge>
            <span className="text-sm">Family Call</span>
          </div>
          
          <div className="text-center">
            <p className="text-sm opacity-75">Duration</p>
            <p className="font-mono">{formatDuration(callDuration)}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">{participants.length + 1}</span>
          </div>
        </div>

        {/* Video Area */}
        {currentCall.callType === 'video' && (
          <div className="flex-1 relative">
            {/* Remote Videos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 h-full p-4">
              {participants.map((participant) => (
                <div
                  key={participant.userId}
                  className="relative bg-gray-800 rounded-lg overflow-hidden"
                >
                  <video
                    ref={(el) => {
                      if (el) remoteVideosRef.current.set(participant.userId, el);
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    {participant.userName}
                  </div>
                  {participant.isMuted && (
                    <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
                      <MicOff className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 left-1 bg-black/50 text-white px-1 text-xs rounded">
                You
              </div>
            </div>
          </div>
        )}

        {/* Voice Call Interface */}
        {currentCall.callType === 'voice' && (
          <div className="flex-1 flex flex-col items-center justify-center text-white">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-8">
              {[{ userId: user.userId, userName: user.name }, ...participants].map((participant) => (
                <div key={participant.userId} className="text-center">
                  <Avatar className="w-20 h-20 mx-auto mb-3">
                    <AvatarFallback className="text-2xl">
                      {participant.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium">{participant.userName}</p>
                  {participant.userId !== user.userId && (
                    <div className="flex justify-center mt-2">
                      {participants.find(p => p.userId === participant.userId)?.isMuted && (
                        <div className="bg-red-500 rounded-full p-1">
                          <MicOff className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex justify-center items-center space-x-6 p-6 bg-gray-900">
          <Button
            onClick={handleToggleMute}
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full p-4"
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {currentCall.callType === 'video' && (
            <Button
              onClick={handleToggleVideo}
              variant={isVideoOff ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full p-4"
            >
              {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </Button>
          )}

          <Button
            onClick={() => setIsFullscreen(!isFullscreen)}
            variant="secondary"
            size="lg"
            className="rounded-full p-4"
          >
            {isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
          </Button>

          <Button
            onClick={handleEndCall}
            variant="destructive"
            size="lg"
            className="rounded-full p-4"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  // Call Start Buttons (when no active call)
  return (
    <div className="flex space-x-2">
      <Button
        onClick={() => handleStartCall('voice')}
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
      >
        <Phone className="h-4 w-4" />
        <span>Voice Call</span>
      </Button>
      <Button
        onClick={() => handleStartCall('video')}
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
      >
        <Video className="h-4 w-4" />
        <span>Video Call</span>
      </Button>
    </div>
  );
};

export default CallManager;
