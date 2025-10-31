import { getDatabase } from './connection';
import type { 
  HealthRecord, 
  PropertyRecord, 
  VerificationRequest,
  HealthPropertyStats 
} from './health-property-types';

const HEALTH_COLLECTION = 'health_records';
const PROPERTY_COLLECTION = 'property_records';
const VERIFICATION_COLLECTION = 'verification_requests';

// ============ HEALTH RECORDS ============

export const createHealthRecord = async (record: Omit<HealthRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<HealthRecord> => {
  const db = await getDatabase();
  const healthCollection = db.collection<HealthRecord>(HEALTH_COLLECTION);
  
  const newRecord: HealthRecord = {
    ...record,
    verified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const result = await healthCollection.insertOne(newRecord as any);
  return { ...newRecord, _id: result.insertedId.toString() };
};

export const getHealthRecord = async (userId: string): Promise<HealthRecord | null> => {
  const db = await getDatabase();
  const healthCollection = db.collection<HealthRecord>(HEALTH_COLLECTION);
  
  const record = await healthCollection.findOne({ userId });
  return record;
};

export const updateHealthRecord = async (
  userId: string, 
  updates: Partial<HealthRecord>
): Promise<boolean> => {
  const db = await getDatabase();
  const healthCollection = db.collection<HealthRecord>(HEALTH_COLLECTION);
  
  const result = await healthCollection.updateOne(
    { userId },
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date().toISOString() 
      } 
    }
  );
  
  return result.modifiedCount > 0;
};

export const deleteHealthRecord = async (userId: string): Promise<boolean> => {
  const db = await getDatabase();
  const healthCollection = db.collection<HealthRecord>(HEALTH_COLLECTION);
  
  const result = await healthCollection.deleteOne({ userId });
  return result.deletedCount > 0;
};

export const getFamilyHealthRecords = async (
  familyTreeId: string,
  requesterUserId: string
): Promise<HealthRecord[]> => {
  const db = await getDatabase();
  const healthCollection = db.collection<HealthRecord>(HEALTH_COLLECTION);
  
  // Get records that are either:
  // 1. Owned by requester
  // 2. Have public/family visibility
  // 3. Explicitly shared with requester
  const records = await healthCollection.find({
    familyTreeId,
    $or: [
      { userId: requesterUserId },
      { 'privacySettings.visibility': { $in: ['public', 'family'] } },
      { 'privacySettings.sharedWith': requesterUserId }
    ]
  }).toArray();
  
  return records;
};

// ============ PROPERTY RECORDS ============

export const createPropertyRecord = async (record: Omit<PropertyRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<PropertyRecord> => {
  const db = await getDatabase();
  const propertyCollection = db.collection<PropertyRecord>(PROPERTY_COLLECTION);
  
  const newRecord: PropertyRecord = {
    ...record,
    verified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const result = await propertyCollection.insertOne(newRecord as any);
  return { ...newRecord, _id: result.insertedId.toString() };
};

export const getPropertyRecords = async (userId: string): Promise<PropertyRecord[]> => {
  const db = await getDatabase();
  const propertyCollection = db.collection<PropertyRecord>(PROPERTY_COLLECTION);
  
  // Get properties where user is owner or co-owner
  const records = await propertyCollection.find({
    $or: [
      { userId },
      { owners: userId }
    ]
  }).toArray();
  
  return records;
};

export const getPropertyRecord = async (recordId: string): Promise<PropertyRecord | null> => {
  const db = await getDatabase();
  const propertyCollection = db.collection<PropertyRecord>(PROPERTY_COLLECTION);
  
  const record = await propertyCollection.findOne({ _id: recordId } as any);
  return record;
};

export const updatePropertyRecord = async (
  recordId: string,
  updates: Partial<PropertyRecord>
): Promise<boolean> => {
  const db = await getDatabase();
  const propertyCollection = db.collection<PropertyRecord>(PROPERTY_COLLECTION);
  
  const result = await propertyCollection.updateOne(
    { _id: recordId } as any,
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date().toISOString() 
      } 
    }
  );
  
  return result.modifiedCount > 0;
};

export const deletePropertyRecord = async (recordId: string): Promise<boolean> => {
  const db = await getDatabase();
  const propertyCollection = db.collection<PropertyRecord>(PROPERTY_COLLECTION);
  
  const result = await propertyCollection.deleteOne({ _id: recordId } as any);
  return result.deletedCount > 0;
};

export const getFamilyPropertyRecords = async (
  familyTreeId: string,
  requesterUserId: string
): Promise<PropertyRecord[]> => {
  const db = await getDatabase();
  const propertyCollection = db.collection<PropertyRecord>(PROPERTY_COLLECTION);
  
  // Get records that are accessible to requester
  const records = await propertyCollection.find({
    familyTreeId,
    $or: [
      { userId: requesterUserId },
      { owners: requesterUserId },
      { 'privacySettings.visibility': { $in: ['public', 'family'] } },
      { 'privacySettings.sharedWith': requesterUserId }
    ]
  }).toArray();
  
  return records;
};

// ============ VERIFICATION ============

