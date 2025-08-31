import React, { useEffect, useState } from 'react';
import { webrtcService } from '@/services/webrtc-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ConnectionTestProps {
  user: any;
}

export const ConnectionTest: React.FC<ConnectionTestProps> = ({ user }) => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(`[ConnectionTest] ${message}`);
  };

  useEffect(() => {
    if (!user) return;

    addLog(`Initializing WebRTC service for user: ${user.name} (${user.userId})`);
    
    // Set up connection status listener
    webrtcService.onConnectionStatusChanged = (connected: boolean) => {
      setIsConnected(connected);
      setConnectionStatus(connected ? 'Connected' : 'Disconnected');
      addLog(`Connection status changed: ${connected ? 'Connected' : 'Disconnected'}`);
    };
    
    webrtcService.initialize(user.userId, user.familyTreeId, user.name)
      .then(() => {
        addLog('WebRTC service initialized successfully');
        const status = webrtcService.getConnectionStatus();
        setIsConnected(status.connected);
        setConnectionStatus(status.connected ? 'Connected' : 'Initializing...');
      })
      .catch((error) => {
        addLog(`Failed to initialize WebRTC service: ${error.message}`);
        setConnectionStatus('Error');
        setIsConnected(false);
      });

    webrtcService.onIncomingCall = (call) => {
      addLog(`Incoming call received: ${call.callType} from ${call.callerName}`);
    };

    return () => {
      webrtcService.onConnectionStatusChanged = null;
      // Don't disconnect here as it causes repeated reconnections
      // webrtcService.disconnect();
      addLog('ConnectionTest component unmounted');
    };
  }, [user]);

  const testCall = async () => {
    try {
      addLog('Testing call initiation...');
      
      const status = webrtcService.getConnectionStatus();
      addLog(`Connection status check: connected=${status.connected}, initialized=${status.initialized}`);
      
      if (!status.connected) {
        addLog('❌ Cannot test call: Not connected to server');
        return;
      }

      const callId = await webrtcService.startCall(
        [user.userId], // Test with self
        'voice', 
        user.name, 
        user.familyTreeId
      );
      addLog(`✅ Call initiated successfully with ID: ${callId}`);
      
      // End the test call after 3 seconds
      setTimeout(() => {
        webrtcService.endCall();
        addLog('🔚 Test call ended');
      }, 3000);
      
    } catch (error: any) {
      addLog(`❌ Call test failed: ${error.message}`);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          WebRTC Connection Test
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${
            isConnected && connectionStatus === 'Connected' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
            connectionStatus === 'Error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
            connectionStatus === 'Initializing...' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
          }`}>
            {isConnected && connectionStatus === 'Connected' ? '🟢 Connected' : connectionStatus}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p><strong>User:</strong> {user?.name} ({user?.userId})</p>
          <p><strong>Family:</strong> {user?.familyTreeId}</p>
        </div>
        
        <Button 
          onClick={testCall} 
          disabled={!isConnected || connectionStatus === 'Error'}
          className={cn(
            "transition-all duration-200",
            isConnected ? "bg-green-500 hover:bg-green-600" : "bg-gray-400"
          )}
        >
          {isConnected ? "🚀 Test Call" : "⏳ Connecting..."}
        </Button>

        <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
          <h4 className="font-semibold mb-2">Connection Logs:</h4>
          {logs.map((log, index) => (
            <div key={index} className="text-sm text-gray-600 font-mono">
              {log}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectionTest;
