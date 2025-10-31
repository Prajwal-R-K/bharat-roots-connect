// MongoDB Types for Health and Property Management

export interface HealthRecord {
  _id?: string;
  userId: string;
  familyTreeId: string;
  bloodGroup?: string;
  allergies?: string[];
  chronicConditions?: string[];
  medications?: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory?: string;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
  };
  documents?: HealthDocument[];
  privacySettings: PrivacySettings;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthDocument {
  id: string;
  name: string;
  type: 'medical-report' | 'prescription' | 'insurance' | 'vaccination' | 'other';
  url: string;
  uploadedAt: string;
  size: number;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface PropertyRecord {
  _id?: string;
  userId: string;
  familyTreeId: string;
  propertyType: 'residential' | 'commercial' | 'agricultural' | 'land' | 'other';
  title: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  area?: {
    value: number;
    unit: 'sqft' | 'sqm' | 'acres' | 'hectares';
  };
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  ownershipType: 'sole' | 'joint' | 'inherited' | 'trust';
  owners?: string[]; // Array of user IDs
  description?: string;
  documents?: PropertyDocument[];
  privacySettings: PrivacySettings;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyDocument {
  id: string;
  name: string;
  type: 'deed' | 'tax-receipt' | 'registration' | 'survey' | 'photo' | 'other';
  url: string;
  uploadedAt: string;
  size: number;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface PrivacySettings {
  visibility: 'public' | 'family' | 'private';
  sharedWith?: string[]; // Array of user IDs with explicit access
  allowVerification: boolean;
}

export interface VerificationRequest {
  _id?: string;
  requestType: 'health' | 'property';
  recordId: string;
  requestedBy: string;
  requestedFor: string; // userId of record owner
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  documents?: string[]; // Document IDs to verify
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  documentId?: string;
  url?: string;
  error?: string;
}

export interface HealthPropertyStats {
  totalHealthRecords: number;
  totalPropertyRecords: number;
  verifiedHealth: number;
  verifiedProperty: number;
  pendingVerifications: number;
}
