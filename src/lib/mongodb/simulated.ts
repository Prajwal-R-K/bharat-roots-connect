// Simulated MongoDB using localStorage with cross-browser sync
// This is a temporary solution until MongoDB is properly set up

export interface ChatMessage {
  _id?: string;
  id: string;
  familyId: string;
  senderId: string;
  senderName: string;
  senderProfilePicture?: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  messageType: 'text' | 'image' | 'file' | 'system';
  readBy: Array<{
    userId: string;
    readAt: Date;
  }>;
  editedAt?: Date;
  isDeleted: boolean;
  replyTo?: string;
}

export interface FamilyChatRoom {
  _id?: string;
  familyId: string;
  familyName: string;
  members: Array<{
    userId: string;
    userName: string;
    joinedAt: Date;
    lastSeen: Date;
    isOnline: boolean;
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
  deviceInfo?: string;
}

// Simulate MongoDB collections using localStorage
const STORAGE_KEYS = {
  MESSAGES: 'bhandan_family_chat_messages',
  ROOMS: 'bhandan_family_chat_rooms',
  ONLINE_STATUS: 'bhandan_online_status',
  SYNC_TIMESTAMP: 'bhandan_last_sync'
};

// Helper to get data from localStorage
const getStorageData = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data).map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
      lastSeen: item.lastSeen ? new Date(item.lastSeen) : undefined,
      readBy: item.readBy?.map((read: any) => ({
        ...read,
        readAt: new Date(read.readAt)
      })) || []
    }));
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return [];
  }
};

// Helper to save data to localStorage
const setStorageData = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.SYNC_TIMESTAMP, new Date().toISOString());
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
};

// Send a new chat message
export const sendMessage = async (messageData: Omit<ChatMessage, '_id' | 'id' | 'timestamp' | 'readBy' | 'isDeleted'>): Promise<ChatMessage> => {
  try {
    const messages = getStorageData<ChatMessage>(STORAGE_KEYS.MESSAGES);
    
    const newMessage: ChatMessage = {
      ...messageData,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      readBy: [{
        userId: messageData.senderId,
        readAt: new Date()
      }],
      isDeleted: false
    };

    messages.push(newMessage);
    setStorageData(STORAGE_KEYS.MESSAGES, messages);

    // Update family room's last message
    await updateFamilyRoomLastMessage(messageData.familyId, {
      content: messageData.content,
      timestamp: newMessage.timestamp,
      senderName: messageData.senderName
    });

    console.log('✅ Message sent successfully:', newMessage.id);
    return newMessage;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
};

// Get chat messages for a family (with pagination)
export const getFamilyMessages = async (
  familyId: string, 
  limit: number = 50, 
  skip: number = 0
): Promise<ChatMessage[]> => {
  try {
    const allMessages = getStorageData<ChatMessage>(STORAGE_KEYS.MESSAGES);
    
    const familyMessages = allMessages
      .filter(msg => msg.familyId === familyId && !msg.isDeleted)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(skip, skip + limit);

    console.log(`📨 Loaded ${familyMessages.length} messages for family ${familyId}`);
    return familyMessages;
  } catch (error) {
    console.error('❌ Error fetching family messages:', error);
    return [];
  }
};

// Get latest messages after a specific timestamp (for real-time updates)
export const getNewMessages = async (familyId: string, afterTimestamp: Date): Promise<ChatMessage[]> => {
  try {
    const allMessages = getStorageData<ChatMessage>(STORAGE_KEYS.MESSAGES);
    
    const newMessages = allMessages
      .filter(msg => 
        msg.familyId === familyId && 
        new Date(msg.timestamp) > afterTimestamp && 
        !msg.isDeleted
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (newMessages.length > 0) {
      console.log(`🔔 ${newMessages.length} new messages found for family ${familyId}`);
    }
    
    return newMessages;
  } catch (error) {
    console.error('❌ Error fetching new messages:', error);
    return [];
  }
};

// Mark message as read
export const markMessageAsRead = async (messageId: string, userId: string): Promise<void> => {
  try {
    const messages = getStorageData<ChatMessage>(STORAGE_KEYS.MESSAGES);
    
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
      const message = messages[messageIndex];
      if (!message.readBy.some(read => read.userId === userId)) {
        message.readBy.push({
          userId,
          readAt: new Date()
        });
        setStorageData(STORAGE_KEYS.MESSAGES, messages);
      }
    }
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
  }
};

// Update message status
export const updateMessageStatus = async (messageId: string, status: ChatMessage['status']): Promise<void> => {
  try {
    const messages = getStorageData<ChatMessage>(STORAGE_KEYS.MESSAGES);
    
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
      messages[messageIndex].status = status;
      setStorageData(STORAGE_KEYS.MESSAGES, messages);
    }
  } catch (error) {
    console.error('❌ Error updating message status:', error);
  }
};

