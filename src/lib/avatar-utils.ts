// src/lib/avatar-utils.ts

interface AvatarSelection {
  gender?: string;
  age?: number;
  dateOfBirth?: string;
}

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 25; // Default age
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age > 0 ? age : 25; // Default to 25 if invalid
};

/**
 * Get default avatar based on member data
 */
export const getDefaultAvatar = (member: any): string => {
  console.log('🎨 Avatar Selection Debug - Member Data:', member);
  
  // Extract values safely, handling both direct values and Neo4j property objects
  const extractValue = (value: any) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object' && value.hasOwnProperty('value')) {
      return value.value;
    }
    return value;
  };
  
  const gender = extractValue(member.gender);
  const myRelationship = extractValue(member.myRelationship);
  
  console.log('🎨 Extracted values:', { gender, myRelationship });
  
  // Normalize gender - handle various gender formats
  const normalizedGender = gender?.toString()?.toLowerCase()?.trim() || 'male';
  
  // Normalize relationship
  const relationship = myRelationship?.toString()?.toLowerCase()?.trim() || '';
  
  console.log('🎨 Processed values:', { normalizedGender, relationship });
  
  let selectedAvatar = '';
  
  // Avatar selection based on relationship and gender
  if (relationship === 'daughter' || relationship === 'son') {
    // Children
    selectedAvatar = normalizedGender === 'female' ? '/avatars/childdaughter.png' : '/avatars/chiledson.png';
  } else if (relationship === 'mother' || relationship === 'father') {
    // Parents
    selectedAvatar = normalizedGender === 'female' ? '/avatars/mother.png' : '/avatars/father.png';
  } else if (relationship === 'grandmother' || relationship === 'grandfather') {
    // Grandparents
    selectedAvatar = normalizedGender === 'female' ? '/avatars/grandmother.png' : '/avatars/grandfather.png';
  } else if (relationship === 'wife' || relationship === 'husband') {
    // Spouses - assume married adults
    selectedAvatar = normalizedGender === 'female' ? '/avatars/mother.png' : '/avatars/father.png';
  } else {
    // Default for other relationships (sister, brother, etc.) - young adults
    selectedAvatar = normalizedGender === 'female' ? '/avatars/women.png' : '/avatars/man.png';
  }
  
  console.log('🎨 Selected avatar:', selectedAvatar);
  return selectedAvatar;
};

/**
 * Get avatar for family member with fallback to profile picture
 */
export const getAvatarForMember = (member: any, profilePictureUrl?: string): string => {
  // If user has uploaded a profile picture, use that
  if (profilePictureUrl) {
    return profilePictureUrl;
  }
  
  // Otherwise use default avatar based on member data
  return getDefaultAvatar(member);
};
