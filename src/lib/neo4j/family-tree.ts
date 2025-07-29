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
      OPTIONAL MATCH (creator:User)-[r:RELATES_TO]->(u)
      WITH u, creator, collect(r.relationship)[0] AS relationship
      RETURN DISTINCT u.userId AS userId, u.name AS name, u.email AS email, u.status AS status,
      u.myRelationship AS myRelationship, relationship AS relationship, creator.userId AS createdBy,
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
      relationship: record.relationship ? record.relationship.toLowerCase() : null,
      createdBy: record.createdBy,
      profilePicture: record.profilePicture,
      gender: record.gender || ''
    }));
  } catch (error) {
    console.error("Error fetching family members:", error);
    return [];
  }
};

export const getFamilyRelationships = async (familyTreeId: string) => {
  try {
    console.log(`Fetching family relationships for tree: ${familyTreeId}`);

    const cypher = `
      MATCH (u1:User {familyTreeId: $familyTreeId})-[r:RELATES_TO]->(u2:User {familyTreeId: $familyTreeId})
      RETURN u1.userId AS source, u2.userId AS target, r.relationship AS type,
             u1.name AS sourceName, u2.name AS targetName
    `;

    const result = await runQuery(cypher, { familyTreeId });
    console.log(`Found ${result.length} relationships`);

    return result.map(record => ({
      source: record.source,
      target: record.target,
      type: record.type.toLowerCase(),
      sourceName: record.sourceName,
      targetName: record.targetName
    }));
  } catch (error) {
    console.error("Error fetching family relationships:", error);
    return [];
  }
};

export const createReciprocalRelationship = async (
  familyTreeId: string,
  parentId: string,
  childId: string,
  parentGender: string,
  childGender: string
) => {
  try {
    const { parentToChild } = getRelationshipTypes(parentGender, childGender);

    const cypher = `
      MATCH (parent:User {familyTreeId: $familyTreeId, userId: $parentId})
      MATCH (child:User {familyTreeId: $familyTreeId, userId: $childId})
      CREATE (parent)-[:RELATES_TO {relationship: $parentToChild}]->(child)
      RETURN parent.userId as parentId, child.userId as childId
    `;

    const result = await runQuery(cypher, {
      familyTreeId,
      parentId,
      childId,
      parentToChild,
    });

    return !!result;
  } catch (error) {
    console.error("Error creating relationship:", error);
    return false;
  }
};

// Helper to determine relationship direction and types
const getRelationshipTypes = (
  elderGender: string,
  youngerGender: string
): { parentToChild: string; childToParent: string } => {
  let parentToChild = "SON";
  let childToParent = "FATHER";
  if (youngerGender === "female") parentToChild = "DAUGHTER";
  if (elderGender === "female") childToParent = "MOTHER";
  return { parentToChild, childToParent };
};

// Updated function to fetch complete family tree data
export const getTraversableFamilyTreeData = async (
  familyTreeId: string,
  level: number = 5
) => {
  try {
    console.log(`Fetching complete family tree data for tree: ${familyTreeId} with level: ${level}`);

    // First, get all users in the family tree
    const usersCypher = `
      MATCH (u:User {familyTreeId: $familyTreeId})
      RETURN u.userId AS userId, u.name AS name, u.status AS status, 
             u.profilePicture AS profilePicture, u.gender AS gender, 
             u.createdBy AS createdBy, u.myRelationship AS myRelationship
    `;

    const usersResult = await runQuery(usersCypher, { familyTreeId });
    
    // Then get all relationships
    const relationshipsCypher = `
      MATCH (u1:User {familyTreeId: $familyTreeId})-[r:RELATES_TO]->(u2:User {familyTreeId: $familyTreeId})
      RETURN u1.userId AS source, u2.userId AS target, r.relationship AS type
    `;

    const relationshipsResult = await runQuery(relationshipsCypher, { familyTreeId });

    const nodes = usersResult.map(record => ({
      id: record.userId,
      name: record.name,
      status: record.status,
      profilePicture: record.profilePicture,
      gender: record.gender || '',
      createdBy: record.createdBy,
      myRelationship: record.myRelationship
    }));

    const links = relationshipsResult.map(record => ({
      source: record.source,
      target: record.target,
      type: record.type ? record.type.toLowerCase() : 'family'
    }));

    console.log(`Fetched ${nodes.length} nodes and ${links.length} relationships`);

    return { nodes, links };
  } catch (error) {
    console.error("Error getting traversable family tree data:", error);
    return { nodes: [], links: [] };
  }
};

export const getUserPersonalFamilyView = async (userId: string, familyTreeId: string) => {
  try {
    console.log(`Getting personal family view for user ${userId}`);

    const cypher = `
      MATCH (viewer:User {userId: $userId, familyTreeId: $familyTreeId})
      MATCH (member:User {familyTreeId: $familyTreeId})
      OPTIONAL MATCH (viewer)-[rel:RELATES_TO]->(member)
      RETURN member.userId AS userId, member.name AS name, member.email AS email,
             member.status AS status, member.profilePicture AS profilePicture,
             rel.relationship AS relationship
    `;

    const result = await runQuery(cypher, { userId, familyTreeId });

    return result.map(record => ({
      userId: record.userId,
      name: record.name,
      email: record.email,
      status: record.status,
      profilePicture: record.profilePicture,
      relationship: record.relationship || null
    }));
  } catch (error) {
    console.error(`Error getting personal family view for user ${userId}:`, error);
    return [];
  }
};
