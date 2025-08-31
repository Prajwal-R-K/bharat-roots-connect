import React, { createContext, useContext, useState, useEffect } from 'react';
import { CallUI } from '@/components/CallUI';
import { CallNotifications } from '@/components/CallNotifications';
import { webrtcService } from '@/services/webrtc-service';

interface GlobalCallContextType {
  currentUser: any;
  familyMembers: any[];
  setCurrentUser: (user: any) => void;
  setFamilyMembers: (members: any[]) => void;
  initializeWebRTC: () => void;
}

const GlobalCallContext = createContext<GlobalCallContextType | null>(null);

export const useGlobalCall = () => {
  const context = useContext(GlobalCallContext);
  if (!context) {
    throw new Error('useGlobalCall must be used within GlobalCallProvider');
  }
  return context;
};

interface GlobalCallProviderProps {
  children: React.ReactNode;
}

export const GlobalCallProvider: React.FC<GlobalCallProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeWebRTC = async () => {
    if (!currentUser || isInitialized) return;

    try {
      console.log('🌐 Initializing global WebRTC service...');
      await webrtcService.initialize(
        currentUser.userId, 
        currentUser.familyTreeId, 
        currentUser.name
      );
      setIsInitialized(true);
      console.log('✅ Global WebRTC service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize global WebRTC service:', error);
    }
  };

  useEffect(() => {
    // Auto-initialize when user is set
    if (currentUser && !isInitialized) {
      initializeWebRTC();
    }
  }, [currentUser, isInitialized]);

  // Load user from localStorage on app start
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser && !currentUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
      }
    }
  }, []);

  const value = {
    currentUser,
    familyMembers,
    setCurrentUser,
    setFamilyMembers,
    initializeWebRTC
  };

  return (
    <GlobalCallContext.Provider value={value}>
      {children}
      {/* Global Call Notifications */}
      <CallNotifications />
      
      {/* Global CallUI - only shows during active calls, not as persistent buttons */}
      {currentUser && isInitialized && (
        <CallUI 
          user={currentUser} 
          familyMembers={familyMembers}
        />
      )}
    </GlobalCallContext.Provider>
  );
};

export default GlobalCallProvider;
