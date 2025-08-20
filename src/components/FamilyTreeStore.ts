// src/components/FamilyTreeStore.ts
import { createUser, getUserByEmailOrId, createFamilyTree } from '@/lib/neo4j';
import { generateId, getCurrentDateTime } from '@/lib/utils';
import { runQuery } from '@/lib/neo4j/connection';
import { Node, Edge } from '@xyflow/react';

// Enhanced relationship creation functions with better error handling and validation
export const createParentsOf = async (familyTreeId: string, sourceUserId: string, targetUserId: string) => {
  try {
    // Check if relationship already exists
    const exists = await edgeExists(familyTreeId, sourceUserId, targetUserId, 'PARENTS_OF');
    if (exists) {
      console.log('PARENTS_OF relationship already exists');
      return true;
    }

    const cypher = `
      MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})
      MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetUserId})
      CREATE (source)-[r:PARENTS_OF {
        createdAt: datetime(),
        familyTreeId: $familyTreeId
      }]->(target)
      RETURN source.userId as sourceId, target.userId as targetId, r.createdAt as createdAt
    `;
    
    const result = await runQuery(cypher, { familyTreeId, sourceUserId, targetUserId });
    
    if (result && result.length > 0) {
      console.log(`Created PARENTS_OF relationship: ${sourceUserId} -> ${targetUserId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error creating PARENTS_OF relationship:', error);
    return false;
  }
};

export const createMarriedTo = async (familyTreeId: string, sourceUserId: string, targetUserId: string) => {
  try {
    // Check if relationship already exists in either direction
    const existsForward = await edgeExists(familyTreeId, sourceUserId, targetUserId, 'MARRIED_TO');
    const existsReverse = await edgeExists(familyTreeId, targetUserId, sourceUserId, 'MARRIED_TO');
    
    if (existsForward || existsReverse) {
      console.log('MARRIED_TO relationship already exists');
      return true;
    }

    // Create bidirectional marriage relationship
    const cypher = `
      MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})
      MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetUserId})
      CREATE (source)-[r1:MARRIED_TO {
        createdAt: datetime(),
        familyTreeId: $familyTreeId,
        marriageType: 'primary'
      }]->(target)
      CREATE (target)-[r2:MARRIED_TO {
        createdAt: datetime(),
        familyTreeId: $familyTreeId,
        marriageType: 'primary'
      }]->(source)
      RETURN source.userId as sourceId, target.userId as targetId
    `;
    
    const result = await runQuery(cypher, { familyTreeId, sourceUserId, targetUserId });
    
    if (result && result.length > 0) {
      console.log(`Created bidirectional MARRIED_TO relationship: ${sourceUserId} <-> ${targetUserId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error creating MARRIED_TO relationship:', error);
    return false;
  }
};

