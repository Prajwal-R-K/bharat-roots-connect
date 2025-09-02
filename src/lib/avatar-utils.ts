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
 * Get default avatar based on gender and age
 */
export const getDefaultAvatar = (gender?: string, age?: number, dateOfBirth?: string): string => {
  // Calculate age if not provided but dateOfBirth is available
  const actualAge = age || (dateOfBirth ? calculateAge(dateOfBirth) : 25);
  
  // Normalize gender
  const normalizedGender = gender?.toLowerCase() || 'male';
  
  // Age-based avatar selection
  if (actualAge <= 12) {
    // Child
    return normalizedGender === 'female' ? '/avatars/childdaughter.png' : '/avatars/children.png';
  } else if (actualAge <= 25) {
    // Young adult
    return normalizedGender === 'female' ? '/avatars/women.png' : '/avatars/man.png';
  } else if (actualAge <= 50) {
    // Adult
    return normalizedGender === 'female' ? '/avatars/mother.png' : '/avatars/father.png';
  } else {
    // Senior
    return normalizedGender === 'female' ? '/avatars/grandmother.png' : '/avatars/grandfather.png';
  }
};

/**
 * Get avatar for family member with fallback to profile picture
 */
export const getAvatarForMember = (member: AvatarSelection, profilePictureUrl?: string): string => {
  // If user has uploaded a profile picture, use that
  if (profilePictureUrl) {
    return profilePictureUrl;
  }
  
  // Otherwise use default avatar based on age and gender
  return getDefaultAvatar(member.gender, member.age, member.dateOfBirth);
};
