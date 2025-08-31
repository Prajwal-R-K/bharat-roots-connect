import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { webrtcService } from '@/services/webrtc-service';
import { 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  Speaker, 
  AlertCircle, 
  CheckCircle, 
  Settings,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MediaPermissionHelperProps {
  onPermissionsGranted?: () => void;
  callType?: 'voice' | 'video';
}

interface DeviceInfo {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

interface PermissionStatus {
  audio: boolean;
  video: boolean;
}

export const MediaPermissionHelper: React.FC<MediaPermissionHelperProps> = ({
  onPermissionsGranted,
  callType = 'video'
}) => {
  const [devices, setDevices] = useState<DeviceInfo | null>(null);
  const [permissions, setPermissions] = useState<PermissionStatus>({ audio: false, video: false });
  const [isLoading, setIsLoading] = useState(false);
  const [testingAudio, setTestingAudio] = useState(false);
  const [testingVideo, setTestingVideo] = useState(false);

  useEffect(() => {
    loadDevices();
    checkPermissions();
  }, []);

  const loadDevices = async () => {
    try {
      const deviceInfo = await webrtcService.getMediaDevices();
      setDevices(deviceInfo);
    } catch (error: any) {
      console.error('Failed to load devices:', error);
      toast({
        title: "Device Detection Failed",
        description: error.message || "Could not detect media devices",
        variant: "destructive"
      });
    }
  };

  const checkPermissions = async () => {
    try {
      const perms = await webrtcService.checkMediaPermissions(callType);
      setPermissions(perms);
    } catch (error: any) {
      console.error('Failed to check permissions:', error);
      setPermissions({ audio: false, video: false });
    }
  };

  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      const perms = await webrtcService.checkMediaPermissions(callType);
      setPermissions(perms);
      
      if (perms.audio && (callType === 'voice' || perms.video)) {
        toast({
          title: "Permissions Granted!",
          description: "Camera and microphone access has been granted.",
        });
        onPermissionsGranted?.();
      }
    } catch (error: any) {
      toast({
        title: "Permission Denied",
        description: error.message || "Failed to get media permissions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAudioAccess = async () => {
    setTestingAudio(true);
    try {
      const success = await webrtcService.testMediaAccess('voice');
      if (success) {
        toast({
          title: "Audio Test Successful",
          description: "Microphone is working correctly!",
        });
        setPermissions(prev => ({ ...prev, audio: true }));
      } else {
        throw new Error('Audio test failed');
      }
    } catch (error: any) {
      toast({
        title: "Audio Test Failed",
        description: error.message || "Could not access microphone",
        variant: "destructive"
      });
    } finally {
      setTestingAudio(false);
    }
  };

  const testVideoAccess = async () => {
    setTestingVideo(true);
    try {
      const success = await webrtcService.testMediaAccess('video');
      if (success) {
        toast({
          title: "Video Test Successful",
          description: "Camera is working correctly!",
        });
        setPermissions(prev => ({ ...prev, video: true }));
      } else {
        throw new Error('Video test failed');
      }
    } catch (error: any) {
      toast({
        title: "Video Test Failed", 
        description: error.message || "Could not access camera",
        variant: "destructive"
      });
    } finally {
      setTestingVideo(false);
    }
  };

  const getPermissionIcon = (granted: boolean) => {
    return granted ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getPermissionBadge = (granted: boolean) => {
    return (
      <Badge variant={granted ? "default" : "destructive"}>
        {granted ? "Granted" : "Denied"}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Media Permissions & Device Setup
        </CardTitle>
        <CardDescription>
          Grant camera and microphone permissions to enable {callType} calling.
          {!permissions.audio && " Click 'Allow' when prompted by your browser."}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Permission Status
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {permissions.audio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                <span>Microphone</span>
              </div>
              <div className="flex items-center gap-2">
                {getPermissionIcon(permissions.audio)}
                {getPermissionBadge(permissions.audio)}
              </div>
            </div>
            
            {callType === 'video' && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {permissions.video ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                  <span>Camera</span>
                </div>
                <div className="flex items-center gap-2">
                  {getPermissionIcon(permissions.video)}
                  {getPermissionBadge(permissions.video)}
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Available Devices */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Speaker className="h-4 w-4" />
              Available Devices
            </h3>
            <Button variant="outline" size="sm" onClick={loadDevices}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
          
          {devices && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 border rounded-lg">
                <div className="font-medium mb-2">🎤 Microphones</div>
                <div className="text-muted-foreground">
                  {devices.audioInputs.length > 0 
                    ? `${devices.audioInputs.length} detected`
                    : 'None detected'
                  }
                </div>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="font-medium mb-2">📹 Cameras</div>
                <div className="text-muted-foreground">
                  {devices.videoInputs.length > 0 
                    ? `${devices.videoInputs.length} detected`
                    : 'None detected'
                  }
                </div>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="font-medium mb-2">🔊 Speakers</div>
                <div className="text-muted-foreground">
                  {devices.audioOutputs.length > 0 
                    ? `${devices.audioOutputs.length} detected`
                    : 'None detected'
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-4">
          <h3 className="font-semibold">Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={requestPermissions}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Requesting..." : "Grant Permissions"}
            </Button>
            
            <Button 
              variant="outline"
              onClick={testAudioAccess}
              disabled={testingAudio || !permissions.audio}
              className="w-full"
            >
              {testingAudio ? "Testing..." : "Test Audio"}
            </Button>
            
            {callType === 'video' && (
              <Button 
                variant="outline"
                onClick={testVideoAccess}
                disabled={testingVideo || !permissions.video}
                className="w-full"
              >
                {testingVideo ? "Testing..." : "Test Video"}
              </Button>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <div className="font-medium mb-2">💡 Troubleshooting Tips:</div>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Make sure your camera and microphone are not used by other apps</li>
            <li>• Check browser settings if permissions are blocked</li>
            <li>• Use HTTPS for best compatibility (required for some browsers)</li>
            <li>• Try refreshing the page if devices are not detected</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