export const createSibling = async (familyTreeId: string, sourceUserId: string, targetUserId: string) => {
  try {
    // Check if relationship already exists in either direction
    const existsForward = await edgeExists(familyTreeId, sourceUserId, targetUserId, 'SIBLING');
    const existsReverse = await edgeExists(familyTreeId, targetUserId, sourceUserId, 'SIBLING');
    
    if (existsForward || existsReverse) {
      console.log('SIBLING relationship already exists');
      return true;
    }

    // Create bidirectional sibling relationship
    const cypher = `
      MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})
      MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetUserId})
      CREATE (source)-[r1:SIBLING {
        createdAt: datetime(),
        familyTreeId: $familyTreeId
      }]->(target)
      CREATE (target)-[r2:SIBLING {
        createdAt: datetime(),
        familyTreeId: $familyTreeId
      }]->(source)
      RETURN source.userId as sourceId, target.userId as targetId
    `;
    
    const result = await runQuery(cypher, { familyTreeId, sourceUserId, targetUserId });
    
    if (result && result.length > 0) {
      console.log(`Created bidirectional SIBLING relationship: ${sourceUserId} <-> ${targetUserId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error creating SIBLING relationship:', error);
    return false;
  }
};

// Enhanced edge existence check with better query optimization
export const edgeExists = async (familyTreeId: string, sourceUserId: string, targetUserId: string, relType: string) => {
  try {
    const cypher = `
      MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})
      MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetUserId})
      OPTIONAL MATCH (source)-[r:${relType}]->(target)
      RETURN r IS NOT NULL as exists
    `;
    
    const result = await runQuery(cypher, { familyTreeId, sourceUserId, targetUserId });
    return result.length > 0 && result[0].exists;
  } catch (error) {
    console.error(`Error checking if ${relType} edge exists:`, error);
    return false;
  }
};

// Enhanced query functions with better data retrieval and caching
export const getParents = async (userId: string, familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (p:User)-[:PARENTS_OF]->(u:User {userId: $userId, familyTreeId: $familyTreeId})
      RETURN p.userId as userId, 
             p.name as name, 
             p.gender as gender,
             p.dateOfBirth as dateOfBirth,
             p.email as email,
             p.phone as phone,
             p.status as status
      ORDER BY p.gender DESC, p.name ASC
    `;
    
    const result = await runQuery(cypher, { userId, familyTreeId });
    return result.map((r: any) => ({
      userId: r.userId,
      name: r.name,
      gender: r.gender,
      dateOfBirth: r.dateOfBirth,
      email: r.email,
      phone: r.phone,
      status: r.status
    }));
  } catch (error) {
    console.error('Error fetching parents:', error);
    return [];
  }
};

export const getSpouses = async (userId: string, familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (u:User {userId: $userId, familyTreeId: $familyTreeId})-[:MARRIED_TO]->(s:User)
      RETURN DISTINCT s.userId as userId, 
             s.name as name, 
             s.gender as gender,
             s.marriageStatus as marriageStatus,
             s.marriageDate as marriageDate,
             s.email as email,
             s.phone as phone,
             s.status as status,
             s.dateOfBirth as dateOfBirth
      ORDER BY s.marriageDate DESC, s.name ASC
    `;
    
    const result = await runQuery(cypher, { userId, familyTreeId });
    return result.map((r: any) => ({
      userId: r.userId,
      name: r.name,
      gender: r.gender,
      marriageStatus: r.marriageStatus,
      marriageDate: r.marriageDate,
      email: r.email,
      phone: r.phone,
      status: r.status,
      dateOfBirth: r.dateOfBirth
    }));
  } catch (error) {
    console.error('Error fetching spouses:', error);
    return [];
  }
};

export const getChildren = async (userId: string, familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (u:User {userId: $userId, familyTreeId: $familyTreeId})-[:PARENTS_OF]->(c:User)
      RETURN c.userId as userId, 
             c.name as name,
             c.gender as gender,
             c.dateOfBirth as dateOfBirth,
             c.email as email,
             c.phone as phone,
             c.status as status,
             c.myRelationship as relationship
      ORDER BY c.dateOfBirth ASC, c.name ASC
    `;
    
    const result = await runQuery(cypher, { userId, familyTreeId });
    return result.map((r: any) => ({
      userId: r.userId,
      name: r.name,
      gender: r.gender,
      dateOfBirth: r.dateOfBirth,
      email: r.email,
      phone: r.phone,
      status: r.status,
      relationship: r.relationship
    }));
  } catch (error) {
    console.error('Error fetching children:', error);
    return [];
  }
};

export const getSiblings = async (userId: string, familyTreeId: string) => {
  try {
    // Get siblings through both direct SIBLING relationships and shared parents
    const cypher = `
      MATCH (u:User {userId: $userId, familyTreeId: $familyTreeId})-[:SIBLING]->(s:User)
      RETURN DISTINCT s.userId as userId, 
             s.name as name,
             s.gender as gender,
             s.dateOfBirth as dateOfBirth,
             s.email as email,
             s.phone as phone,
             s.status as status,
             s.myRelationship as relationship,
             'direct' as relationshipType
      
      UNION
      
      MATCH (p:User)-[:PARENTS_OF]->(u:User {userId: $userId, familyTreeId: $familyTreeId})
      MATCH (p)-[:PARENTS_OF]->(s:User)
      WHERE s.userId <> $userId
      RETURN DISTINCT s.userId as userId, 
             s.name as name,
             s.gender as gender,
             s.dateOfBirth as dateOfBirth,
             s.email as email,
             s.phone as phone,
             s.status as status,
             s.myRelationship as relationship,
             'shared_parent' as relationshipType
      
      ORDER BY relationshipType, dateOfBirth ASC, name ASC
    `;
    
    const result = await runQuery(cypher, { userId, familyTreeId });
    return result.map((r: any) => ({
      userId: r.userId,
      name: r.name,
      gender: r.gender,
      dateOfBirth: r.dateOfBirth,
      email: r.email,
      phone: r.phone,
      status: r.status,
      relationship: r.relationship,
      relationshipType: r.relationshipType
    }));
  } catch (error) {
    console.error('Error fetching siblings:', error);
    return [];
  }
};

