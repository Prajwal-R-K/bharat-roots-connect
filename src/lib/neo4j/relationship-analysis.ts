import { runQuery } from './connection';

export interface RelationshipPathNode {
  userId: string;
  name: string;
  gender: string;
}

export interface RelationshipPathEdge {
  type: 'PARENTS_OF' | 'SIBLING' | 'MARRIED_TO';
  direction: string; // userId of start node
}

export interface RelationshipPath {
  nodes: RelationshipPathNode[];
  relationships: RelationshipPathEdge[];
}

/**
 * Get the shortest relationship path between two people in a family tree
 */
export const getRelationshipPath = async (
  personAId: string,
  personBId: string,
  familyId: string
): Promise<RelationshipPath | null> => {
  try {
    console.log(`Finding relationship path between ${personAId} and ${personBId} in family ${familyId}`);
    
    const cypher = `
      MATCH (a:User {userId: $personAId, familyTreeId: $familyId})
      MATCH (b:User {userId: $personBId, familyTreeId: $familyId})
      MATCH path = shortestPath((a)-[*]-(b))
      WHERE ALL(r IN relationships(path) WHERE type(r) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO'])
      WITH path, nodes(path) as pathNodes, relationships(path) as pathRels
      RETURN 
        [node IN pathNodes | {
          userId: node.userId,
          name: node.name,
          gender: node.gender
        }] as nodes,
        [rel IN pathRels | {
          type: type(rel),
          direction: startNode(rel).userId
        }] as relationships
      LIMIT 1
    `;
    
    const result = await runQuery(cypher, {
      personAId,
      personBId,
      familyId
    });
    
    if (!result || result.length === 0) {
      console.log('No relationship path found between the two people');
      return null;
    }
    
    const pathData = result[0];
    
    // Validate the path data
    if (!pathData.nodes || !Array.isArray(pathData.nodes) || pathData.nodes.length === 0) {
      console.log('Invalid path data returned from Neo4j');
      return null;
    }
    
    console.log(`Found path with ${pathData.nodes.length} nodes and ${pathData.relationships?.length || 0} relationships`);
    
    return {
      nodes: pathData.nodes,
      relationships: pathData.relationships || []
    };
  } catch (error) {
    console.error('Error getting relationship path from Neo4j:', error);
    throw error;
  }
};

/**
 * Get person details by userId
 */
export const getPersonDetails = async (userId: string, familyId: string) => {
  try {
    const cypher = `
      MATCH (u:User {userId: $userId, familyTreeId: $familyId})
      RETURN u.userId as userId, u.name as name, u.gender as gender, u.email as email
    `;
    
    const result = await runQuery(cypher, { userId, familyId });
    
    if (!result || result.length === 0) {
      return null;
    }
    
    return result[0];
  } catch (error) {
    console.error('Error getting person details:', error);
    throw error;
  }
};
