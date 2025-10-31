// Browser-compatible storage for Health and Property records
// Uses localStorage with MongoDB-like API for easy backend migration

import type { 
  HealthRecord, 
  PropertyRecord, 
  VerificationRequest,
  HealthPropertyStats 
} from '../mongodb/health-property-types';

const HEALTH_STORAGE_KEY = 'bhandan_health_records';
const PROPERTY_STORAGE_KEY = 'bhandan_property_records';
const VERIFICATION_STORAGE_KEY = 'bhandan_verification_requests';

// Helper functions for localStorage operations
const getFromStorage = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading from storage (${key}):`, error);
    return [];
  }
};

const saveToStorage = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to storage (${key}):`, error);
  }
};

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============ HEALTH RECORDS ============

export const createHealthRecord = async (record: Omit<HealthRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<HealthRecord> => {
  const records = getFromStorage<HealthRecord>(HEALTH_STORAGE_KEY);
  
  const newRecord: HealthRecord = {
    ...record,
    _id: generateId(),
    verified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  records.push(newRecord);
  saveToStorage(HEALTH_STORAGE_KEY, records);
  
  return newRecord;
};

export const getHealthRecord = async (userId: string): Promise<HealthRecord | null> => {
  const records = getFromStorage<HealthRecord>(HEALTH_STORAGE_KEY);
  const record = records.find(r => r.userId === userId);
  return record || null;
};

export const updateHealthRecord = async (
  userId: string, 
  updates: Partial<HealthRecord>
): Promise<boolean> => {
  const records = getFromStorage<HealthRecord>(HEALTH_STORAGE_KEY);
  const index = records.findIndex(r => r.userId === userId);
  
  if (index === -1) return false;
  
  records[index] = {
    ...records[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  saveToStorage(HEALTH_STORAGE_KEY, records);
  return true;
};

export const deleteHealthRecord = async (userId: string): Promise<boolean> => {
  const records = getFromStorage<HealthRecord>(HEALTH_STORAGE_KEY);
  const filtered = records.filter(r => r.userId !== userId);
  
  if (filtered.length === records.length) return false;
  
  saveToStorage(HEALTH_STORAGE_KEY, filtered);
  return true;
};

export const getFamilyHealthRecords = async (
  familyTreeId: string,
  requesterUserId: string
): Promise<HealthRecord[]> => {
  const records = getFromStorage<HealthRecord>(HEALTH_STORAGE_KEY);
  
  return records.filter(record => {
    if (record.familyTreeId !== familyTreeId) return false;
    
    // Check access permissions
    if (record.userId === requesterUserId) return true;
    if (record.privacySettings.visibility === 'public' || record.privacySettings.visibility === 'family') return true;
    if (record.privacySettings.sharedWith?.includes(requesterUserId)) return true;
    
    return false;
  });
};

// ============ PROPERTY RECORDS ============

export const createPropertyRecord = async (record: Omit<PropertyRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<PropertyRecord> => {
  const records = getFromStorage<PropertyRecord>(PROPERTY_STORAGE_KEY);
  
  const newRecord: PropertyRecord = {
    ...record,
    _id: generateId(),
    verified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  records.push(newRecord);
  saveToStorage(PROPERTY_STORAGE_KEY, records);
  
  return newRecord;
};

export const getPropertyRecords = async (userId: string): Promise<PropertyRecord[]> => {
  const records = getFromStorage<PropertyRecord>(PROPERTY_STORAGE_KEY);
  
  return records.filter(record => 
    record.userId === userId || record.owners?.includes(userId)
  );
};

export const getPropertyRecord = async (recordId: string): Promise<PropertyRecord | null> => {
  const records = getFromStorage<PropertyRecord>(PROPERTY_STORAGE_KEY);
  const record = records.find(r => r._id === recordId);
  return record || null;
};

export const updatePropertyRecord = async (
  recordId: string,
  updates: Partial<PropertyRecord>
): Promise<boolean> => {
  const records = getFromStorage<PropertyRecord>(PROPERTY_STORAGE_KEY);
  const index = records.findIndex(r => r._id === recordId);
  
  if (index === -1) return false;
  
  records[index] = {
    ...records[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  saveToStorage(PROPERTY_STORAGE_KEY, records);
  return true;
};

export const deletePropertyRecord = async (recordId: string): Promise<boolean> => {
  const records = getFromStorage<PropertyRecord>(PROPERTY_STORAGE_KEY);
  const filtered = records.filter(r => r._id !== recordId);
  
  if (filtered.length === records.length) return false;
  
  saveToStorage(PROPERTY_STORAGE_KEY, filtered);
  return true;
};

export const getFamilyPropertyRecords = async (
  familyTreeId: string,
  requesterUserId: string
): Promise<PropertyRecord[]> => {
  const records = getFromStorage<PropertyRecord>(PROPERTY_STORAGE_KEY);
  
  return records.filter(record => {
    if (record.familyTreeId !== familyTreeId) return false;
    
    // Check access permissions
    if (record.userId === requesterUserId || record.owners?.includes(requesterUserId)) return true;
    if (record.privacySettings.visibility === 'public' || record.privacySettings.visibility === 'family') return true;
    if (record.privacySettings.sharedWith?.includes(requesterUserId)) return true;
    
    return false;
  });
};

// ============ VERIFICATION ============

export const createVerificationRequest = async (
  request: Omit<VerificationRequest, '_id' | 'createdAt'>
): Promise<VerificationRequest> => {
  const requests = getFromStorage<VerificationRequest>(VERIFICATION_STORAGE_KEY);
  
  const newRequest: VerificationRequest = {
    ...request,
    _id: generateId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  requests.push(newRequest);
  saveToStorage(VERIFICATION_STORAGE_KEY, requests);
  
  return newRequest;
};

export const getVerificationRequests = async (userId: string): Promise<VerificationRequest[]> => {
  const requests = getFromStorage<VerificationRequest>(VERIFICATION_STORAGE_KEY);
  
  return requests.filter(req => 
    req.requestedFor === userId && req.status === 'pending'
  );
};

export const approveVerificationRequest = async (
  requestId: string,
  verifiedBy: string
): Promise<boolean> => {
  const requests = getFromStorage<VerificationRequest>(VERIFICATION_STORAGE_KEY);
  const request = requests.find(r => r._id === requestId);
  
  if (!request) return false;
  
  // Update the verification request
  const requestIndex = requests.findIndex(r => r._id === requestId);
  requests[requestIndex] = {
    ...request,
    status: 'approved',
    resolvedAt: new Date().toISOString(),
    resolvedBy: verifiedBy
  };
  saveToStorage(VERIFICATION_STORAGE_KEY, requests);
  
  // Update the actual record
  if (request.requestType === 'health') {
    const healthRecords = getFromStorage<HealthRecord>(HEALTH_STORAGE_KEY);
    const recordIndex = healthRecords.findIndex(r => r._id === request.recordId);
    if (recordIndex !== -1) {
      healthRecords[recordIndex] = {
        ...healthRecords[recordIndex],
        verified: true,
        verifiedBy,
        verifiedAt: new Date().toISOString()
      };
      saveToStorage(HEALTH_STORAGE_KEY, healthRecords);
    }
  } else {
    const propertyRecords = getFromStorage<PropertyRecord>(PROPERTY_STORAGE_KEY);
    const recordIndex = propertyRecords.findIndex(r => r._id === request.recordId);
    if (recordIndex !== -1) {
      propertyRecords[recordIndex] = {
        ...propertyRecords[recordIndex],
        verified: true,
        verifiedBy,
        verifiedAt: new Date().toISOString()
      };
      saveToStorage(PROPERTY_STORAGE_KEY, propertyRecords);
    }
  }
  
  return true;
};

export const rejectVerificationRequest = async (
  requestId: string,
  reason: string,
  rejectedBy: string
): Promise<boolean> => {
  const requests = getFromStorage<VerificationRequest>(VERIFICATION_STORAGE_KEY);
  const index = requests.findIndex(r => r._id === requestId);
  
  if (index === -1) return false;
  
  requests[index] = {
    ...requests[index],
    status: 'rejected',
    reason,
    resolvedAt: new Date().toISOString(),
    resolvedBy: rejectedBy
  };
  
  saveToStorage(VERIFICATION_STORAGE_KEY, requests);
  return true;
};

// ============ STATISTICS ============

export const getHealthPropertyStats = async (
  userId: string,
  familyTreeId: string
): Promise<HealthPropertyStats> => {
  const healthRecords = getFromStorage<HealthRecord>(HEALTH_STORAGE_KEY);
  const propertyRecords = getFromStorage<PropertyRecord>(PROPERTY_STORAGE_KEY);
  const verificationRequests = getFromStorage<VerificationRequest>(VERIFICATION_STORAGE_KEY);
  
  const familyHealthRecords = healthRecords.filter(r => r.familyTreeId === familyTreeId);
  const familyPropertyRecords = propertyRecords.filter(r => r.familyTreeId === familyTreeId);
  const pendingVerifications = verificationRequests.filter(
    r => r.requestedFor === userId && r.status === 'pending'
  );
  
  return {
    totalHealthRecords: familyHealthRecords.length,
    totalPropertyRecords: familyPropertyRecords.length,
    verifiedHealth: familyHealthRecords.filter(r => r.verified).length,
    verifiedProperty: familyPropertyRecords.filter(r => r.verified).length,
    pendingVerifications: pendingVerifications.length
  };
};

// ============ PRIVACY & SHARING ============

export const updatePrivacySettings = async (
  recordType: 'health' | 'property',
  recordId: string,
  privacySettings: Partial<any>
): Promise<boolean> => {
  const storageKey = recordType === 'health' ? HEALTH_STORAGE_KEY : PROPERTY_STORAGE_KEY;
  const records = getFromStorage<any>(storageKey);
  const index = records.findIndex((r: any) => r._id === recordId);
  
  if (index === -1) return false;
  
  records[index] = {
    ...records[index],
    privacySettings: {
      ...records[index].privacySettings,
      ...privacySettings
    },
    updatedAt: new Date().toISOString()
  };
  
  saveToStorage(storageKey, records);
  return true;
};

export const shareRecordWithUser = async (
  recordType: 'health' | 'property',
  recordId: string,
  targetUserId: string
): Promise<boolean> => {
  const storageKey = recordType === 'health' ? HEALTH_STORAGE_KEY : PROPERTY_STORAGE_KEY;
  const records = getFromStorage<any>(storageKey);
  const index = records.findIndex((r: any) => r._id === recordId);
  
  if (index === -1) return false;
  
  const sharedWith = records[index].privacySettings.sharedWith || [];
  if (!sharedWith.includes(targetUserId)) {
    sharedWith.push(targetUserId);
  }
  
  records[index] = {
    ...records[index],
    privacySettings: {
      ...records[index].privacySettings,
      sharedWith
    },
    updatedAt: new Date().toISOString()
  };
  
  saveToStorage(storageKey, records);
  return true;
};

export const revokeRecordAccess = async (
  recordType: 'health' | 'property',
  recordId: string,
  targetUserId: string
): Promise<boolean> => {
  const storageKey = recordType === 'health' ? HEALTH_STORAGE_KEY : PROPERTY_STORAGE_KEY;
  const records = getFromStorage<any>(storageKey);
  const index = records.findIndex((r: any) => r._id === recordId);
  
  if (index === -1) return false;
  
  const sharedWith = (records[index].privacySettings.sharedWith || []).filter(
    (id: string) => id !== targetUserId
  );
  
  records[index] = {
    ...records[index],
    privacySettings: {
      ...records[index].privacySettings,
      sharedWith
    },
    updatedAt: new Date().toISOString()
  };
  
  saveToStorage(storageKey, records);
  return true;
};
