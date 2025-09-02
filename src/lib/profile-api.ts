// Profile API service
const API_BASE_URL = 'http://localhost:3001/api';

// Upload profile photo
export const uploadProfilePhoto = async (
  userId: string,
  familyId: string,
  photoFile: File
): Promise<{ success: boolean; photoUrl: string; photoId: string }> => {
  try {
    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('userId', userId);
    formData.append('familyId', familyId);

    const response = await fetch(`${API_BASE_URL}/profile/upload-photo`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Profile photo upload failed:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return {
      success: result.success,
      photoUrl: result.photoUrl,
      photoId: result.photoId
    };
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
};

// Get full profile photo URL
export const getProfilePhotoUrl = (photoUrl: string): string => {
  if (photoUrl.startsWith('http')) {
    return photoUrl;
  }
  return `${API_BASE_URL.replace('/api', '')}${photoUrl}`;
};
