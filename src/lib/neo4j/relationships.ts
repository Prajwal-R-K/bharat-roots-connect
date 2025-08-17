// src/lib/neo4j/relationships.ts
import { Relationship } from '@/types';
import { runQuery } from './connection';

// Core relationship creation functions
export const createCoreRelationship = async (
  familyTreeId: string,
  sourceUserId: string,
  targetUserId: string,
  relationshipType: 'PARENTS_OF' | 'SIBLING' | 'MARRIED_TO'
): Promise<boolean> => {
  try {
    let cypher: string;
    
    if (relationshipType === 'MARRIED_TO' || relationshipType === 'SIBLING') {
      // Bidirectional relationships
      cypher = `
        MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})
        MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetUserId})
        MERGE (source)-[:${relationshipType}]->(target)
        MERGE (target)-[:${relationshipType}]->(source)
        RETURN source.userId as sourceId, target.userId as targetId
      `;
    } else {
      // Unidirectional relationship (PARENTS_OF)
      cypher = `
        MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})
        MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetUserId})
        MERGE (source)-[:${relationshipType}]->(target)
        RETURN source.userId as sourceId, target.userId as targetId
      `;
    }

    const result = await runQuery(cypher, {
      familyTreeId,
      sourceUserId,
      targetUserId,
    });

    return !!result && result.length > 0;
  } catch (error) {
    console.error(`Error creating ${relationshipType} relationship:`, error);
    return false;
  }
};

// Legacy function for backward compatibility
export const createRelationship = async (relationshipData: Relationship): Promise<Relationship> => {
  const { from, to, type, fromUserId } = relationshipData;
  
  // Map semantic relationships to core relationships
  const coreRelationship = mapSemanticToCore(type);
  if (!coreRelationship) {
    throw new Error(`Unsupported relationship type: ${type}`);
  }

  // Get user IDs from emails
  const getUserCypher = `
    MATCH (fromUser:User {email: $from})
    MATCH (toUser:User {email: $to})
    RETURN fromUser.userId as fromUserId, toUser.userId as toUserId, fromUser.familyTreeId as familyTreeId
  `;
  
  const userResult = await runQuery(getUserCypher, { from, to });
  if (!userResult || userResult.length === 0) {
    throw new Error('Users not found');
  }
  
  const { fromUserId: sourceUserId, toUserId: targetUserId, familyTreeId } = userResult[0];
  
  const success = await createCoreRelationship(
    familyTreeId,
    sourceUserId,
    targetUserId,
    coreRelationship.type
  );
  
  if (success) {
    return {
      from,
      to,
      type: type.toLowerCase(),
      fromUserId
    };
  }
  
  throw new Error('Failed to create relationship');
};

// Map semantic relationships to core relationship types
const mapSemanticToCore = (semanticType: string): { type: 'PARENTS_OF' | 'SIBLING' | 'MARRIED_TO', direction?: 'forward' | 'reverse' } | null => {
  const type = semanticType.toLowerCase();
  
  switch (type) {
    case 'father':
    case 'mother':
      return { type: 'PARENTS_OF', direction: 'forward' };
    case 'son':
    case 'daughter':
      return { type: 'PARENTS_OF', direction: 'reverse' };
    case 'husband':
    case 'wife':
    case 'spouse':
      return { type: 'MARRIED_TO' };
    case 'brother':
    case 'sister':
    case 'sibling':
      return { type: 'SIBLING' };
    default:
      return null;
  }
};

