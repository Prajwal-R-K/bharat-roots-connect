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
 * Get default avatar based on gender, age, and marital status
 */
export const getDefaultAvatar = (gender?: string, age?: number, dateOfBirth?: string, married?: string): string => {
  console.log('🎨 Avatar Selection Debug:', { gender, age, dateOfBirth, married });
  
  // Calculate age if not provided but dateOfBirth is available
  const actualAge = age || (dateOfBirth ? calculateAge(dateOfBirth) : 25);
  
  // Normalize gender - handle various gender formats
  const normalizedGender = gender?.toLowerCase()?.trim() || 'male';
  
  // Normalize marital status - handle various formats
  const marriageStatus = married?.toLowerCase()?.trim() || 'single';
  const isMarried = marriageStatus === 'married' || marriageStatus === 'yes' || marriageStatus === 'true';
  
  console.log('🎨 Processed values:', { actualAge, normalizedGender, isMarried, marriageStatus });
  
  let selectedAvatar = '';
  
  // Age-based avatar selection with exact constraints
  if (actualAge < 12) {
    // Children under 12
    selectedAvatar = normalizedGender === 'female' ? '/avatars/childdaughter.png' : '/avatars/chiledson.png';
  } else if (actualAge >= 12 && actualAge < 30) {
    // Young adults 12-29
    selectedAvatar = normalizedGender === 'female' ? '/avatars/women.png' : '/avatars/man.png';
  } else if (isMarried && actualAge >= 30 && actualAge < 50) {
    // Married adults 30-49 (parents)
    selectedAvatar = normalizedGender === 'female' ? '/avatars/mother.png' : '/avatars/father.png';
  } else if (isMarried && actualAge >= 50) {
    // Married seniors 50+ (grandparents)
    selectedAvatar = normalizedGender === 'female' ? '/avatars/grandmother.png' : '/avatars/grandfather.png';
  } else {
    // Default for unmarried adults or edge cases
    selectedAvatar = normalizedGender === 'female' ? '/avatars/women.png' : '/avatars/man.png';
  }
  
  console.log('🎨 Selected avatar:', selectedAvatar);
  return selectedAvatar;
};

/**
 * Get avatar for family member with fallback to profile picture
 */
export const getAvatarForMember = (member: AvatarSelection & { married?: string }, profilePictureUrl?: string): string => {
  // If user has uploaded a profile picture, use that
  if (profilePictureUrl) {
    return profilePictureUrl;
  }
  
  // Otherwise use default avatar based on age, gender, and marital status
  return getDefaultAvatar(member.gender, member.age, member.dateOfBirth, member.married);
};
