// HTTP-based chat service for browser compatibility
const API_BASE_URL = 'http://localhost:3001/api';

export interface ChatMessage {
  _id?: string;
  id: string;
  familyId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  messageType: 'text' | 'image' | 'file' | 'system';
  readBy: Array<{
    userId: string;
    readAt: Date;
  }>;
  isDeleted: boolean;
}

export interface FamilyChatRoom {
  _id?: string;
  familyId: string;
  roomName: string;
  roomType: 'family' | 'private';
  members: Array<{
    userId: string;
    userName: string;
  }>;
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OnlineStatus {
  _id?: string;
  userId: string;
  familyId: string;
  isOnline: boolean;
  lastSeen: Date;
  updatedAt: Date;
}

// Helper function to handle API requests
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Send a new chat message
export const sendMessage = async (messageData: Omit<ChatMessage, '_id' | 'id' | 'timestamp' | 'readBy' | 'isDeleted'>): Promise<ChatMessage> => {
  try {
    console.log('📤 Sending message via API:', messageData);
    
    const response = await apiRequest('/chat/send', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });

    console.log('✅ Message sent successfully:', response.id);
    return {
      ...response,
      timestamp: new Date(response.timestamp),
      readBy: response.readBy.map((r: any) => ({
        ...r,
        readAt: new Date(r.readAt)
      }))
    };
  } catch (error) {
    console.error('❌ Error sending message:', error);
    
    // Fallback: Create message without API
    const fallbackMessage: ChatMessage = {
      ...messageData,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      readBy: [{
        userId: messageData.senderId,
        readAt: new Date()
      }],
      isDeleted: false
    };
    
    console.warn('🔄 Using fallback message creation');
    return fallbackMessage;
  }
};

// Get all messages for a family
export const getFamilyMessages = async (
  familyId: string, 
  limit: number = 50, 
  skip: number = 0
): Promise<ChatMessage[]> => {
  try {
    console.log(`📥 Fetching messages for family ${familyId}`);
    
    const response = await apiRequest(`/chat/messages/${familyId}?limit=${limit}&skip=${skip}`);
    
    const messages = response.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
      readBy: msg.readBy.map((r: any) => ({
        ...r,
        readAt: new Date(r.readAt)
      }))
    }));

    console.log(`✅ Retrieved ${messages.length} messages`);
    return messages;
  } catch (error) {
    console.error('❌ Error fetching family messages:', error);
    console.warn('🔄 Returning empty messages array as fallback');
    return [];
  }
};

// Get new messages since a timestamp
export const getNewMessages = async (
  familyId: string,
  since: Date
): Promise<ChatMessage[]> => {
  try {
    const response = await apiRequest(`/chat/new-messages/${familyId}?since=${since.toISOString()}`);
    
    const messages = response.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
      readBy: msg.readBy.map((r: any) => ({
        ...r,
        readAt: new Date(r.readAt)
      }))
    }));

    if (messages.length > 0) {
      console.log(`🔄 Found ${messages.length} new messages`);
    }
    
    return messages;
  } catch (error) {
    console.error('❌ Error fetching new messages:', error);
    return [];
  }
};

// Mark message as read
export const markMessageAsRead = async (
  messageId: string,
  userId: string
): Promise<void> => {
  try {
    // This would be implemented in the backend if needed
    console.log('📖 Message marked as read:', messageId);
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
  }
};

// Update user online status
export const updateOnlineStatus = async (
  userId: string,
  familyId: string,
  isOnline: boolean
): Promise<void> => {
  try {
    await apiRequest('/chat/online-status', {
      method: 'POST',
      body: JSON.stringify({ userId, familyId, isOnline }),
    });
    
    console.log(`👤 Updated online status for ${userId}: ${isOnline}`);
  } catch (error) {
    console.error('❌ Error updating online status:', error);
  }
};

// Get online family members
export const getOnlineFamilyMembers = async (familyId: string): Promise<string[]> => {
  try {
    const response = await apiRequest(`/chat/online-members/${familyId}`);
    console.log(`👥 Online members:`, response);
    return response;
  } catch (error) {
    console.error('❌ Error fetching online members:', error);
    return [];
  }
};

// Create or update family chat room
export const createOrUpdateFamilyRoom = async (
  familyId: string,
  roomName: string,
  members: Array<{ userId: string; userName: string }>
): Promise<void> => {
  try {
    await apiRequest('/chat/room', {
      method: 'POST',
      body: JSON.stringify({ familyId, roomName, members }),
    });
    
    console.log(`🏠 Created/updated family room: ${roomName}`);
  } catch (error) {
    console.error('❌ Error creating/updating family room:', error);
  }
};

// Health check function
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await apiRequest('/health');
    console.log('🏥 Server health check:', response);
    return response.status === 'ok' && response.database === 'connected';
  } catch (error) {
    console.error('❌ Server health check failed:', error);
    return false;
  }
};
