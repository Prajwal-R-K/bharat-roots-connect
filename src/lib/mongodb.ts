// MongoDB operations for browser environment
// This is a client-side implementation that should connect to a backend API
// In a production environment, you would never expose MongoDB directly to the browser

import { ChatMessage, ChatRoom } from '@/types';

// For development, we'll simulate the MongoDB operations
// In production, these would be API calls to your backend

class MockMongoDB {
  private messages: ChatMessage[] = [];
  private chatRooms: ChatRoom[] = [];

  // Simulate async operations
  private async delay(ms: number = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    await this.delay();
    const messageWithId = {
      ...message,
      _id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    this.messages.push(messageWithId);
    console.log('Message saved to local storage:', messageWithId);
    
    // Store in localStorage for persistence during dev
    localStorage.setItem('chat_messages', JSON.stringify(this.messages));
  }

  async getMessagesByFamilyTree(familyTreeId: string, limit: number = 50): Promise<ChatMessage[]> {
    await this.delay();
    
    // Load from localStorage
    const stored = localStorage.getItem('chat_messages');
    if (stored) {
      this.messages = JSON.parse(stored);
    }
    
    const familyMessages = this.messages
      .filter(msg => msg.familyTreeId === familyTreeId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-limit);
      
    return familyMessages;
  }

  async getRecentMessages(familyTreeId: string, limit: number = 20): Promise<ChatMessage[]> {
    return this.getMessagesByFamilyTree(familyTreeId, limit);
  }

  async createChatRoom(familyTreeId: string, members: string[]): Promise<ChatRoom> {
    await this.delay();
    
    // Check if chat room already exists
    const existingRoom = this.chatRooms.find(room => room.familyTreeId === familyTreeId);
    if (existingRoom) {
      return existingRoom;
    }

    const chatRoom: ChatRoom = {
      _id: `room_${Date.now()}`,
      familyTreeId,
      members,
      createdAt: new Date()
    };

    this.chatRooms.push(chatRoom);
    localStorage.setItem('chat_rooms', JSON.stringify(this.chatRooms));
    return chatRoom;
  }

  async getChatRoom(familyTreeId: string): Promise<ChatRoom | null> {
    await this.delay();
    
    // Load from localStorage
    const stored = localStorage.getItem('chat_rooms');
    if (stored) {
      this.chatRooms = JSON.parse(stored);
    }
    
    return this.chatRooms.find(room => room.familyTreeId === familyTreeId) || null;
  }

  async updateChatRoomMembers(familyTreeId: string, members: string[]): Promise<void> {
    await this.delay();
    const roomIndex = this.chatRooms.findIndex(room => room.familyTreeId === familyTreeId);
    if (roomIndex !== -1) {
      this.chatRooms[roomIndex].members = members;
      localStorage.setItem('chat_rooms', JSON.stringify(this.chatRooms));
    }
  }
}

// For development, we'll use the mock implementation
// In production, you would replace this with actual API calls
const mongoDb = new MockMongoDB();

export default mongoDb;

// Helper functions for easy use
export const saveMessage = (message: ChatMessage) => mongoDb.saveMessage(message);
export const getMessagesByFamilyTree = (familyTreeId: string, limit?: number) => 
  mongoDb.getMessagesByFamilyTree(familyTreeId, limit);
export const getRecentMessages = (familyTreeId: string, limit?: number) => 
  mongoDb.getRecentMessages(familyTreeId, limit);
export const createChatRoom = (familyTreeId: string, members: string[]) => 
  mongoDb.createChatRoom(familyTreeId, members);
export const getChatRoom = (familyTreeId: string) => mongoDb.getChatRoom(familyTreeId);
export const updateChatRoomMembers = (familyTreeId: string, members: string[]) => 
  mongoDb.updateChatRoomMembers(familyTreeId, members);

// Production API functions (to be implemented when backend is ready)
export const createBackendAPI = () => {
  const API_BASE = process.env.VITE_API_URL || 'http://localhost:3001/api';
  
  return {
    async saveMessage(message: ChatMessage): Promise<void> {
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      if (!response.ok) throw new Error('Failed to save message');
    },
    
    async getMessages(familyTreeId: string, limit: number = 50): Promise<ChatMessage[]> {
      const response = await fetch(`${API_BASE}/messages/${familyTreeId}?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    }
  };
};
