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
  // Calculate age if not provided but dateOfBirth is available
  const actualAge = age || (dateOfBirth ? calculateAge(dateOfBirth) : 25);
  
  // Normalize gender
  const normalizedGender = gender?.toLowerCase() || 'male';
  const isMarried = married?.toLowerCase() === 'married';
  
  // Age-based avatar selection with exact constraints
  if (actualAge < 12) {
    // Children under 12
    return normalizedGender === 'female' ? '/avatars/childdaughter.png' : '/avatars/chiledson.png';
  } else if (actualAge >= 12 && actualAge < 30) {
    // Young adults 12-29
    return normalizedGender === 'female' ? '/avatars/women.png' : '/avatars/man.png';
  } else if (isMarried && actualAge >= 30 && actualAge < 50) {
    // Married adults 30-49 (parents)
    return normalizedGender === 'female' ? '/avatars/mother.png' : '/avatars/father.png';
  } else if (isMarried && actualAge >= 50 && actualAge < 100) {
    // Married seniors 50-99 (grandparents)
    return normalizedGender === 'female' ? '/avatars/grandmother.png' : '/avatars/grandfather.png';
  } else {
    // Default for unmarried adults or edge cases
    return normalizedGender === 'female' ? '/avatars/women.png' : '/avatars/man.png';
  }
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
