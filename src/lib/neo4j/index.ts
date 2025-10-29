
// Re-export everything from the neo4j modules
export * from './connection';
export * from './users';
export * from './family-tree';
export * from './relationships';
export * from './relationship-analysis';
export * from './auth';
export * from './invitations';

// Re-export email functions needed for auth
export { sendEmail, sendInvitationEmail, getEmailLogs, hasEmailBeenSent, getLatestEmail } from '../email';

// Explicit named exports for interconnect helpers to satisfy TS resolution
export {
  createInterconnectRequest,
  getIncomingInterconnectRequests,
  getOutgoingInterconnectRequests,
  getUnreadInterconnectCount,
  markInterconnectRequestRead,
  acceptInterconnectRequest,
  rejectInterconnectRequest,
  deleteInterconnectRequestForUser,
} from './relationships';

export { getFamilyTreeMetaGraph } from './family-tree';