// Create or update family chat room
export const createOrUpdateFamilyRoom = async (familyId: string, familyName: string, members: Array<{userId: string, userName: string}>): Promise<FamilyChatRoom> => {
  try {
    const rooms = getStorageData<FamilyChatRoom>(STORAGE_KEYS.ROOMS);
    
    const existingRoomIndex = rooms.findIndex(room => room.familyId === familyId);
    
    const roomData: Partial<FamilyChatRoom> = {
      familyId,
      familyName,
      members: members.map(member => ({
        ...member,
        joinedAt: new Date(),
        lastSeen: new Date(),
        isOnline: false
      })),
      updatedAt: new Date()
    };

    if (existingRoomIndex !== -1) {
      rooms[existingRoomIndex] = { ...rooms[existingRoomIndex], ...roomData };
      setStorageData(STORAGE_KEYS.ROOMS, rooms);
      console.log(`🏠 Updated family room: ${familyId}`);
      return rooms[existingRoomIndex];
    } else {
      const newRoom: FamilyChatRoom = {
        ...roomData as FamilyChatRoom,
        createdAt: new Date()
      };
      
      rooms.push(newRoom);
      setStorageData(STORAGE_KEYS.ROOMS, rooms);
      console.log(`🏠 Created new family room: ${familyId}`);
      return newRoom;
    }
  } catch (error) {
    console.error('❌ Error creating/updating family room:', error);
    throw error;
  }
};

// Update family room's last message
export const updateFamilyRoomLastMessage = async (
  familyId: string, 
  lastMessage: { content: string; timestamp: Date; senderName: string }
): Promise<void> => {
  try {
    const rooms = getStorageData<FamilyChatRoom>(STORAGE_KEYS.ROOMS);
    
    const roomIndex = rooms.findIndex(room => room.familyId === familyId);
    if (roomIndex !== -1) {
      rooms[roomIndex].lastMessage = lastMessage;
      rooms[roomIndex].updatedAt = new Date();
      setStorageData(STORAGE_KEYS.ROOMS, rooms);
    }
  } catch (error) {
    console.error('❌ Error updating family room last message:', error);
  }
};

// Update user online status
export const updateOnlineStatus = async (userId: string, familyId: string, isOnline: boolean): Promise<void> => {
  try {
    const statuses = getStorageData<OnlineStatus>(STORAGE_KEYS.ONLINE_STATUS);
    
    const existingIndex = statuses.findIndex(status => status.userId === userId && status.familyId === familyId);
    
    const statusData: OnlineStatus = {
      userId,
      familyId,
      isOnline,
      lastSeen: new Date(),
      deviceInfo: navigator.userAgent
    };

    if (existingIndex !== -1) {
      statuses[existingIndex] = statusData;
    } else {
      statuses.push(statusData);
    }
    
    setStorageData(STORAGE_KEYS.ONLINE_STATUS, statuses);
    console.log(`👤 ${isOnline ? 'Online' : 'Offline'}: ${userId}`);
  } catch (error) {
    console.error('❌ Error updating online status:', error);
  }
};

// Get online family members
export const getOnlineFamilyMembers = async (familyId: string): Promise<string[]> => {
  try {
    const statuses = getStorageData<OnlineStatus>(STORAGE_KEYS.ONLINE_STATUS);
    
    // Consider users online if they were active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineMembers = statuses
      .filter(status => 
        status.familyId === familyId &&
        (status.isOnline || new Date(status.lastSeen) >= fiveMinutesAgo)
      )
      .map(status => status.userId);

    console.log(`🟢 Online members in ${familyId}: ${onlineMembers.length}`);
    return onlineMembers;
  } catch (error) {
    console.error('❌ Error fetching online family members:', error);
    return [];
  }
};

// Delete a message (soft delete)
export const deleteMessage = async (messageId: string, userId: string): Promise<boolean> => {
  try {
    const messages = getStorageData<ChatMessage>(STORAGE_KEYS.MESSAGES);
    
    const messageIndex = messages.findIndex(msg => msg.id === messageId && msg.senderId === userId);
    if (messageIndex !== -1) {
      messages[messageIndex].isDeleted = true;
      messages[messageIndex].content = 'This message was deleted';
      setStorageData(STORAGE_KEYS.MESSAGES, messages);
      console.log(`🗑️ Message deleted: ${messageId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    return false;
  }
};
