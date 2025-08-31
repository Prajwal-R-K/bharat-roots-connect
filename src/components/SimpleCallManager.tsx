import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SimpleCallManagerProps {
  user: any;
  familyMembers: any[];
  onCallEnd?: () => void;
}

export const SimpleCallManager: React.FC<SimpleCallManagerProps> = ({ 
  user, 
  familyMembers, 
  onCallEnd 
}) => {
  const [activeCall, setActiveCall] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const handleStartCall = (callType: 'voice' | 'video') => {
    const callData = {
      callId: `call_${Date.now()}`,
      callType,
      participants: familyMembers.filter(m => m.userId !== user.userId),
      startTime: new Date()
    };
    
    setActiveCall(callData);
    
    toast({
      title: `${callType === 'video' ? 'Video' : 'Voice'} call started`,
      description: `Calling ${callData.participants.length} family members...`,
    });

    // Simulate call duration - auto end after 30 seconds for demo
    setTimeout(() => {
      handleEndCall();
    }, 30000);
  };

  const handleEndCall = () => {
    setActiveCall(null);
    setIncomingCall(null);
    onCallEnd?.();
    
    toast({
      title: "Call ended",
      description: "The call has been disconnected.",
    });
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      description: isMuted ? "Microphone unmuted" : "Microphone muted",
    });
  };

  const handleToggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    toast({
      description: isVideoOff ? "Video turned on" : "Video turned off",
    });
  };

  // Incoming Call Modal (for demo purposes)
  if (incomingCall) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center max-w-sm w-full mx-4">
          <div className="mb-6">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarFallback className="text-2xl">
                {incomingCall.callerName?.charAt(0).toUpperCase() || 'F'}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold mb-2">{incomingCall.callerName || 'Family Member'}</h3>
            <Badge variant="outline" className="mb-2">
              {incomingCall.callType === 'video' ? 'Video Call' : 'Voice Call'}
            </Badge>
            <p className="text-sm text-gray-500">Incoming family call...</p>
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => setIncomingCall(null)}
              variant="destructive"
              size="lg"
              className="rounded-full p-4"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              onClick={() => {
                setActiveCall(incomingCall);
                setIncomingCall(null);
              }}
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
  if (activeCall) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        {/* Call Header */}
        <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-green-500">
              {activeCall.callType === 'video' ? 'Video Call' : 'Voice Call'}
            </Badge>
            <span className="text-sm">Family Call</span>
          </div>
          
          <div className="text-center">
            <p className="text-sm opacity-75">Connected</p>
            <p className="font-mono">Demo Mode</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm">{activeCall.participants.length + 1} participants</span>
          </div>
        </div>

        {/* Call Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-white">
          {activeCall.callType === 'video' ? (
            <div className="text-center">
              <div className="w-64 h-48 bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-400">Video Preview</span>
              </div>
              <p className="text-lg">Video call in progress...</p>
            </div>
          ) : (
            <div className="text-center">
              <Avatar className="w-32 h-32 mx-auto mb-4">
                <AvatarFallback className="text-4xl">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <p className="text-lg">Voice call in progress...</p>
            </div>
          )}
          
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
            {activeCall.participants.map((participant: any, index: number) => (
              <div key={participant.userId || index} className="text-center">
                <Avatar className="w-16 h-16 mx-auto mb-2">
                  <AvatarFallback>
                    {participant.name?.charAt(0).toUpperCase() || 'F'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm">{participant.name || 'Family Member'}</p>
              </div>
            ))}
          </div>
        </div>

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

          {activeCall.callType === 'video' && (
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

export default SimpleCallManager;