// Updated bidirectional relationship function
export const updateBidirectionalRelationship = async (
  sourceEmail: string, 
  targetEmail: string, 
  sourceRelationship: string,
  targetRelationship: string
): Promise<boolean> => {
  try {
    console.log(`Creating bidirectional relationship between ${sourceEmail} and ${targetEmail}`);
    
    // Get user details
    const getUsersCypher = `
      MATCH (source:User {email: $sourceEmail})
      MATCH (target:User {email: $targetEmail})
      RETURN source.userId as sourceUserId, target.userId as targetUserId,
             source.familyTreeId as familyTreeId, source.gender as sourceGender,
             target.gender as targetGender
    `;
    
    const userResult = await runQuery(getUsersCypher, { sourceEmail, targetEmail });
    if (!userResult || userResult.length === 0) {
      throw new Error('Users not found');
    }
    
    const { sourceUserId, targetUserId, familyTreeId, sourceGender, targetGender } = userResult[0];
    
    // Clear existing relationships
    const clearCypher = `
      MATCH (source:User {userId: $sourceUserId})
      MATCH (target:User {userId: $targetUserId})
      OPTIONAL MATCH (source)-[r1]->(target)
      OPTIONAL MATCH (target)-[r2]->(source)
      WHERE type(r1) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO'] 
        OR type(r2) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO']
      DELETE r1, r2
    `;
    
    await runQuery(clearCypher, { sourceUserId, targetUserId });
    
    // Create new core relationships based on semantic types
    const sourceCoreRel = mapSemanticToCore(sourceRelationship);
    const targetCoreRel = mapSemanticToCore(targetRelationship);
    
    if (sourceCoreRel && targetCoreRel) {
      // Handle parent-child relationships
      if (sourceCoreRel.type === 'PARENTS_OF' && targetCoreRel.type === 'PARENTS_OF') {
        if (sourceCoreRel.direction === 'forward') {
          await createCoreRelationship(familyTreeId, sourceUserId, targetUserId, 'PARENTS_OF');
        } else {
          await createCoreRelationship(familyTreeId, targetUserId, sourceUserId, 'PARENTS_OF');
        }
      }
      // Handle bidirectional relationships
      else if (sourceCoreRel.type === targetCoreRel.type && 
               (sourceCoreRel.type === 'MARRIED_TO' || sourceCoreRel.type === 'SIBLING')) {
        await createCoreRelationship(familyTreeId, sourceUserId, targetUserId, sourceCoreRel.type);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error creating bidirectional relationship:", error);
    return false;
  }
};

// Connect family trees function
export const connectFamilyTrees = async (
  sourceUser: { userId: string, email: string, familyTreeId: string },
  targetUser: { userId: string, email: string, familyTreeId: string },
  sourceToTargetRelationship: string,
  targetToSourceRelationship: string
): Promise<boolean> => {
  try {
    if (sourceUser.familyTreeId === targetUser.familyTreeId) {
      console.log("Users are already in the same family tree, using bidirectional relationship update instead");
      return updateBidirectionalRelationship(
        sourceUser.email,
        targetUser.email,
        sourceToTargetRelationship,
        targetToSourceRelationship
      );
    }
    
    console.log(`Connecting family trees: ${sourceUser.familyTreeId} and ${targetUser.familyTreeId}`);
    
    const cypher = `
      MATCH (source:User {userId: $sourceUserId})
      MATCH (target:User {userId: $targetUserId})
      CREATE (source)-[r1:CONNECTS_TO {
        relationship: $sourceToTargetRelationship,
        sourceFamilyTreeId: $sourceFamilyTreeId,
        targetFamilyTreeId: $targetFamilyTreeId
      }]->(target)
      CREATE (target)-[r2:CONNECTS_TO {
        relationship: $targetToSourceRelationship,
        sourceFamilyTreeId: $targetFamilyTreeId,
        targetFamilyTreeId: $sourceFamilyTreeId
      }]->(source)
      RETURN r1.relationship as sourceRel, r2.relationship as targetRel
    `;
    
    const result = await runQuery(cypher, { 
      sourceUserId: sourceUser.userId,
      targetUserId: targetUser.userId,
      sourceFamilyTreeId: sourceUser.familyTreeId,
      targetFamilyTreeId: targetUser.familyTreeId,
      sourceToTargetRelationship,
      targetToSourceRelationship
    });
    
    console.log("Connected family trees result:", result);
    return result && result.length > 0;
  } catch (error) {
    console.error("Error connecting family trees:", error);
    return false;
  }
};

// Get connected family trees 
export const getConnectedFamilyTrees = async (familyTreeId: string): Promise<any[]> => {
  try {
    console.log(`Getting connected family trees for: ${familyTreeId}`);
    
    const cypher = `
      MATCH (user:User {familyTreeId: $familyTreeId})-[r:CONNECTS_TO]->(member:User)
      WHERE member.familyTreeId <> $familyTreeId
      RETURN 
        user.userId as source,
        user.name as sourceName,
        member.userId as target, 
        member.name as targetName,
        member.familyTreeId as targetFamilyTreeId,
        r.relationship as type
    `;
    
    const result = await runQuery(cypher, { familyTreeId });
    console.log(`Found ${result.length} connected family tree relationships`);
    return result;
  } catch (error) {
    console.error("Error fetching connected family trees:", error);
    return [];
  }
};

// Semantic relationship types for UI
export const getRelationshipTypes = (): string[] => {
  return [
    "father",
    "mother", 
    "son",
    "daughter",
    "husband",
    "wife",
    "brother",
    "sister",
    "grandfather",
    "grandmother",
    "grandson",
    "granddaughter"
  ];
};

// Get hierarchical category for a relationship
export const getRelationshipCategory = (relationship: string): string => {
  const categories = {
    parent: ['father', 'mother', 'grandfather', 'grandmother'],
    child: ['son', 'daughter', 'grandson', 'granddaughter'],
    spouse: ['husband', 'wife'],
    sibling: ['brother', 'sister']
  };
  
  for (const [category, relationships] of Object.entries(categories)) {
    if (relationships.includes(relationship.toLowerCase())) {
      return category;
    }
  }
  return 'other';
};

// Get opposite relationship based on gender
export const getOppositeRelationship = (relationship: string, gender?: string): string => {
  const rel = relationship.toLowerCase();
  
  const opposites: Record<string, Record<string, string>> = {
    'father': { 'male': 'son', 'female': 'daughter' },
    'mother': { 'male': 'son', 'female': 'daughter' },
    'son': { 'male': 'father', 'female': 'mother' },
    'daughter': { 'male': 'father', 'female': 'mother' },
    'husband': { 'female': 'wife' },
    'wife': { 'male': 'husband' },
    'brother': { 'male': 'brother', 'female': 'sister' },
    'sister': { 'male': 'brother', 'female': 'sister' },
    'grandfather': { 'male': 'grandson', 'female': 'granddaughter' },
    'grandmother': { 'male': 'grandson', 'female': 'granddaughter' },
    'grandson': { 'male': 'grandfather', 'female': 'grandmother' },
    'granddaughter': { 'male': 'grandfather', 'female': 'grandmother' }
  };
  
  if (opposites[rel] && gender && opposites[rel][gender]) {
    return opposites[rel][gender];
  }
  
  // Fallback for generic cases
  const category = getRelationshipCategory(rel);
  switch (category) {
    case 'parent':
      return gender === 'female' ? 'daughter' : 'son';
    case 'child':
      return gender === 'female' ? 'mother' : 'father';
    case 'spouse':
      return rel === 'husband' ? 'wife' : 'husband';
    case 'sibling':
      return gender === 'female' ? 'sister' : 'brother';
    default:
      return 'family';
  }
};

// Create reciprocal relationships when a user confirms their relationship
export const createReciprocalRelationship = async (
  user: { email: string, userId: string, gender?: string },
  inviterEmail: string,
  userRelationship: string
): Promise<boolean> => {
  try {
    // Get inviter details
    const getInviterCypher = `
      MATCH (inviter:User {email: $inviterEmail})
      RETURN inviter.gender as gender
    `;
    
    const inviterResult = await runQuery(getInviterCypher, { inviterEmail });
    const inviterGender = inviterResult[0]?.gender;
    
    // Get the appropriate relationship type from inviter to user
    const inviterRelationship = getOppositeRelationship(userRelationship, inviterGender);
    
    // Create bidirectional relationship
    await updateBidirectionalRelationship(
      user.email,
      inviterEmail,
      userRelationship.toLowerCase(),
      inviterRelationship.toLowerCase()
    );
    
    console.log(`Reciprocal relationship created: ${user.email} is ${userRelationship} of ${inviterEmail}, and ${inviterEmail} is ${inviterRelationship} of ${user.email}`);
    return true;
  } catch (error) {
    console.error("Error creating reciprocal relationship:", error);
    return false;
  }
};

// Get user's personalized view of the family tree with derived relationships
export const getUserPersonalizedFamilyTree = async (userId: string, familyTreeId: string): Promise<any[]> => {
  console.log(`Getting personalized family tree for user ${userId} in tree ${familyTreeId}`);
  
  try {
    const cypher = `
      MATCH (user:User {userId: $userId, familyTreeId: $familyTreeId})
      
      // Get all users in the family tree and their relationships to/from the current user
      MATCH (member:User {familyTreeId: $familyTreeId})
      WHERE member.userId <> $userId
      
      // Check for direct core relationships from user to member
      OPTIONAL MATCH (user)-[r1]->(member)
      WHERE type(r1) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO']
      
      // Check for direct core relationships from member to user
      OPTIONAL MATCH (member)-[r2]->(user)
      WHERE type(r2) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO']
      
      WITH user, member, r1, r2
      WHERE r1 IS NOT NULL OR r2 IS NOT NULL
      
      RETURN 
        user.userId as source,
        user.name as sourceName,
        member.userId as target, 
        member.name as targetName,
        CASE 
          WHEN r1 IS NOT NULL THEN type(r1)
          WHEN r2 IS NOT NULL THEN type(r2)
          ELSE null
        END as coreRelType,
        CASE 
          WHEN r1 IS NOT NULL THEN true
          ELSE false
        END as isOutgoing,
        member.gender as targetGender,
        user.gender as sourceGender
    `;
    
    const result = await runQuery(cypher, { userId, familyTreeId });
    
    // Convert core relationships to semantic relationships for display
    const semanticRelationships = result.map((record: any) => {
      let semanticType = '';
      
      if (record.coreRelType === 'PARENTS_OF') {
        if (record.isOutgoing) {
          // User is parent of target
          semanticType = record.targetGender === 'male' ? 'son' : 'daughter';
        } else {
          // Target is parent of user (reverse relationship for display)
          semanticType = record.targetGender === 'male' ? 'father' : 'mother';
        }
      } else if (record.coreRelType === 'MARRIED_TO') {
        semanticType = record.targetGender === 'male' ? 'husband' : 'wife';
      } else if (record.coreRelType === 'SIBLING') {
        semanticType = record.targetGender === 'male' ? 'brother' : 'sister';
      }
      
      return {
        source: record.source,
        sourceName: record.sourceName,
        target: record.target,
        targetName: record.targetName,
        type: semanticType
      };
    });
    
    console.log(`Found ${semanticRelationships.length} personal relationships for user ${userId}`);
    return semanticRelationships;
  } catch (error) {
    console.error("Error getting personalized family tree:", error);
    return [];
  }
};

// Get family tree relationships with semantic conversion
export const getUserRelationships = async (email: string, familyTreeId: string): Promise<Relationship[]> => {
  console.log(`Getting relationships for user ${email} in family tree ${familyTreeId}`);
  
  try {
    const cypher = `
      MATCH (u:User {email: $email, familyTreeId: $familyTreeId})
      
      // Get outgoing core relationships
      OPTIONAL MATCH (u)-[r1]->(target:User {familyTreeId: $familyTreeId})
      WHERE type(r1) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO']
      
      // Get incoming core relationships 
      OPTIONAL MATCH (source:User {familyTreeId: $familyTreeId})-[r2]->(u)
      WHERE type(r2) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO']
      
      // Return both directions
      RETURN 
        u.email as userEmail,
        COLLECT(DISTINCT {
          targetEmail: target.email,
          coreType: type(r1),
          targetGender: target.gender,
          direction: 'outgoing'
        }) + COLLECT(DISTINCT {
          targetEmail: source.email,
          coreType: type(r2),
          targetGender: source.gender,
          direction: 'incoming'
        }) as relationships,
        u.userId as fromUserId
    `;
    
    const result = await runQuery(cypher, { email, familyTreeId });
    
    if (!result || result.length === 0) {
      return [];
    }
    
    const relationships: Relationship[] = [];
    const userRelationships = result[0].relationships.filter((rel: any) => rel.targetEmail);
    
    userRelationships.forEach((rel: any) => {
      let semanticType = '';
      
      if (rel.coreType === 'PARENTS_OF') {
        if (rel.direction === 'outgoing') {
          semanticType = rel.targetGender === 'male' ? 'son' : 'daughter';
        } else {
          semanticType = rel.targetGender === 'male' ? 'father' : 'mother';
        }
      } else if (rel.coreType === 'MARRIED_TO') {
        semanticType = rel.targetGender === 'male' ? 'husband' : 'wife';
      } else if (rel.coreType === 'SIBLING') {
        semanticType = rel.targetGender === 'male' ? 'brother' : 'sister';
      }
      
      if (semanticType) {
        relationships.push({
          from: email,
          to: rel.targetEmail,
          type: semanticType,
          fromUserId: result[0].fromUserId
        });
      }
    });
    
    console.log(`Found ${relationships.length} semantic relationships for user ${email}`);
    return relationships;
  } catch (error) {
    console.error("Error getting user relationships:", error);
    return [];
  }
};

// Derive extended relationships from core relationships
export const deriveExtendedRelationships = async (familyTreeId: string) => {
  try {
    console.log(`Deriving extended relationships for tree: ${familyTreeId}`);
    
    // This function can be used to derive grandparent/grandchild relationships
    // and other extended family relationships from the core PARENTS_OF relationships
    
    const cypher = `
      MATCH (gp:User {familyTreeId: $familyTreeId})-[:PARENTS_OF]->(p:User {familyTreeId: $familyTreeId})-[:PARENTS_OF]->(gc:User {familyTreeId: $familyTreeId})
      RETURN gp.userId as grandparent, gp.name as grandparentName, gp.gender as gpGender,
             gc.userId as grandchild, gc.name as grandchildName, gc.gender as gcGender
    `;
    
    const result = await runQuery(cypher, { familyTreeId });
    
    const extendedRelationships = result.map((record: any) => ({
      source: record.grandparent,
      target: record.grandchild,
      type: record.gcGender === 'male' ? 'grandson' : 'granddaughter',
      sourceName: record.grandparentName,
      targetName: record.grandchildName,
      sourceGender: record.gpGender,
      targetGender: record.gcGender,
      isExtended: true
    }));
    
    console.log(`Derived ${extendedRelationships.length} extended relationships`);
    return extendedRelationships;
  } catch (error) {
    console.error("Error deriving extended relationships:", error);
    return [];
  }
};