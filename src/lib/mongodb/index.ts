// MongoDB exports
export * from './connection';
export * from './types';
export * from './chat';

// Re-export main functions for easy import
export {
  connectToMongoDB,
  getDatabase,
  closeMongoDB
} from './connection';

export {
  sendMessage,
  getFamilyMessages,
  getNewMessages,
  markMessageAsRead,
  updateMessageStatus,
  createOrUpdateFamilyRoom,
  updateOnlineStatus,
  getOnlineFamilyMembers,
  deleteMessage
} from './chat';

export type {
  ChatMessage,
  FamilyChatRoom,
  OnlineStatus
} from './types';