// Nice Avatar Service - Generate SVG avatars based on age, gender
// Inspired by react-nice-avatar but implemented as SVG generation

export interface AvatarConfig {
  sex: 'man' | 'woman';
  faceColor: string;
  hairStyle: string;
  hairColor: string;
  eyeStyle: string;
  mouthStyle: string;
  shirtStyle: string;
  shirtColor: string;
  bgColor: string;
  isChild?: boolean;
  isSenior?: boolean;
}

// White skin tones
const FACE_COLORS = ['#fdbcb4', '#eaa086', '#f4d1c7', '#f7e7ce'];

// Hair colors for white people
const HAIR_COLORS = ['#8b4513', '#d2691e', '#daa520', '#f4a460', '#c0c0c0', '#696969'];

// Generate avatar config based on member data
export const genConfig = (member: any): AvatarConfig => {
  const isChild = member.relationship?.toLowerCase().includes('child') || 
                  member.relationship?.toLowerCase().includes('son') || 
                  member.relationship?.toLowerCase().includes('daughter');
  
  const isSenior = member.relationship?.toLowerCase().includes('grand') || 
                   member.relationship?.toLowerCase().includes('great');

  // Determine gender
  const sex = member.gender === 'female' ? 'woman' : 'man';

  // Face color (white skin tones)
  const faceColor = FACE_COLORS[Math.abs(hashCode(member.name)) % FACE_COLORS.length];

  // Hair style based on age and gender
  let hairStyle = 'normal';
  if (sex === 'woman') {
    if (isChild) {
      hairStyle = 'womanShort';
    } else if (isSenior) {
      hairStyle = 'womanShort';
    } else {
      hairStyle = Math.random() > 0.5 ? 'womanLong' : 'womanShort';
    }
  } else {
    if (isChild) {
      hairStyle = 'normal';
    } else if (isSenior) {
      hairStyle = 'normal';
    } else {
      hairStyle = ['normal', 'thick', 'mohawk'][Math.abs(hashCode(member.name + 'hair')) % 3];
    }
  }

  // Hair color
  let hairColor = HAIR_COLORS[Math.abs(hashCode(member.name + 'color')) % HAIR_COLORS.length];
  if (isSenior) {
    hairColor = '#c0c0c0'; // Gray for seniors
  }

  // Eye style
  const eyeStyle = ['circle', 'oval', 'smile'][Math.abs(hashCode(member.name + 'eyes')) % 3];

  // Mouth style
  const mouthStyle = ['smile', 'laugh', 'peace'][Math.abs(hashCode(member.name + 'mouth')) % 3];

  // Shirt style and color
  const shirtStyle = ['hoody', 'short', 'polo'][Math.abs(hashCode(member.name + 'shirt')) % 3];
  const shirtColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const shirtColor = shirtColors[Math.abs(hashCode(member.name + 'shirtcolor')) % shirtColors.length];

  // Background color based on gender
  const bgColor = sex === 'woman' ? '#fce7f3' : '#dbeafe';

  return {
    sex,
    faceColor,
    hairStyle,
    hairColor,
    eyeStyle,
    mouthStyle,
    shirtStyle,
    shirtColor,
    bgColor,
    isChild,
    isSenior
  };
};

