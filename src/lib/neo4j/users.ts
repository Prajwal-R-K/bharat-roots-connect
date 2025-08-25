import { User } from '@/types';
import { runQuery } from './connection';
import { generateId, getCurrentDateTime } from '../utils';
import { hashPassword, verifyPassword, generateTempPassword } from './auth';

// User Management Functions
function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export const createUser = async (userData: any) => {
  // If no userId is provided, use a temporary placeholder for invited users
  if (!userData.userId && userData.status === 'invited') {
    userData.userId = `temp_${generateId('U')}`;
    console.log(`Generated temporary userId ${userData.userId} for invited user ${userData.email}`);
  }
  
  // Autogenerate password for invited family members
  const finalPassword = userData.status === 'invited'
    ? generateRandomPassword(8)
    : (userData.password || '');

  // Ensure required optional fields are present
  userData.phone = userData.phone ?? '';
  userData.myRelationship = userData.myRelationship ?? '';

  const cypher = `
    CREATE (u:User {
      userId: $userId,
      name: $name,
      email: $email,
      password: $password,
      status: $status,
      familyTreeId: $familyTreeId,
      createdBy: $createdBy,
      createdAt: $createdAt,
      gender: $gender,
      phone: $phone,
      myRelationship: $myRelationship
    })
    RETURN u
  `;
  
  const result = await runQuery(cypher, {
    ...userData,
    password: finalPassword,
  });
  if (result && result.length > 0) {
    return result[0].u.properties;
  }
  throw new Error('Failed to create or find user');
};

export const getUserByEmailOrId = async (identifier: string): Promise<User | null> => {
  const cypher = `
    MATCH (u:User)
    WHERE u.userId = $identifier OR u.email = $identifier
    RETURN u
  `;
  
  const result = await runQuery(cypher, { identifier });
  if (result && result.length > 0) {
    return result[0].u.properties as User;
  }
  return null;
};

export const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
  // Debug the update operation
  console.log(`Updating user with ID: ${userId} with data:`, userData);

  // Hash password if it's being updated
  let updatedFields = { ...userData };
  if (userData.password) {
    updatedFields.password = await hashPassword(userData.password);
  }

  // Create a separate object for userId update to handle it specially
  let userIdChange = null;
  
  // Handle userId update separately if needed
  if (userData.userId && userData.userId !== userId) {
    userIdChange = userData.userId;
    delete updatedFields.userId; // Remove it from regular updates
  }
  
  // Build dynamic SET clause based on provided fields
  const setParams = Object.entries(updatedFields)
    .filter(([_, value]) => value !== undefined) // Only include defined values
    .map(([key]) => `u.${key} = $${key}`)
    .join(', ');

  if (!setParams.length && !userIdChange) {
    console.error("No valid parameters to update");
    throw new Error('No valid parameters to update');
  }

  // First update all regular fields
  let cypher = `
    MATCH (u:User {userId: $userId})
    SET ${setParams}
    RETURN u
  `;

  if (!setParams.length) {
    // If only changing userId, use a simpler query that just returns the user
    cypher = `
      MATCH (u:User {userId: $userId})
      RETURN u
    `;
  }

  const params = { userId, ...updatedFields };
  console.log("Running update query with params:", JSON.stringify(params));
  const result = await runQuery(cypher, params);

  if (!result || result.length === 0) {
    console.error(`No user found with ID: ${userId}`);
    throw new Error('Failed to update user: User not found');
  }

  // Handle userId change as a separate operation if needed
  if (userIdChange) {
    console.log(`Changing userId from ${userId} to ${userIdChange}`);
    
    const userIdUpdateCypher = `
      MATCH (u:User {userId: $oldUserId})
      SET u.userId = $newUserId
      RETURN u
    `;
    
    const userIdUpdateParams = { 
      oldUserId: userId, 
      newUserId: userIdChange 
    };
    
    console.log("Running userId update query with params:", JSON.stringify(userIdUpdateParams));
    const userIdUpdateResult = await runQuery(userIdUpdateCypher, userIdUpdateParams);
    
    if (!userIdUpdateResult || userIdUpdateResult.length === 0) {
      console.error(`Failed to update userId for user: ${userId}`);
      throw new Error('Failed to update userId');
    }
    
    console.log(`User ID updated from ${userId} to ${userIdChange} successfully`);
    return userIdUpdateResult[0].u.properties as User;
  }

  console.log(`User ${userId} updated successfully`);
  return result[0].u.properties as User;
};

export const checkEmailExists = async (email: string): Promise<boolean> => {
  const cypher = `
    MATCH (u:User {email: $email, status: 'active'})
    RETURN count(u) as count
  `;
  
  const result = await runQuery(cypher, { email });
  return result[0].count > 0;
};