// Enhanced extended family query functions
export const getGrandparents = async (userId: string, familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (gp:User)-[:PARENTS_OF]->(p:User)-[:PARENTS_OF]->(u:User {userId: $userId, familyTreeId: $familyTreeId})
      RETURN DISTINCT gp.userId as userId,
             gp.name as name,
             gp.gender as gender,
             gp.dateOfBirth as dateOfBirth,
             gp.email as email,
             gp.status as status,
             CASE gp.gender 
               WHEN 'male' THEN 'grandfather'
               WHEN 'female' THEN 'grandmother'
               ELSE 'grandparent'
             END as relationship
      ORDER BY gp.dateOfBirth ASC, gp.name ASC
    `;
    
    const result = await runQuery(cypher, { userId, familyTreeId });
    return result.map((r: any) => ({
      userId: r.userId,
      name: r.name,
      gender: r.gender,
      dateOfBirth: r.dateOfBirth,
      email: r.email,
      status: r.status,
      relationship: r.relationship
    }));
  } catch (error) {
    console.error('Error fetching grandparents:', error);
    return [];
  }
};

export const getGrandchildren = async (userId: string, familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (u:User {userId: $userId, familyTreeId: $familyTreeId})-[:PARENTS_OF]->(c:User)-[:PARENTS_OF]->(gc:User)
      RETURN DISTINCT gc.userId as userId,
             gc.name as name,
             gc.gender as gender,
             gc.dateOfBirth as dateOfBirth,
             gc.email as email,
             gc.status as status,
             CASE gc.gender 
               WHEN 'male' THEN 'grandson'
               WHEN 'female' THEN 'granddaughter'
               ELSE 'grandchild'
             END as relationship
      ORDER BY gc.dateOfBirth ASC, gc.name ASC
    `;
    
    const result = await runQuery(cypher, { userId, familyTreeId });
    return result.map((r: any) => ({
      userId: r.userId,
      name: r.name,
      gender: r.gender,
      dateOfBirth: r.dateOfBirth,
      email: r.email,
      status: r.status,
      relationship: r.relationship
    }));
  } catch (error) {
    console.error('Error fetching grandchildren:', error);
    return [];
  }
};

// Enhanced user creation and validation functions
export const createFamilyTreeUser = async (memberData: any) => {
  try {
    // Validate required fields
    if (!memberData.name || !memberData.userId || !memberData.familyTreeId) {
      throw new Error('Missing required fields: name, userId, or familyTreeId');
    }

    // Check if user already exists
    const existingUser = await getUserByEmailOrId(memberData.email || memberData.userId);
    if (existingUser) {
      console.log('User already exists, updating with new family tree association');
      return existingUser;
    }

    const user = await createUser({
      ...memberData,
      createdAt: memberData.createdAt || getCurrentDateTime(),
      status: memberData.status || 'invited'
    });

    console.log(`Created family tree user: ${user.name} (${user.userId})`);
    return user;
  } catch (error) {
    console.error('Error creating family tree user:', error);
    throw error;
  }
};

export const checkEmailExists = async (email: string, nodes: Node[]): Promise<boolean> => {
  if (!email || email.trim() === '') return false;

  // Check in current tree nodes first (faster)
  const existsInTree = nodes.some(node => 
    node.data.email && (node.data.email as string).toLowerCase() === email.toLowerCase()
  );
  
  if (existsInTree) {
    return true;
  }

  // Check in database
  try {
    const existingUser = await getUserByEmailOrId(email);
    return existingUser !== null;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return false;
  }
};

