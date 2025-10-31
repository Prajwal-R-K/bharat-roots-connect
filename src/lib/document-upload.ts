// Document Upload Service with Security and Privacy Controls

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface UploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  folder?: string;
}

// In a real application, this would integrate with services like AWS S3, Azure Blob Storage, or Cloudinary
// For now, we'll simulate the upload process using local storage or data URLs

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const uploadDocument = async (
  file: File,
  options: UploadOptions = {}
): Promise<UploadedFile> => {
  const maxSize = options.maxSize || DEFAULT_MAX_SIZE;
  const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_TYPES;
  const folder = options.folder || 'documents';

  // Validate file size
  if (file.size > maxSize) {
    throw new Error(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
  }

  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Generate unique ID
  const id = generateFileId();
  const timestamp = new Date().toISOString();

  // Simulate file upload (in production, upload to cloud storage)
  const uploadedFile: UploadedFile = await simulateFileUpload(file, id, folder);

  return {
    ...uploadedFile,
    uploadedAt: timestamp
  };
};

const generateFileId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const simulateFileUpload = async (
  file: File,
  id: string,
  folder: string
): Promise<UploadedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) {
        reject(new Error('Failed to read file'));
        return;
      }

      // Store in localStorage or IndexedDB (for demo purposes)
      // In production, this would be uploaded to cloud storage
      const dataUrl = result as string;
      const storageKey = `${folder}/${id}`;
      
      try {
        localStorage.setItem(storageKey, dataUrl);
        
        resolve({
          id,
          name: file.name,
          url: storageKey, // In production, this would be the cloud storage URL
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        });
      } catch (error) {
        reject(new Error('Storage quota exceeded. Please delete some files and try again.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

export const getDocumentUrl = (storageKey: string): string | null => {
  try {
    return localStorage.getItem(storageKey);
  } catch (error) {
    console.error('Failed to retrieve document:', error);
    return null;
  }
};

export const deleteDocument = async (storageKey: string): Promise<boolean> => {
  try {
    localStorage.removeItem(storageKey);
    return true;
  } catch (error) {
    console.error('Failed to delete document:', error);
    return false;
  }
};

// Sanitize filename to prevent directory traversal and other attacks
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
};

// Validate and sanitize file before upload
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file name
  if (!file.name || file.name.trim() === '') {
    return { valid: false, error: 'Invalid file name' };
  }

  // Check for potentially malicious file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.scr', '.vbs', '.js'];
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (dangerousExtensions.includes(extension)) {
    return { valid: false, error: 'File type not allowed for security reasons' };
  }

  // Check if size is reasonable
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (file.size > DEFAULT_MAX_SIZE) {
    return { valid: false, error: `File too large (max ${DEFAULT_MAX_SIZE / (1024 * 1024)}MB)` };
  }

  return { valid: true };
};

// Generate secure file hash for integrity checking
export const generateFileHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Get file icon based on type
export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
  return '📎';
};
