import { getDatabase } from './connection';
import { ChatMessage, FamilyChatRoom, OnlineStatus } from './types';
import { ObjectId } from 'mongodb';

// Collection names
const COLLECTIONS = {
  MESSAGES: 'family_chat_messages',
  ROOMS: 'family_chat_rooms',
  ONLINE_STATUS: 'online_status'
};

// Send a new chat message
export const sendMessage = async (messageData: Omit<ChatMessage, '_id' | 'id' | 'timestamp' | 'readBy' | 'isDeleted'>): Promise<ChatMessage> => {
  try {
    const db = await getDatabase();
    const messagesCollection = db.collection<ChatMessage>(COLLECTIONS.MESSAGES);
    
    const newMessage: ChatMessage = {
      ...messageData,
      id: new ObjectId().toString(),
      timestamp: new Date(),
      readBy: [{
        userId: messageData.senderId,
        readAt: new Date()
      }],
      isDeleted: false
    };

    const result = await messagesCollection.insertOne(newMessage);
    
    // Update family room's last message
    await updateFamilyRoomLastMessage(messageData.familyId, {
      content: messageData.content,
      timestamp: newMessage.timestamp,
      senderName: messageData.senderName
    });

    console.log('✅ Message sent to MongoDB:', newMessage.id);
    return { ...newMessage, _id: result.insertedId.toString() };
  } catch (error) {
    console.error('❌ Error sending message to MongoDB:', error);
    
    // Fallback: Create message without database
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

// Get chat messages for a family (with pagination)
export const getFamilyMessages = async (
  familyId: string, 
  limit: number = 50, 
  skip: number = 0
): Promise<ChatMessage[]> => {
  try {
    const db = await getDatabase();
    const messagesCollection = db.collection<ChatMessage>(COLLECTIONS.MESSAGES);
    
    const messages = await messagesCollection
      .find({ 
        familyId, 
        isDeleted: false 
      })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return messages.reverse(); // Return in ascending order (oldest first)
  } catch (error) {
    console.error('Error fetching family messages:', error);
    return [];
  }
};

// Get latest messages after a specific timestamp (for real-time updates)
export const getNewMessages = async (familyId: string, afterTimestamp: Date): Promise<ChatMessage[]> => {
  try {
    const db = await getDatabase();
    const messagesCollection = db.collection<ChatMessage>(COLLECTIONS.MESSAGES);
    
    const newMessages = await messagesCollection
      .find({
        familyId,
        timestamp: { $gt: afterTimestamp },
        isDeleted: false
      })
      .sort({ timestamp: 1 })
      .toArray();

    return newMessages;
  } catch (error) {
    console.error('Error fetching new messages:', error);
    return [];
  }
};

// Mark message as read
export const markMessageAsRead = async (messageId: string, userId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    const messagesCollection = db.collection<ChatMessage>(COLLECTIONS.MESSAGES);
    
    await messagesCollection.updateOne(
      { 
        id: messageId,
        'readBy.userId': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            userId,
            readAt: new Date()
          }
        }
      }
    );
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
};

// Update message status
export const updateMessageStatus = async (messageId: string, status: ChatMessage['status']): Promise<void> => {
  try {
    const db = await getDatabase();
    const messagesCollection = db.collection<ChatMessage>(COLLECTIONS.MESSAGES);
    
    await messagesCollection.updateOne(
      { id: messageId },
      { $set: { status } }
    );
  } catch (error) {
    console.error('Error updating message status:', error);
  }
};

// Create or update family chat room
export const createOrUpdateFamilyRoom = async (familyId: string, familyName: string, members: Array<{userId: string, userName: string}>): Promise<FamilyChatRoom> => {
  try {
    const db = await getDatabase();
    const roomsCollection = db.collection<FamilyChatRoom>(COLLECTIONS.ROOMS);
    
    const existingRoom = await roomsCollection.findOne({ familyId });
    
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

    if (existingRoom) {
      await roomsCollection.updateOne(
        { familyId },
        { $set: roomData }
      );
      return { ...existingRoom, ...roomData };
    } else {
      const newRoom: FamilyChatRoom = {
        ...roomData as FamilyChatRoom,
        createdAt: new Date()
      };
      
      await roomsCollection.insertOne(newRoom);
      return newRoom;
    }
  } catch (error) {
    console.error('Error creating/updating family room:', error);
    throw error;
  }
};

// Update family room's last message
export const updateFamilyRoomLastMessage = async (
  familyId: string, 
  lastMessage: { content: string; timestamp: Date; senderName: string }
): Promise<void> => {
  try {
    const db = await getDatabase();
    const roomsCollection = db.collection<FamilyChatRoom>(COLLECTIONS.ROOMS);
    
    await roomsCollection.updateOne(
      { familyId },
      { 
        $set: { 
          lastMessage,
          updatedAt: new Date()
        }
      }
    );
  } catch (error) {
    console.error('Error updating family room last message:', error);
  }
};

// Update user online status
export const updateOnlineStatus = async (userId: string, familyId: string, isOnline: boolean): Promise<void> => {
  try {
    const db = await getDatabase();
    const statusCollection = db.collection<OnlineStatus>(COLLECTIONS.ONLINE_STATUS);
    
    await statusCollection.updateOne(
      { userId, familyId },
      {
        $set: {
          isOnline,
          lastSeen: new Date(),
          deviceInfo: navigator.userAgent
        }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating online status:', error);
  }
};

// Get online family members
export const getOnlineFamilyMembers = async (familyId: string): Promise<string[]> => {
  try {
    const db = await getDatabase();
    const statusCollection = db.collection<OnlineStatus>(COLLECTIONS.ONLINE_STATUS);
    
    // Consider users online if they were active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineMembers = await statusCollection
      .find({
        familyId,
        $or: [
          { isOnline: true },
          { lastSeen: { $gte: fiveMinutesAgo } }
        ]
      })
      .toArray();

    return onlineMembers.map(member => member.userId);
  } catch (error) {
    console.error('Error fetching online family members:', error);
    return [];
  }
};

// Delete a message (soft delete)
export const deleteMessage = async (messageId: string, userId: string): Promise<boolean> => {
  try {
    const db = await getDatabase();
    const messagesCollection = db.collection<ChatMessage>(COLLECTIONS.MESSAGES);
    
    const result = await messagesCollection.updateOne(
      { id: messageId, senderId: userId },
      { 
        $set: { 
          isDeleted: true,
          content: 'This message was deleted'
        }
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
};