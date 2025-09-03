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
  const age = extractValue(member.age);
  const dateOfBirth = extractValue(member.dateOfBirth);
  const married = extractValue(member.married) || extractValue(member.marriageStatus);
  
  console.log('🎨 Extracted values:', { gender, age, dateOfBirth, married });
  
  // Calculate age if not provided but dateOfBirth is available
  let actualAge = age;
  if (!actualAge && dateOfBirth) {
    actualAge = calculateAge(dateOfBirth);
  }
  if (!actualAge) actualAge = 25; // Default age
  
  // Normalize gender - handle various gender formats
  const normalizedGender = gender?.toString()?.toLowerCase()?.trim() || 'male';
  
  // Normalize marital status - handle various formats
  const marriageStatus = married?.toString()?.toLowerCase()?.trim() || 'single';
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
export const getAvatarForMember = (member: any, profilePictureUrl?: string): string => {
  // If user has uploaded a profile picture, use that
  if (profilePictureUrl) {
    return profilePictureUrl;
  }
  
  // Otherwise use default avatar based on member data
  return getDefaultAvatar(member);
};
