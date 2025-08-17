// src/lib/neo4j/family-tree.ts
import { FamilyTree } from '@/types';
import { runQuery } from './connection';

export const createFamilyTree = async (treeData: Partial<FamilyTree>): Promise<FamilyTree> => {
  const cypher = `
    CREATE (ft:FamilyTree {
      familyTreeId: $familyTreeId,
      createdBy: $createdBy,
      createdAt: $createdAt
    })
    RETURN ft
  `;

  const result = await runQuery(cypher, treeData);
  if (result && result.length > 0) {
    return result[0].ft.properties as FamilyTree;
  }
  throw new Error('Failed to create family tree');
};

export const getFamilyTree = async (familyTreeId: string): Promise<FamilyTree | null> => {
  const cypher = `
    MATCH (ft:FamilyTree {familyTreeId: $familyTreeId})
    RETURN ft
  `;

  const result = await runQuery(cypher, { familyTreeId });
  if (result && result.length > 0) {
    return result[0].ft.properties as FamilyTree;
  }
  return null;
};

export const getFamilyMembers = async (familyTreeId: string) => {
  try {
    console.log(`Fetching family members for tree: ${familyTreeId}`);

    const cypher = `
      MATCH (u:User {familyTreeId: $familyTreeId})
      RETURN DISTINCT u.userId AS userId, u.name AS name, u.email AS email, u.status AS status,
      u.myRelationship AS myRelationship, u.createdBy AS createdBy,
      u.profilePicture AS profilePicture, u.gender AS gender
    `;

    const result = await runQuery(cypher, { familyTreeId });
    console.log(`Found ${result.length} family members`);

    return result.map(record => ({
      userId: record.userId,
      name: record.name,
      email: record.email,
      status: record.status,
      myRelationship: record.myRelationship,
      createdBy: record.createdBy,
      profilePicture: record.profilePicture,
      gender: record.gender || ''
    }));
  } catch (error) {
    console.error("Error fetching family members:", error);
    return [];
  }
};

// Updated to get core relationships only (PARENTS_OF, SIBLING, MARRIED_TO)
export const getFamilyRelationships = async (familyTreeId: string) => {
  try {
    console.log(`Fetching family relationships for tree: ${familyTreeId}`);

    const cypher = `
      MATCH (u1:User {familyTreeId: $familyTreeId})-[r]->(u2:User {familyTreeId: $familyTreeId})
      WHERE type(r) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO']
      RETURN u1.userId AS source, u2.userId AS target, type(r) AS type,
      u1.name AS sourceName, u2.name AS targetName,
      u1.gender AS sourceGender, u2.gender AS targetGender
    `;

    const result = await runQuery(cypher, { familyTreeId });
    console.log(`Found ${result.length} core relationships`);

    return result.map(record => ({
      source: record.source,
      target: record.target,
      type: record.type,
      sourceName: record.sourceName,
      targetName: record.targetName,
      sourceGender: record.sourceGender,
      targetGender: record.targetGender
    }));
  } catch (error) {
    console.error("Error fetching family relationships:", error);
    return [];
  }
};

// Create PARENTS_OF relationship
export const createParentsOf = async (
  familyTreeId: string,
  parentId: string,
  childId: string
) => {
  try {
    const cypher = `
      MATCH (parent:User {familyTreeId: $familyTreeId, userId: $parentId})
      MATCH (child:User {familyTreeId: $familyTreeId, userId: $childId})
      MERGE (parent)-[:PARENTS_OF]->(child)
      RETURN parent.userId as parentId, child.userId as childId
    `;

    const result = await runQuery(cypher, {
      familyTreeId,
      parentId,
      childId,
    });

    return !!result;
  } catch (error) {
    console.error("Error creating PARENTS_OF relationship:", error);
    return false;
  }
};

// Create MARRIED_TO relationship (bidirectional)
export const createMarriedTo = async (
  familyTreeId: string,
  spouse1Id: string,
  spouse2Id: string
) => {
  try {
    const cypher = `
      MATCH (spouse1:User {familyTreeId: $familyTreeId, userId: $spouse1Id})
      MATCH (spouse2:User {familyTreeId: $familyTreeId, userId: $spouse2Id})
      MERGE (spouse1)-[:MARRIED_TO]->(spouse2)
      MERGE (spouse2)-[:MARRIED_TO]->(spouse1)
      RETURN spouse1.userId as spouse1Id, spouse2.userId as spouse2Id
    `;

    const result = await runQuery(cypher, {
      familyTreeId,
      spouse1Id,
      spouse2Id,
    });

    return !!result;
  } catch (error) {
    console.error("Error creating MARRIED_TO relationship:", error);
    return false;
  }
};