// Simple hash function for consistent randomization
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate detailed SVG avatar like the image examples
export const generateDetailedAvatarSVG = (config: AvatarConfig): string => {
  const { sex, faceColor, hairStyle, hairColor, eyeStyle, mouthStyle, shirtStyle, shirtColor, bgColor, isChild, isSenior } = config;

  // Hair paths based on style and gender
  const getHairPath = () => {
    if (sex === 'woman') {
      switch (hairStyle) {
        case 'womanLong':
          return `
            <path d="M25 30 Q20 20 30 18 Q50 15 70 18 Q80 20 75 30 L80 65 Q75 70 70 65 L30 65 Q25 70 20 65 L25 30 Z" fill="${hairColor}"/>
            <path d="M20 35 Q15 30 20 25 Q25 20 30 25 L25 35 Z" fill="${hairColor}"/>
            <path d="M80 35 Q85 30 80 25 Q75 20 70 25 L75 35 Z" fill="${hairColor}"/>
          `;
        case 'womanShort':
          return `<path d="M25 30 Q20 20 30 18 Q50 15 70 18 Q80 20 75 30 Q78 35 75 40 L25 40 Q22 35 25 30 Z" fill="${hairColor}"/>`;
        default:
          return `<path d="M25 30 Q20 20 30 18 Q50 15 70 18 Q80 20 75 30 Q78 35 75 40 L25 40 Q22 35 25 30 Z" fill="${hairColor}"/>`;
      }
    } else {
      switch (hairStyle) {
        case 'thick':
          return `<path d="M25 35 Q20 25 30 20 Q50 15 70 20 Q80 25 75 35 Q78 40 75 45 L25 45 Q22 40 25 35 Z" fill="${hairColor}"/>`;
        case 'mohawk':
          return `<path d="M45 15 Q50 10 55 15 L55 40 Q50 45 45 40 Z" fill="${hairColor}"/>`;
        default:
          return `<path d="M25 35 Q20 25 30 20 Q50 15 70 20 Q80 25 75 35 L25 35 Z" fill="${hairColor}"/>`;
      }
    }
  };

  // Face with proper proportions
  const getFace = () => `
    <ellipse cx="50" cy="45" rx="18" ry="20" fill="${faceColor}" stroke="#d4a574" stroke-width="1"/>
  `;

  // Eyes with more detail
  const getEyes = () => {
    switch (eyeStyle) {
      case 'oval':
        return `
          <ellipse cx="42" cy="42" rx="3" ry="4" fill="#fff"/>
          <ellipse cx="58" cy="42" rx="3" ry="4" fill="#fff"/>
          <circle cx="42" cy="42" r="2" fill="#333"/>
          <circle cx="58" cy="42" r="2" fill="#333"/>
          <circle cx="42.5" cy="41.5" r="0.5" fill="#fff"/>
          <circle cx="58.5" cy="41.5" r="0.5" fill="#fff"/>
        `;
      case 'smile':
        return `
          <path d="M39 40 Q42 43 45 40" stroke="#333" stroke-width="2" fill="none"/>
          <path d="M55 40 Q58 43 61 40" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="41" cy="41" r="1" fill="#333"/>
          <circle cx="59" cy="41" r="1" fill="#333"/>
        `;
      default:
        return `
          <ellipse cx="42" cy="42" rx="2.5" ry="3" fill="#fff"/>
          <ellipse cx="58" cy="42" rx="2.5" ry="3" fill="#fff"/>
          <circle cx="42" cy="42" r="1.5" fill="#333"/>
          <circle cx="58" cy="42" r="1.5" fill="#333"/>
          <circle cx="42.5" cy="41.5" r="0.5" fill="#fff"/>
          <circle cx="58.5" cy="41.5" r="0.5" fill="#fff"/>
        `;
    }
  };

  // Nose
  const getNose = () => `<ellipse cx="50" cy="48" rx="1" ry="2" fill="#d4a574"/>`;

  // Mouth with expressions
  const getMouth = () => {
    switch (mouthStyle) {
      case 'laugh':
        return `
          <path d="M45 54 Q50 58 55 54" stroke="#333" stroke-width="2" fill="none"/>
          <path d="M46 55 Q50 57 54 55" stroke="#fff" stroke-width="1" fill="none"/>
        `;
      case 'peace':
        return `<ellipse cx="50" cy="54" rx="2" ry="1" fill="#333"/>`;
      default:
        return `<path d="M47 54 Q50 56 53 54" stroke="#333" stroke-width="2" fill="none"/>`;
    }
  };

  // Shirt/clothing with more detail
  const getShirt = () => {
    switch (shirtStyle) {
      case 'hoody':
        return `
          <rect x="30" y="70" width="40" height="30" fill="${shirtColor}" rx="5"/>
          <path d="M35 70 Q40 65 45 70 L45 75 Q40 80 35 75 Z" fill="${shirtColor}"/>
          <path d="M65 70 Q60 65 55 70 L55 75 Q60 80 65 75 Z" fill="${shirtColor}"/>
          <rect x="47" y="70" width="6" height="8" fill="#fff" rx="1"/>
        `;
      case 'polo':
        return `
          <rect x="35" y="70" width="30" height="30" fill="${shirtColor}"/>
          <rect x="47" y="70" width="6" height="10" fill="#fff"/>
          <circle cx="50" cy="73" r="1" fill="#333"/>
          <circle cx="50" cy="77" r="1" fill="#333"/>
        `;
      default:
        return `
          <rect x="35" y="70" width="30" height="30" fill="${shirtColor}" rx="2"/>
        `;
    }
  };

  const svg = `
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <!-- Background circle -->
      <circle cx="50" cy="50" r="48" fill="${bgColor}" stroke="#fff" stroke-width="2"/>
      
      <!-- Hair (behind face) -->
      ${getHairPath()}
      
      <!-- Face -->
      ${getFace()}
      
      <!-- Eyes -->
      ${getEyes()}
      
      <!-- Nose -->
      ${getNose()}
      
      <!-- Mouth -->
      ${getMouth()}
      
      <!-- Shirt -->
      ${getShirt()}
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Main function to get avatar for member (returns SVG data URL)
export const getAvatarForMember = (member: any): string => {
  if (member.profilePicture && member.profilePicture !== "/placeholder.svg") {
    return member.profilePicture;
  }
  
  const config = genConfig(member);
  return generateDetailedAvatarSVG(config);
};