// Enhanced family tree initialization with better error handling
export const initializeFamilyTree = async (registrationData: any) => {
  try {
    if (!registrationData.name || !registrationData.email) {
      throw new Error('Name and email are required for family tree initialization');
    }

    const ftId = generateId('FT');
    
    // Create family tree
    const familyTree = await createFamilyTree({
      familyTreeId: ftId,
      createdBy: 'self',
      createdAt: getCurrentDateTime()
    });

    // Create root user
    const rootUserData = {
      userId: generateId('U'),
      name: registrationData.name,
      email: registrationData.email,
      password: registrationData.password,
      status: 'active',
      familyTreeId: ftId,
      createdBy: 'self',
      createdAt: getCurrentDateTime(),
      gender: registrationData.gender || 'other',
      dateOfBirth: registrationData.dateOfBirth,
      phone: registrationData.phone,
      isRoot: true
    };

    const rootUser = await createUser(rootUserData);

    // Store in localStorage for session management
    localStorage.setItem("userId", rootUser.userId);
    localStorage.setItem("familyTreeId", ftId);
    localStorage.setItem("userData", JSON.stringify(rootUser));

    console.log(`Initialized family tree: ${ftId} with root user: ${rootUser.userId}`);
    
    return { 
      familyTreeId: ftId, 
      rootUser,
      familyTree
    };
  } catch (error) {
    console.error('Error initializing family tree:', error);
    throw error;
  }
};

// Enhanced relationship validation with comprehensive checks
// Enhanced relationship validation with comprehensive checks
export const validateRelationshipAddition = async (
  selectedNode: any, 
  category: string, 
  familyTreeId: string, 
  newMember: any
): Promise<{ valid: boolean; message?: string; requiresConfirmation?: boolean; warnings?: string[] }> => {
  if (!familyTreeId) {
    return { valid: false, message: "Family tree not initialized." };
  }

  const selectedUserId = selectedNode.data.userId;
  const warnings: string[] = [];

  try {
    if (category === 'parent') {
      const parents = await getParents(selectedUserId, familyTreeId);
      
      if (parents.length >= 2) {
        return { 
          valid: false, 
          message: "A person can have maximum 2 parents. Consider adding step-parents or adoptive parents through a different relationship type." 
        };
      }
      
      // Check for same-gender parents and warn about potential biological inconsistency
      if (parents.length === 1) {
        const existingParent = parents[0];
        if (existingParent.gender === newMember.gender && existingParent.gender !== 'other') {
          warnings.push(`Adding same-gender parents. This might represent adoptive, step, or non-traditional family structure.`);
        }
      }
    }

    if (category === 'spouse') {
      const spouses = await getSpouses(selectedUserId, familyTreeId);
      
      // Check for existing marriages
      const marriedSpouses = spouses.filter(s => s.marriageStatus === 'married');
      if (marriedSpouses.length > 0 && newMember.marriageStatus === 'married') {
        return {
          valid: false,
          message: `${selectedNode.data.name} is already married to ${marriedSpouses[0].name}. Please either:\n\n1. Change the existing marriage status to divorced/separated first\n2. Set this new spouse's status to divorced/separated\n3. Cancel this action`
        };
      }
      
      // Check for potential age inconsistencies
      if (selectedNode.data.dateOfBirth && newMember.dateOfBirth) {
        const ageDiff = Math.abs(
          new Date(selectedNode.data.dateOfBirth).getTime() - 
          new Date(newMember.dateOfBirth).getTime()
        ) / (1000 * 60 * 60 * 24 * 365.25);
        
        if (ageDiff > 20) {
          warnings.push(`Significant age difference (${Math.round(ageDiff)} years) detected.`);
        }
      }
      
      // Check for multiple divorces/separations
      const nonMarriedSpouses = spouses.filter(s => s.marriageStatus !== 'married');
      if (nonMarriedSpouses.length >= 2) {
        warnings.push(`${selectedNode.data.name} has multiple previous relationships.`);
      }
    }

    if (category === 'child') {
      const children = await getChildren(selectedUserId, familyTreeId);
      
      // Warn about large families
      if (children.length >= 8) {
        warnings.push(`Large family detected (${children.length} existing children).`);
      }
      
      // Check for age consistency
      if (selectedNode.data.dateOfBirth && newMember.dateOfBirth) {
        const parentAge = new Date().getFullYear() - new Date(selectedNode.data.dateOfBirth).getFullYear();
        const childAge = new Date().getFullYear() - new Date(newMember.dateOfBirth).getFullYear();
        
        if (parentAge - childAge < 16) {
          warnings.push(`Parent-child age gap seems small (${parentAge - childAge} years).`);
        }
        
        if (parentAge - childAge > 60) {
          warnings.push(`Parent-child age gap is quite large (${parentAge - childAge} years).`);
        }
      }
    }

    if (category === 'sibling') {
      const siblings = await getSiblings(selectedUserId, familyTreeId);
      
      // Check for large sibling groups
      if (siblings.length >= 10) {
        warnings.push(`Large sibling group detected (${siblings.length} existing siblings).`);
      }
      
      // Check if parents exist for proper family structure
      const parents = await getParents(selectedUserId, familyTreeId);
      if (parents.length === 0) {
        warnings.push(`No parents found. Adding parents first would create a more organized family structure.`);
      }
    }

    return { 
      valid: true, 
      warnings: warnings.length > 0 ? warnings : undefined 
    };

  } catch (error) {
    console.error('Error validating relationship:', error);
    return { 
      valid: false, 
      message: "Error validating relationship. Please try again." 
    };
  }
};

