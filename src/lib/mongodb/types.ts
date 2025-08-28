// MongoDB Chat Message Types
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
  replyTo?: string; // ID of message being replied to
}

// Family Chat Room
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

// Online Status
export interface OnlineStatus {
  _id?: string;
  userId: string;
  familyId: string;
  isOnline: boolean;
  lastSeen: Date;
  deviceInfo?: string;
}