// Create SIBLING relationship (bidirectional)
export const createSibling = async (
  familyTreeId: string,
  sibling1Id: string,
  sibling2Id: string
) => {
  try {
    const cypher = `
      MATCH (sibling1:User {familyTreeId: $familyTreeId, userId: $sibling1Id})
      MATCH (sibling2:User {familyTreeId: $familyTreeId, userId: $sibling2Id})
      MERGE (sibling1)-[:SIBLING]->(sibling2)
      MERGE (sibling2)-[:SIBLING]->(sibling1)
      RETURN sibling1.userId as sibling1Id, sibling2.userId as sibling2Id
    `;

    const result = await runQuery(cypher, {
      familyTreeId,
      sibling1Id,
      sibling2Id,
    });

    return !!result;
  } catch (error) {
    console.error("Error creating SIBLING relationship:", error);
    return false;
  }
};

// Helper functions to check existing relationships
export const edgeExists = async (
  familyTreeId: string,
  sourceId: string,
  targetId: string,
  relationshipType: string
): Promise<boolean> => {
  try {
    const cypher = `
      MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceId})
      MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetId})
      MATCH (source)-[r:${relationshipType}]->(target)
      RETURN count(r) > 0 as exists
    `;

    const result = await runQuery(cypher, { familyTreeId, sourceId, targetId });
    return result.length > 0 && result[0].exists;
  } catch (error) {
    console.error("Error checking edge existence:", error);
    return false;
  }
};

// Get parents of a user
export const getParents = async (userId: string, familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (parent:User {familyTreeId: $familyTreeId})-[:PARENTS_OF]->(child:User {familyTreeId: $familyTreeId, userId: $userId})
      RETURN parent.userId as userId, parent.name as name, parent.gender as gender
    `;

    const result = await runQuery(cypher, { userId, familyTreeId });
    return result;
  } catch (error) {
    console.error("Error getting parents:", error);
    return [];
  }
};

// Get children of a user
export const getChildren = async (userId: string, familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (parent:User {familyTreeId: $familyTreeId, userId: $userId})-[:PARENTS_OF]->(child:User {familyTreeId: $familyTreeId})
      RETURN child.userId as userId, child.name as name, child.gender as gender
    `;

    const result = await runQuery(cypher, { userId, familyTreeId });
    return result;
  } catch (error) {
    console.error("Error getting children:", error);
    return [];
  }
};

// Get spouses of a user
export const getSpouses = async (userId: string, familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (user:User {familyTreeId: $familyTreeId, userId: $userId})-[:MARRIED_TO]->(spouse:User {familyTreeId: $familyTreeId})
      RETURN spouse.userId as userId, spouse.name as name, spouse.gender as gender
    `;

    const result = await runQuery(cypher, { userId, familyTreeId });
    return result;
  } catch (error) {
    console.error("Error getting spouses:", error);
    return [];
  }
};

// Get siblings of a user
export const getSiblings = async (userId: string, familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (user:User {familyTreeId: $familyTreeId, userId: $userId})-[:SIBLING]->(sibling:User {familyTreeId: $familyTreeId})
      RETURN sibling.userId as userId, sibling.name as name, sibling.gender as gender
    `;

    const result = await runQuery(cypher, { userId, familyTreeId });
    return result;
  } catch (error) {
    console.error("Error getting siblings:", error);
    return [];
  }
};

// Create family tree user
export const createFamilyTreeUser = async (memberData: any) => {
  try {
    const cypher = `
      CREATE (u:User {
        userId: $userId,
        name: $name,
        email: $email,
        phone: $phone,
        status: $status,
        familyTreeId: $familyTreeId,
        createdBy: $createdBy,
        createdAt: $createdAt,
        myRelationship: $myRelationship,
        gender: $gender,
        dateOfBirth: $dateOfBirth,
        marriageStatus: $marriageStatus,
        marriageDate: $marriageDate
      })
      RETURN u
    `;

    const result = await runQuery(cypher, memberData);
    if (result && result.length > 0) {
      return result[0].u.properties;
    }
    throw new Error('Failed to create user');
  } catch (error) {
    console.error("Error creating family tree user:", error);
    throw error;
  }
};

// Get node ID by user ID (helper function)
export const getNodeIdByUserId = (userId: string, nodes: any[]) => {
  const node = nodes.find(n => n.data?.userId === userId);
  return node ? node.id : null;
};