// Enhanced utility functions with better error handling
export const getNodeIdByUserId = (userId: string, nodes: Node[]): string | null => {
  const node = nodes.find(n => n.data.userId === userId);
  return node?.id || null;
};

export const getUserByNodeId = (nodeId: string, nodes: Node[]): any | null => {
  const node = nodes.find(n => n.id === nodeId);
  return node?.data || null;
};

// Enhanced family tree querying functions
export const getFamilyTreeMembers = async (familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (u:User {familyTreeId: $familyTreeId})
      RETURN u.userId as userId,
             u.name as name,
             u.email as email,
             u.phone as phone,
             u.gender as gender,
             u.dateOfBirth as dateOfBirth,
             u.status as status,
             u.myRelationship as relationship,
             u.marriageStatus as marriageStatus,
             u.marriageDate as marriageDate,
             u.createdAt as createdAt,
             u.isRoot as isRoot
      ORDER BY u.createdAt ASC
    `;
    
    const result = await runQuery(cypher, { familyTreeId });
    return result.map((r: any) => ({
      userId: r.userId,
      name: r.name,
      email: r.email,
      phone: r.phone,
      gender: r.gender,
      dateOfBirth: r.dateOfBirth,
      status: r.status,
      relationship: r.relationship,
      marriageStatus: r.marriageStatus,
      marriageDate: r.marriageDate,
      createdAt: r.createdAt,
      isRoot: r.isRoot
    }));
  } catch (error) {
    console.error('Error fetching family tree members:', error);
    return [];
  }
};

export const getFamilyTreeRelationships = async (familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (u1:User {familyTreeId: $familyTreeId})-[r]->(u2:User {familyTreeId: $familyTreeId})
      RETURN u1.userId as sourceUserId,
             u2.userId as targetUserId,
             type(r) as relationshipType,
             r.createdAt as createdAt,
             r.familyTreeId as familyTreeId
      ORDER BY r.createdAt ASC
    `;
    
    const result = await runQuery(cypher, { familyTreeId });
    return result.map((r: any) => ({
      sourceUserId: r.sourceUserId,
      targetUserId: r.targetUserId,
      relationshipType: r.relationshipType,
      createdAt: r.createdAt,
      familyTreeId: r.familyTreeId
    }));
  } catch (error) {
    console.error('Error fetching family tree relationships:', error);
    return [];
  }
};

