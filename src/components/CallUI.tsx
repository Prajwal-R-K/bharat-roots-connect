import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Users,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { webrtcService, CallData, CallParticipant } from '@/services/webrtc-service';
import { addCallNotification } from '@/components/CallNotifications';
import { cn } from '@/lib/utils';

interface CallUIProps {
  user: any;
  familyMembers: any[];
}

export const CallUI: React.FC<CallUIProps> = ({ user, familyMembers }) => {
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [isCaller, setIsCaller] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout>();

  // Format call duration
  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start call timer
  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // Stop call timer
  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = undefined;
    }
    setCallDuration(0);
  };

  useEffect(() => {
    // Set up WebRTC event listeners
    webrtcService.onIncomingCall = (call: CallData) => {
      console.log('📞 Incoming call UI received:', call);
      setIncomingCall(call);
      
      // Add notification
      addCallNotification({
        type: 'call-started',
        callerName: call.callerName,
        callType: call.callType
      });
      
      // Play ringtone (browser notification sound)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Incoming ${call.callType} call`, {
          body: `${call.callerName} is calling...`,
          icon: '/favicon.ico',
          tag: 'incoming-call'
        });
      }
      
      // Browser audio notification
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMZHG+z7O2CQQwSUKLd9LSaQQcEGYa98tmXQAwKVCUOAAAAAAEAAAAAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMZHG+z7O2CQQwSUKLd9LSaQQcEGYa98tmXQAwKVCUOAAA=');
      audio.play().catch(e => console.log('Could not play notification sound'));
    };

    webrtcService.onCallStarted = (call: CallData) => {
      console.log('📞 Call started by user (caller UI):', call);
      
      // Check if this user is the caller
      const isCurrentUserCaller = call.callerId === user.userId;
      setIsCaller(isCurrentUserCaller);
      
      if (isCurrentUserCaller) {
        setCurrentCall(call);
        startCallTimer(); // Start timer immediately for caller
        console.log('👤 You initiated the call - timer started, showing calling interface');
      }
    };

    webrtcService.onCallConnected = (call: CallData) => {
      console.log('📞 Call connected UI:', call);
      
      // Check if this user is the caller
      const isCurrentUserCaller = call.callerId === user.userId;
      setIsCaller(isCurrentUserCaller);
      
      setCurrentCall(call);
      setIncomingCall(null);
      setIsAnswering(false); // Reset answering state
      setIsRejecting(false); // Reset rejecting state
      
      if (isCurrentUserCaller) {
        console.log('👤 You are the caller - showing calling interface');
      } else {
        console.log('👤 You are receiving the call - showing active call interface');
        startCallTimer(); // Only start timer when call is actually connected for receiver
      }
      
      // Get local video stream if video call
      if (call.callType === 'video') {
        const stream = webrtcService.getLocalStream();
        if (stream && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
    };

    webrtcService.onCallAccepted = (call: CallData) => {
      console.log('🎉 Call accepted - transitioning to active call:', call);
      
      // For the caller, this means someone accepted - start the timer and show active call
      if (isCaller) {
        startCallTimer();
        console.log('📞 Call is now active - timer started');
      }
    };

    webrtcService.onCallEnded = (call: CallData) => {
      console.log('📞 Call ended UI:', call);
      
      // Add notification with duration
      const duration = formatCallDuration(callDuration);
      addCallNotification({
        type: 'call-ended',
        callerName: call.callerName,
        callType: call.callType,
        duration: callDuration > 0 ? duration : undefined
      });
      
      setCurrentCall(null);
      setIncomingCall(null);
      setParticipants([]);
      setIsCallMinimized(false);
      setIsMuted(false);
      setIsVideoOff(false);
      stopCallTimer();
      
      // Clear video streams
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      
      // Clean up audio elements for voice calls
      const audioElements = document.querySelectorAll('audio[data-user-id]');
      audioElements.forEach(audio => {
        audio.remove();
      });
    };

    webrtcService.onParticipantJoined = (participant: CallParticipant) => {
      console.log('👤 Participant joined UI:', participant);
      setParticipants(prev => {
        // Check if participant already exists to avoid duplicates
        const exists = prev.find(p => p.userId === participant.userId);
        if (exists) {
          console.log('⚠️ Participant already exists, updating:', participant.userName);
          return prev.map(p => p.userId === participant.userId ? participant : p);
        }
        console.log('✅ Adding new participant:', participant.userName);
        return [...prev, participant];
      });
    };

    webrtcService.onParticipantLeft = (userId: string) => {
      console.log('👤 Participant left UI:', userId);
      setParticipants(prev => {
        const filtered = prev.filter(p => p.userId !== userId);
        console.log('📊 Participants after leave:', filtered.length);
        return filtered;
      });
    };

    webrtcService.onStreamReceived = (userId: string, stream: MediaStream) => {
      console.log('📹 Stream received UI:', userId, 'Call type:', currentCall?.callType);
      
      if (currentCall?.callType === 'video') {
        // For video calls, set up video element
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      } else {
        // For voice calls, create audio element
        const audioElement = document.createElement('audio');
        audioElement.srcObject = stream;
        audioElement.autoplay = true;
        
        // Add to document to ensure it plays
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        
        // Store reference for cleanup
        audioElement.setAttribute('data-user-id', userId);
        
        audioElement.play().then(() => {
          console.log('🔊 Audio stream playing for user:', userId);
        }).catch(error => {
          console.error('❌ Failed to play audio stream:', error);
        });
      }
    };

    return () => {
      // Cleanup event listeners
      webrtcService.onIncomingCall = null;
      webrtcService.onCallStarted = null;
      webrtcService.onCallConnected = null;
      webrtcService.onCallAccepted = null;
      webrtcService.onCallEnded = null;
      webrtcService.onParticipantJoined = null;
      webrtcService.onParticipantLeft = null;
      webrtcService.onStreamReceived = null;
      stopCallTimer();
    };
  }, []);

  const handleAnswerCall = async () => {
    if (!incomingCall || isAnswering) return;
    
    setIsAnswering(true);
    
    try {
      console.log('✅ Answering call:', incomingCall.callId);
      await webrtcService.answerCall(incomingCall.callId);
      
      // Clear incoming call and set as current call
      setCurrentCall(incomingCall);
      setIncomingCall(null);
      startCallTimer();
    } catch (error) {
      console.error('❌ Failed to answer call:', error);
      setIsAnswering(false);
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall || isRejecting) return;
    
    setIsRejecting(true);
    
    console.log('❌ Rejecting call:', incomingCall.callId);
    
    // Add notification
    addCallNotification({
      type: 'call-missed',
      callerName: incomingCall.callerName,
      callType: incomingCall.callType
    });
    
    webrtcService.rejectCall(incomingCall.callId);
    setIncomingCall(null);
    setIsRejecting(false);
  };

  const handleEndCall = () => {
    console.log('📴 Ending current call');
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

  const handleStartCall = async (callType: 'voice' | 'video') => {
    try {
      console.log(`📞 Starting ${callType} call to family`);
      const familyMemberIds = familyMembers.map(member => member.userId);
      await webrtcService.startCall(familyMemberIds, callType, user.name, user.familyTreeId);
    } catch (error) {
      console.error('❌ Failed to start call:', error);
    }
  };

  // Incoming Call Modal
  if (incomingCall) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="relative">
          {/* Background animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl opacity-20 animate-pulse"></div>
          
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 w-80 mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Call type indicator */}
            <div className="absolute top-4 right-4">
              <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">
                {incomingCall.callType === 'video' ? (
                  <Video className="h-3 w-3 text-blue-600" />
                ) : (
                  <Phone className="h-3 w-3 text-green-600" />
                )}
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 capitalize">
                  {incomingCall.callType}
                </span>
              </div>
            </div>

            <div className="text-center">
              {/* Caller Avatar with animation */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-ping opacity-20"></div>
                <div className="absolute inset-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse opacity-30"></div>
                <Avatar className="relative h-24 w-24 mx-auto border-4 border-white shadow-lg">
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {incomingCall.callerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Caller Info */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {incomingCall.callerName}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                  Incoming {incomingCall.callType} call...
                </p>
                
                {/* Animated call indicator */}
                <div className="flex items-center justify-center space-x-1 text-green-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center space-x-8">
              {/* Reject Button */}
              <button
                onClick={handleRejectCall}
                disabled={isAnswering || isRejecting}
                className={cn(
                  "group relative w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95",
                  (isAnswering || isRejecting) && "opacity-50 cursor-not-allowed transform-none"
                )}
              >
                <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-30 group-hover:opacity-50"></div>
                <PhoneOff className="h-7 w-7 text-white relative z-10" />
              </button>
              
              {/* Accept Button */}
              <button
                onClick={handleAnswerCall}
                disabled={isAnswering || isRejecting}
                className={cn(
                  "group relative w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95",
                  (isAnswering || isRejecting) && "opacity-50 cursor-not-allowed transform-none"
                )}
              >
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-30 group-hover:opacity-50"></div>
                {isAnswering ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10" />
                ) : (
                  <Phone className="h-7 w-7 text-white relative z-10" />
                )}
              </button>
            </div>
            
            {/* Quick actions */}
            <div className="flex justify-center space-x-4 mt-6">
              <button className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Mic className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Video className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Call UI
  if (currentCall) {
    return (
      <div className={cn(
        "fixed z-50 bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl shadow-2xl border border-gray-700",
        isCallMinimized
          ? "bottom-4 right-4 w-72 h-40"
          : "top-4 left-1/2 transform -translate-x-1/2 w-96 h-96"
      )}>
        <div className="relative h-full overflow-hidden rounded-xl">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20"></div>
          
          {/* Video area */}
          {currentCall.callType === 'video' && !isCallMinimized && (
            <div className="relative h-2/3 bg-gray-900 rounded-t-xl overflow-hidden">
              {/* Remote video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Local video (Picture-in-Picture) */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute top-3 right-3 w-24 h-18 object-cover rounded-lg border-2 border-white/50 shadow-lg"
              />
              
              {isVideoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <div className="text-center">
                    <VideoOff className="h-12 w-12 text-white mb-2 mx-auto" />
                    <p className="text-white text-sm">Camera is off</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Call info and controls */}
          <div className={cn(
            "relative p-4 text-white",
            currentCall.callType === 'video' && !isCallMinimized ? "h-1/3" : "h-full"
          )}>
            {/* Header with call info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {/* Caller avatar for voice calls or minimized view */}
                {(currentCall.callType === 'voice' || isCallMinimized) && (
                  <Avatar className="h-12 w-12 border-2 border-white/30">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                      {currentCall.callerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div>
                  <h4 className="font-semibold text-lg">
                    {isCaller ? `${currentCall.familyId} Family` : currentCall.callerName}
                  </h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <div className="flex items-center space-x-1">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isCaller && currentCall.status === 'ringing' 
                          ? "bg-yellow-400 animate-pulse" 
                          : "bg-green-400 animate-pulse"
                      )}></div>
                      <span>
                        {isCaller && currentCall.status === 'ringing' 
                          ? "Ringing..." 
                          : formatCallDuration(callDuration)
                        }
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs border-white/30 text-white">
                      {currentCall.callType}
                    </Badge>
                    {/* Show participants count */}
                    {participants.length > 0 && (
                      <div className="flex items-center text-xs text-gray-300">
                        <Users className="h-3 w-3 mr-1" />
                        {participants.length + 1}
                      </div>
                    )}
                  </div>
                  
                  {/* Show simplified calling status during ringing */}
                  {isCaller && currentCall.status === 'ringing' && (
                    <div className="mt-3 p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                      <p className="text-xs text-gray-400 mb-1">📞 Calling family members...</p>
                      <div className="flex items-center space-x-2">
                        <div className="flex -space-x-1">
                          {familyMembers.slice(0, 3).map((member, index) => (
                            <Avatar key={member.userId} className="h-5 w-5 border border-gray-600">
                              <AvatarFallback className="text-xs bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
                                {member.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {familyMembers.length > 3 && (
                            <div className="h-5 w-5 bg-gray-600 rounded-full flex items-center justify-center text-xs text-white border border-gray-600">
                              +{familyMembers.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-gray-300">Ringing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Show who has actually joined the call - for BOTH caller and receiver */}
                  {(participants.length > 0 || (!isCaller || currentCall.status === 'connected')) && (
                    <div className="mt-3 p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                      <p className="text-xs text-gray-400 mb-2">
                        {participants.length > 0 ? `In call (${participants.length + 1}):` : 'In call:'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {/* Always show yourself when in call */}
                        <div className="flex items-center space-x-1 bg-green-500/30 rounded-full px-2 py-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-green-600 text-white">
                              {user.name?.charAt(0).toUpperCase() || 'M'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-white">You</span>
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        </div>
                        
                        {/* Show actual participants who joined */}
                        {participants.map((participant, index) => {
                          const member = familyMembers.find(m => m.userId === participant.userId);
                          if (!member) return null;
                          
                          return (
                            <div key={participant.userId} className="flex items-center space-x-1 bg-green-500/30 rounded-full px-2 py-1">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-green-600 text-white">
                                  {member.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-white">{member.name}</span>
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                            </div>
                          );
                        })}
                        
                        {/* Show message when no one has joined yet */}
                        {participants.length === 0 && currentCall.status === 'connected' && (
                          <div className="text-xs text-gray-400 italic">
                            Waiting for family members to join...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Window controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsCallMinimized(!isCallMinimized)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  {isCallMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Call controls */}
            {!isCallMinimized && (
              <div className="flex justify-center space-x-4 mt-6">
                {/* Mute button */}
                <button
                  onClick={handleToggleMute}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
                    isMuted 
                      ? "bg-red-500 hover:bg-red-600" 
                      : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                  )}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                
                {/* Video toggle (only for video calls) */}
                {currentCall.callType === 'video' && (
                  <button
                    onClick={handleToggleVideo}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
                      isVideoOff 
                        ? "bg-red-500 hover:bg-red-600" 
                        : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                    )}
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </button>
                )}
                
                {/* End call button */}
                <button
                  onClick={handleEndCall}
                  className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg transform hover:scale-110 active:scale-95"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
                
                {/* Add participant button */}
                <button className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 shadow-lg">
                  <Users className="h-5 w-5" />
                </button>
              </div>
            )}
            
            {/* Participants count */}
            {participants.length > 0 && (
              <div className="flex items-center justify-center mt-4 text-xs text-gray-300">
                <Users className="h-3 w-3 mr-1" />
                {participants.length + 1} participants
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Call UI - Only show when there's a currentCall
  if (currentCall) {
    return (
      <div className={cn(
        "fixed z-50 transition-all duration-300",
        isCallMinimized 
          ? "top-4 right-4 w-80 h-60" 
          : "inset-4 md:inset-8"
      )}>
        <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 rounded-2xl overflow-hidden shadow-2xl">
          {/* Video streams container */}
          <div className="relative w-full h-full">
            {/* Remote video (full background) */}
            {currentCall.callType === 'video' && (
              <video
                ref={remoteVideoRef}
                autoPlay
                className="w-full h-full object-cover"
                playsInline
              />
            )}
            
            {/* Local video (picture-in-picture) */}
            {currentCall.callType === 'video' && (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg object-cover border-2 border-white/20"
                playsInline
              />
            )}
            
            {/* Call info overlay */}
            <div className="absolute top-4 left-4 text-white">
              <div className="flex items-center space-x-2 mb-2">
                {currentCall.callType === 'video' ? (
                  <Video className="h-4 w-4 text-green-400" />
                ) : (
                  <Phone className="h-4 w-4 text-green-400" />
                )}
                <span className="text-sm font-medium capitalize">{currentCall.callType} Call</span>
              </div>
              <div className="text-lg font-semibold">{formatCallDuration(callDuration)}</div>
              {participants.length > 0 && (
                <div className="text-sm opacity-80">
                  {participants.length + 1} participants
                </div>
              )}
            </div>
            
            {/* Call controls */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
              {/* Mute button */}
              <button
                onClick={handleToggleMute}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
                  isMuted 
                    ? "bg-red-500 hover:bg-red-600" 
                    : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                )}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              
              {/* Video toggle (only for video calls) */}
              {currentCall.callType === 'video' && (
                <button
                  onClick={handleToggleVideo}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
                    isVideoOff 
                      ? "bg-red-500 hover:bg-red-600" 
                      : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                  )}
                >
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </button>
              )}
              
              {/* End call button */}
              <button
                onClick={handleEndCall}
                className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg transform hover:scale-110 active:scale-95"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
              
              {/* Minimize/Maximize button */}
              <button
                onClick={() => setIsCallMinimized(!isCallMinimized)}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
              >
                {isCallMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything when there's no incoming or active call
  return null;
};

export default CallUI;