// Get complete family tree data with derived relationships
export const getTraversableFamilyTreeData = async (
  familyTreeId: string,
  level: number = 5
) => {
  try {
    console.log(`Fetching complete family tree data for tree: ${familyTreeId} with level: ${level}`);

    // Get all users and their core relationships
    const cypher = `
      MATCH (u1:User {familyTreeId: $familyTreeId})-[r]->(u2:User {familyTreeId: $familyTreeId})
      WHERE type(r) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO']
      WITH COLLECT(DISTINCT {
        source: u1.userId, 
        target: u2.userId, 
        type: type(r),
        sourceGender: u1.gender,
        targetGender: u2.gender
      }) AS relationships
      MATCH (u:User {familyTreeId: $familyTreeId})
      RETURN COLLECT(DISTINCT {
        userId: u.userId, 
        name: u.name, 
        status: u.status, 
        profilePicture: u.profilePicture, 
        gender: u.gender, 
        createdBy: u.createdBy
      }) AS nodes, relationships
    `;

    const result = await runQuery(cypher, { familyTreeId });

    if (!result || result.length === 0) {
      return { nodes: [], links: [] };
    }

    const { nodes, relationships } = result[0];

    const uniqueNodes = Array.from(new Map(
      nodes.map((node: any) => [node.userId, node])
    ).values());

    const uniqueLinks = Array.from(new Map(
      relationships.map((link: any) => [`${link.source}-${link.target}`, link])
    ).values());

    console.log(`Fetched ${uniqueNodes.length} nodes and ${uniqueLinks.length} core relationships`);

    return { nodes: uniqueNodes, links: uniqueLinks };
  } catch (error) {
    console.error("Error getting traversable family tree data:", error);
    return { nodes: [], links: [] };
  }
};

// Get user's personal family view with derived relationships
export const getUserPersonalFamilyView = async (userId: string, familyTreeId: string) => {
  try {
    console.log(`Getting personal family view for user ${userId}`);

    // Get direct relationships and derive semantic relationships
    const cypher = `
      MATCH (viewer:User {userId: $userId, familyTreeId: $familyTreeId})
      
      // Get direct core relationships
      OPTIONAL MATCH (viewer)-[r]->(member:User {familyTreeId: $familyTreeId})
      WHERE type(r) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO']
      
      WITH viewer, COLLECT(DISTINCT {
        userId: member.userId,
        name: member.name,
        email: member.email,
        status: member.status,
        profilePicture: member.profilePicture,
        gender: member.gender,
        relationshipType: type(r),
        isDirect: true
      }) as directRels
      
      // Get reverse relationships (where viewer is target)
      OPTIONAL MATCH (member:User {familyTreeId: $familyTreeId})-[r]->(viewer)
      WHERE type(r) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO']
      
      WITH viewer, directRels + COLLECT(DISTINCT {
        userId: member.userId,
        name: member.name,
        email: member.email,
        status: member.status,
        profilePicture: member.profilePicture,
        gender: member.gender,
        relationshipType: type(r),
        isDirect: false
      }) as allRels
      
      UNWIND allRels as relData
      RETURN DISTINCT relData.userId AS userId, relData.name AS name, relData.email AS email,
             relData.status AS status, relData.profilePicture AS profilePicture,
             relData.gender AS gender, relData.relationshipType AS relationshipType,
             relData.isDirect AS isDirect
    `;

    const result = await runQuery(cypher, { userId, familyTreeId });

    // Derive semantic relationships from core relationships
    return result.map((record: any) => {
      const semanticRelationship = deriveSemanticRelationship(
        record.relationshipType,
        record.isDirect,
        record.gender
      );
      
      return {
        userId: record.userId,
        name: record.name,
        email: record.email,
        status: record.status,
        profilePicture: record.profilePicture,
        relationship: semanticRelationship
      };
    });
  } catch (error) {
    console.error(`Error getting personal family view for user ${userId}:`, error);
    return [];
  }
};

// Helper function to derive semantic relationships from core relationships
const deriveSemanticRelationship = (
  relationshipType: string,
  isDirect: boolean,
  memberGender: string
): string => {
  switch (relationshipType) {
    case 'PARENTS_OF':
      if (isDirect) {
        // Viewer is parent of member
        return memberGender === 'male' ? 'son' : 'daughter';
      } else {
        // Member is parent of viewer
        return memberGender === 'male' ? 'father' : 'mother';
      }
    case 'MARRIED_TO':
      return memberGender === 'male' ? 'husband' : 'wife';
    case 'SIBLING':
      return memberGender === 'male' ? 'brother' : 'sister';
    default:
      return 'family member';
  }
};