// Function to delete relationships with proper cleanup
export const deleteRelationship = async (
  familyTreeId: string, 
  sourceUserId: string, 
  targetUserId: string, 
  relationshipType: string
) => {
  try {
    let cypher = '';
    
    if (relationshipType === 'MARRIED_TO' || relationshipType === 'SIBLING') {
      // Delete bidirectional relationships
      cypher = `
        MATCH (u1:User {familyTreeId: $familyTreeId, userId: $sourceUserId})-[r1:${relationshipType}]->(u2:User {userId: $targetUserId})
        MATCH (u2)-[r2:${relationshipType}]->(u1)
        DELETE r1, r2
        RETURN count(r1) + count(r2) as deletedCount
      `;
    } else {
      // Delete unidirectional relationship
      cypher = `
        MATCH (u1:User {familyTreeId: $familyTreeId, userId: $sourceUserId})-[r:${relationshipType}]->(u2:User {userId: $targetUserId})
        DELETE r
        RETURN count(r) as deletedCount
      `;
    }
    
    const result = await runQuery(cypher, { familyTreeId, sourceUserId, targetUserId });
    
    if (result && result.length > 0 && result[0].deletedCount > 0) {
      console.log(`Deleted ${relationshipType} relationship: ${sourceUserId} -> ${targetUserId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error deleting ${relationshipType} relationship:`, error);
    return false;
  }
};

// Function to update user information
export const updateFamilyTreeUser = async (userId: string, familyTreeId: string, updateData: any) => {
  try {
    const allowedFields = [
      'name', 'email', 'phone', 'gender', 'dateOfBirth', 
      'marriageStatus', 'marriageDate', 'status'
    ];
    
    const validUpdates = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});
    
    if (Object.keys(validUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    const setClause = Object.keys(validUpdates)
      .map(key => `u.${key} = ${key}`)
      .join(', ');
    
    const cypher = `
      MATCH (u:User {userId: $userId, familyTreeId: $familyTreeId})
      SET ${setClause}, u.updatedAt = datetime()
      RETURN u.userId as userId, u.name as name, u.email as email
    `;
    
    const params = { userId, familyTreeId, ...validUpdates };
    const result = await runQuery(cypher, params);
    
    if (result && result.length > 0) {
      console.log(`Updated user: ${result[0].name} (${result[0].userId})`);
      return result[0];
    }
    
    throw new Error('User not found or update failed');
  } catch (error) {
    console.error('Error updating family tree user:', error);
    throw error;
  }
};

// Function to get family tree statistics
export const getFamilyTreeStats = async (familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (u:User {familyTreeId: $familyTreeId})
      OPTIONAL MATCH (u)-[r]->()
      RETURN 
        count(DISTINCT u) as totalMembers,
        count(DISTINCT CASE WHEN u.status = 'invited' THEN u END) as pendingInvitations,
        count(DISTINCT CASE WHEN u.status = 'active' THEN u END) as activeMembers,
        count(DISTINCT CASE WHEN u.gender = 'male' THEN u END) as maleMembers,
        count(DISTINCT CASE WHEN u.gender = 'female' THEN u END) as femaleMembers,
        count(DISTINCT CASE WHEN type(r) = 'MARRIED_TO' THEN r END) / 2 as totalMarriages,
        count(DISTINCT CASE WHEN type(r) = 'PARENTS_OF' THEN r END) as parentChildRelationships,
        count(DISTINCT CASE WHEN type(r) = 'SIBLING' THEN r END) / 2 as siblingRelationships
    `;
    
    const result = await runQuery(cypher, { familyTreeId });
    
    if (result && result.length > 0) {
      return {
        totalMembers: result[0].totalMembers || 0,
        pendingInvitations: result[0].pendingInvitations || 0,
        activeMembers: result[0].activeMembers || 0,
        maleMembers: result[0].maleMembers || 0,
        femaleMembers: result[0].femaleMembers || 0,
        totalMarriages: result[0].totalMarriages || 0,
        parentChildRelationships: result[0].parentChildRelationships || 0,
        siblingRelationships: result[0].siblingRelationships || 0
      };
    }
    
    return {
      totalMembers: 0,
      pendingInvitations: 0,
      activeMembers: 0,
      maleMembers: 0,
      femaleMembers: 0,
      totalMarriages: 0,
      parentChildRelationships: 0,
      siblingRelationships: 0
    };
  } catch (error) {
    console.error('Error fetching family tree stats:', error);
    return null;
  }
};

// Function to search family tree members
export const searchFamilyMembers = async (familyTreeId: string, searchTerm: string) => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }
    
    const cypher = `
      MATCH (u:User {familyTreeId: $familyTreeId})
      WHERE u.name CONTAINS $searchTerm 
         OR u.email CONTAINS $searchTerm
         OR u.phone CONTAINS $searchTerm
      RETURN u.userId as userId,
             u.name as name,
             u.email as email,
             u.phone as phone,
             u.relationship as relationship,
             u.status as status
      ORDER BY u.name ASC
      LIMIT 20
    `;
    
    const result = await runQuery(cypher, { 
      familyTreeId, 
      searchTerm: searchTerm.trim().toLowerCase() 
    });
    
    return result.map((r: any) => ({
      userId: r.userId,
      name: r.name,
      email: r.email,
      phone: r.phone,
      relationship: r.relationship,
      status: r.status
    }));
  } catch (error) {
    console.error('Error searching family members:', error);
    return [];
  }
};

// Function to get relationship path between two users
export const getRelationshipPath = async (
  familyTreeId: string, 
  fromUserId: string, 
  toUserId: string
) => {
  try {
    const cypher = `
      MATCH path = shortestPath((from:User {familyTreeId: $familyTreeId, userId: $fromUserId})-[*..6]-(to:User {userId: $toUserId}))
      RETURN nodes(path) as users, relationships(path) as relationships, length(path) as distance
      ORDER BY distance ASC
      LIMIT 5
    `;
    
    const result = await runQuery(cypher, { familyTreeId, fromUserId, toUserId });
    
    return result.map((r: any) => ({
      users: r.users.map((u: any) => ({
        userId: u.properties.userId,
        name: u.properties.name
      })),
      relationships: r.relationships.map((rel: any) => ({
        type: rel.type,
        properties: rel.properties
      })),
      distance: r.distance
    }));
  } catch (error) {
    console.error('Error getting relationship path:', error);
    return [];
  }
};

// Enhanced cleanup function for removing users and their relationships
export const removeFamilyTreeUser = async (userId: string, familyTreeId: string) => {
  try {
    // First, get all relationships this user has
    const relationshipsCypher = `
      MATCH (u:User {userId: $userId, familyTreeId: $familyTreeId})-[r]-(other:User)
      RETURN type(r) as relType, other.userId as otherUserId, other.name as otherName
    `;
    
    const relationships = await runQuery(relationshipsCypher, { userId, familyTreeId });
    
    // Delete all relationships first
    const deleteRelationshipsCypher = `
      MATCH (u:User {userId: $userId, familyTreeId: $familyTreeId})-[r]-()
      DELETE r
      RETURN count(r) as deletedRelationships
    `;
    
    const relResult = await runQuery(deleteRelationshipsCypher, { userId, familyTreeId });
    
    // Then delete the user node
    const deleteUserCypher = `
      MATCH (u:User {userId: $userId, familyTreeId: $familyTreeId})
      DELETE u
      RETURN count(u) as deletedUsers
    `;
    
    const userResult = await runQuery(deleteUserCypher, { userId, familyTreeId });
    
    const deletedRelationships = relResult[0]?.deletedRelationships || 0;
    const deletedUsers = userResult[0]?.deletedUsers || 0;
    
    if (deletedUsers > 0) {
      console.log(`Successfully removed user ${userId} and ${deletedRelationships} relationships`);
      return {
        success: true,
        deletedUsers,
        deletedRelationships,
        affectedRelationships: relationships
      };
    }
    
    return { success: false, message: 'User not found' };
  } catch (error) {
    console.error('Error removing family tree user:', error);
    return { success: false, error: error.message };
  }
};