export const createVerificationRequest = async (
  request: Omit<VerificationRequest, '_id' | 'createdAt'>
): Promise<VerificationRequest> => {
  const db = await getDatabase();
  const verificationCollection = db.collection<VerificationRequest>(VERIFICATION_COLLECTION);
  
  const newRequest: VerificationRequest = {
    ...request,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  const result = await verificationCollection.insertOne(newRequest as any);
  return { ...newRequest, _id: result.insertedId.toString() };
};

export const getVerificationRequests = async (userId: string): Promise<VerificationRequest[]> => {
  const db = await getDatabase();
  const verificationCollection = db.collection<VerificationRequest>(VERIFICATION_COLLECTION);
  
  // Get requests for this user (to verify others' records)
  const requests = await verificationCollection.find({
    requestedFor: userId,
    status: 'pending'
  }).toArray();
  
  return requests;
};

export const approveVerificationRequest = async (
  requestId: string,
  verifiedBy: string
): Promise<boolean> => {
  const db = await getDatabase();
  const verificationCollection = db.collection<VerificationRequest>(VERIFICATION_COLLECTION);
  
  // Get the request
  const request = await verificationCollection.findOne({ _id: requestId } as any);
  if (!request) return false;
  
  // Update the verification request
  await verificationCollection.updateOne(
    { _id: requestId } as any,
    {
      $set: {
        status: 'approved',
        resolvedAt: new Date().toISOString(),
        resolvedBy: verifiedBy
      }
    }
  );
  
  // Update the actual record
  const collection = request.requestType === 'health' ? HEALTH_COLLECTION : PROPERTY_COLLECTION;
  const recordCollection = db.collection(collection);
  
  await recordCollection.updateOne(
    { _id: request.recordId } as any,
    {
      $set: {
        verified: true,
        verifiedBy,
        verifiedAt: new Date().toISOString()
      }
    }
  );
  
  return true;
};

export const rejectVerificationRequest = async (
  requestId: string,
  reason: string,
  rejectedBy: string
): Promise<boolean> => {
  const db = await getDatabase();
  const verificationCollection = db.collection<VerificationRequest>(VERIFICATION_COLLECTION);
  
  const result = await verificationCollection.updateOne(
    { _id: requestId } as any,
    {
      $set: {
        status: 'rejected',
        reason,
        resolvedAt: new Date().toISOString(),
        resolvedBy: rejectedBy
      }
    }
  );
  
  return result.modifiedCount > 0;
};

// ============ STATISTICS ============

export const getHealthPropertyStats = async (
  userId: string,
  familyTreeId: string
): Promise<HealthPropertyStats> => {
  const db = await getDatabase();
  
  const healthCollection = db.collection<HealthRecord>(HEALTH_COLLECTION);
  const propertyCollection = db.collection<PropertyRecord>(PROPERTY_COLLECTION);
  const verificationCollection = db.collection<VerificationRequest>(VERIFICATION_COLLECTION);
  
  const [
    totalHealthRecords,
    totalPropertyRecords,
    verifiedHealth,
    verifiedProperty,
    pendingVerifications
  ] = await Promise.all([
    healthCollection.countDocuments({ familyTreeId }),
    propertyCollection.countDocuments({ familyTreeId }),
    healthCollection.countDocuments({ familyTreeId, verified: true }),
    propertyCollection.countDocuments({ familyTreeId, verified: true }),
    verificationCollection.countDocuments({ requestedFor: userId, status: 'pending' })
  ]);
  
  return {
    totalHealthRecords,
    totalPropertyRecords,
    verifiedHealth,
    verifiedProperty,
    pendingVerifications
  };
};

// ============ PRIVACY & SHARING ============

export const updatePrivacySettings = async (
  recordType: 'health' | 'property',
  recordId: string,
  privacySettings: Partial<any>
): Promise<boolean> => {
  const db = await getDatabase();
  const collection = recordType === 'health' ? HEALTH_COLLECTION : PROPERTY_COLLECTION;
  const recordCollection = db.collection(collection);
  
  const result = await recordCollection.updateOne(
    { _id: recordId } as any,
    {
      $set: {
        privacySettings,
        updatedAt: new Date().toISOString()
      }
    }
  );
  
  return result.modifiedCount > 0;
};

export const shareRecordWithUser = async (
  recordType: 'health' | 'property',
  recordId: string,
  targetUserId: string
): Promise<boolean> => {
  const db = await getDatabase();
  const collection = recordType === 'health' ? HEALTH_COLLECTION : PROPERTY_COLLECTION;
  const recordCollection = db.collection(collection);
  
  const result = await recordCollection.updateOne(
    { _id: recordId } as any,
    {
      $addToSet: {
        'privacySettings.sharedWith': targetUserId
      },
      $set: {
        updatedAt: new Date().toISOString()
      }
    }
  );
  
  return result.modifiedCount > 0;
};

export const revokeRecordAccess = async (
  recordType: 'health' | 'property',
  recordId: string,
  targetUserId: string
): Promise<boolean> => {
  const db = await getDatabase();
  const collection = recordType === 'health' ? HEALTH_COLLECTION : PROPERTY_COLLECTION;
  const recordCollection = db.collection(collection);
  
  const result = await recordCollection.updateOne(
    { _id: recordId } as any,
    {
      $pull: {
        'privacySettings.sharedWith': targetUserId
      } as any,
      $set: {
        updatedAt: new Date().toISOString()
      }
    } as any
  );
  
  return result.modifiedCount > 0;
};
