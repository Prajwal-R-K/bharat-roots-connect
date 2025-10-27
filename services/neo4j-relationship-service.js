// Backend service for Neo4j relationship queries
// This is a JavaScript version that can be imported by server.js

import neo4j from 'neo4j-driver';

// Neo4j connection details
const neo4jConfig = {
  uri: "neo4j+s://b2cf1c80.databases.neo4j.io",
  username: "neo4j",
  password: "KEe88uaBykmunolXkfvx5DkHI2P_UAFHys1RhsSgD5U",
  database: "neo4j"
};

// Create Neo4j driver instance
const driver = neo4j.driver(
  neo4jConfig.uri,
  neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password),
  {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 10000
  }
);

// Helper function to run Cypher queries
const runQuery = async (cypher, params = {}) => {
  const session = driver.session();
  try {
    console.log(`Executing Neo4j query: ${cypher.substring(0, 50)}...`);
    console.log("With params:", JSON.stringify(params));

    const result = await session.run(cypher, params);

    // Process results correctly
    return result.records.map(record => {
      const obj = {};
      record.keys.forEach((key) => {
        obj[key] = record.get(key);
      });
      return obj;
    });
  } catch (error) {
    console.error("Neo4j Query Error:", error);
    throw error;
  } finally {
    await session.close();
  }
};

/**
 * Get the shortest relationship path between two people in a family tree
 */
export const getRelationshipPath = async (personAId, personBId, familyId) => {
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
export const getPersonDetails = async (userId, familyId) => {
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