export const getUserByEmailAndFamilyTree = async (email: string, familyTreeId: string): Promise<User | null> => {
  console.log(`Looking for user with email: ${email} in family tree: ${familyTreeId}`);
  
  // Fixed query - removed the status filter to check any user with this email in the family tree
  const cypher = `
    MATCH (u:User {email: $email, familyTreeId: $familyTreeId})
    RETURN u
  `;
  
  const result = await runQuery(cypher, { email, familyTreeId });
  
  if (result && result.length > 0) {
    const user = result[0].u.properties as User;
    console.log(`Found user: ${user.userId} with status: ${user.status}`);
    return user;
  }
  
  console.log(`No user found with email: ${email} in family tree: ${familyTreeId}`);
  return null;
};

export const updateUserProfile = async (userId: string, profileData: any): Promise<void> => {
  console.log('=== updateUserProfile DEBUG ===');
  console.log('Called with userId:', userId);
  console.log('Called with profileData:', JSON.stringify(profileData, null, 2));
  
  try {
    // Hash password if it's being updated
    let hashedPassword = null;
    if (profileData.password && profileData.password.trim() !== '') {
      console.log('Hashing password...');
      hashedPassword = await hashPassword(profileData.password);
    }

    // Build dynamic SET clause based on provided fields
    const fieldsToUpdate: string[] = [];
    const params: any = { userId, updatedAt: new Date().toISOString() };

    // Always include name, email, phone, gender even if empty string
    if (profileData.name !== undefined && profileData.name !== null) {
      fieldsToUpdate.push('u.name = $name');
      params.name = profileData.name.toString();
      console.log('Adding name field:', params.name);
    }
    
    if (profileData.email !== undefined && profileData.email !== null) {
      fieldsToUpdate.push('u.email = $email');
      params.email = profileData.email.toString();
      console.log('Adding email field:', params.email);
    }
    
    // IMPORTANT: Always update phone even if it's empty string
    if (profileData.phone !== undefined && profileData.phone !== null) {
      fieldsToUpdate.push('u.phone = $phone');
      params.phone = profileData.phone.toString();
      console.log('Adding phone field:', params.phone);
    }
    
    if (profileData.gender !== undefined && profileData.gender !== null) {
      fieldsToUpdate.push('u.gender = $gender');
      params.gender = profileData.gender.toString();
      console.log('Adding gender field:', params.gender);
    }
    
    if (hashedPassword) {
      fieldsToUpdate.push('u.password = $password');
      params.password = hashedPassword;
      console.log('Adding password field (hashed)');
    }
    
    // Other optional fields
    if (profileData.address !== undefined) {
      fieldsToUpdate.push('u.address = $address');
      params.address = profileData.address;
      console.log('Adding address field:', params.address);
    }
    if (profileData.dateOfBirth !== undefined) {
      fieldsToUpdate.push('u.dateOfBirth = $dateOfBirth');
      params.dateOfBirth = profileData.dateOfBirth;
      console.log('Adding dateOfBirth field:', params.dateOfBirth);
    }
    if (profileData.married !== undefined) {
      fieldsToUpdate.push('u.married = $married');
      params.married = profileData.married;
      console.log('Adding married field:', params.married);
    }
    if (profileData.bio !== undefined) {
      fieldsToUpdate.push('u.bio = $bio');
      params.bio = profileData.bio;
    }
    if (profileData.occupation !== undefined) {
      fieldsToUpdate.push('u.occupation = $occupation');
      params.occupation = profileData.occupation;
    }
    if (profileData.profilePicture !== undefined) {
      fieldsToUpdate.push('u.profilePicture = $profilePicture');
      params.profilePicture = profileData.profilePicture;
    }

    // Always update the updatedAt timestamp
    fieldsToUpdate.push('u.updatedAt = $updatedAt');

    if (fieldsToUpdate.length === 1) { // Only updatedAt
      throw new Error('No fields to update');
    }

    const cypher = `
      MATCH (u:User {userId: $userId})
      SET ${fieldsToUpdate.join(', ')}
      RETURN u
    `;
    
    console.log('Executing cypher query:', cypher);
    console.log('With parameters:', JSON.stringify(params, null, 2));
    
    const result = await runQuery(cypher, params);
    
    if (!result || result.length === 0) {
      console.error('No user found with userId:', userId);
      throw new Error(`Failed to update user profile: User not found with ID ${userId}`);
    }
    
    const updatedUser = result[0].u.properties;
    console.log('User profile updated successfully. New data:', JSON.stringify(updatedUser, null, 2));
    console.log('Updated phone number:', updatedUser.phone);
    
  } catch (error) {
    console.error('=== updateUserProfile ERROR ===');
    console.error('Error updating user profile:', error);
    throw error;
  }
};
