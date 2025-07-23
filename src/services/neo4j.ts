import neo4j, { Driver, Session } from 'neo4j-driver';

class Neo4jService {
  private driver: Driver;

  constructor() {
    this.driver = neo4j.driver(
      'neo4j+s://26968e7c.databases.neo4j.io',
      neo4j.auth.basic('neo4j', 'Ua95yPmaGZAeAeFyQ48iZ67rNQi07gR3eCMtoFvaOIA')
    );
  }

  private async getSession(): Promise<Session> {
    return this.driver.session({ database: 'neo4j' });
  }

  async createUser(userData: {
    userId: string;
    name: string;
    email: string;
    gender: 'male' | 'female';
    dob?: string;
    isCurrentUser: boolean;
  }) {
    const session = await this.getSession();
    try {
      const result = await session.run(
        `CREATE (u:Person {
          userId: $userId,
          name: $name,
          email: $email,
          gender: $gender,
          dob: $dob,
          isCurrentUser: $isCurrentUser,
          relation: 'Self',
          createdAt: datetime()
        }) RETURN u`,
        userData
      );
      return result.records[0]?.get('u').properties;
    } finally {
      await session.close();
    }
  }

  async addFamilyMember(memberData: {
    userId: string;
    name: string;
    relation: string;
    gender: 'male' | 'female';
    dob?: string;
    email?: string;
    parentId?: string;
    currentUserId: string;
  }) {
    const session = await this.getSession();
    try {
      // Create the new member
      await session.run(
        `CREATE (m:Person {
          userId: $userId,
          name: $name,
          relation: $relation,
          gender: $gender,
          dob: $dob,
          email: $email,
          isCurrentUser: false,
          createdAt: datetime()
        })`,
        memberData
      );

      // Create relationship based on relation type
      if (memberData.relation.toLowerCase() === 'father' || memberData.relation.toLowerCase() === 'mother') {
        await session.run(
          `MATCH (parent:Person {userId: $memberId})
           MATCH (child:Person {userId: $currentUserId})
           CREATE (parent)-[:PARENT_OF]->(child)`,
          { memberId: memberData.userId, currentUserId: memberData.currentUserId }
        );
      } else if (memberData.relation.toLowerCase() === 'son' || memberData.relation.toLowerCase() === 'daughter') {
        await session.run(
          `MATCH (parent:Person {userId: $currentUserId})
           MATCH (child:Person {userId: $memberId})
           CREATE (parent)-[:PARENT_OF]->(child)`,
          { memberId: memberData.userId, currentUserId: memberData.currentUserId }
        );
      } else if (memberData.relation.toLowerCase() === 'spouse') {
        await session.run(
          `MATCH (p1:Person {userId: $currentUserId})
           MATCH (p2:Person {userId: $memberId})
           CREATE (p1)-[:MARRIED_TO]->(p2)
           CREATE (p2)-[:MARRIED_TO]->(p1)`,
          { memberId: memberData.userId, currentUserId: memberData.currentUserId }
        );
      }

      return { success: true };
    } finally {
      await session.close();
    }
  }

  async getFamilyTree(userId: string) {
    const session = await this.getSession();
    try {
      const result = await session.run(
        `MATCH (start:Person {userId: $userId})
         OPTIONAL MATCH (start)-[r*1..3]-(connected:Person)
         WITH start, collect(DISTINCT connected) + start as allNodes
         UNWIND allNodes as person
         OPTIONAL MATCH (person)-[rel]-(other:Person)
         WHERE other IN allNodes
         RETURN person, collect(DISTINCT {type: type(rel), other: other}) as relationships`,
        { userId }
      );

      const nodes = result.records.map(record => {
        const person = record.get('person').properties;
        const relationships = record.get('relationships');
        return {
          ...person,
          relationships: relationships.filter((rel: any) => rel.other)
        };
      });

      return nodes;
    } finally {
      await session.close();
    }
  }

  async deleteFamilyMember(userId: string) {
    const session = await this.getSession();
    try {
      await session.run(
        `MATCH (p:Person {userId: $userId})
         WHERE NOT p.isCurrentUser = true
         DETACH DELETE p`,
        { userId }
      );
      return { success: true };
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }
}

export const neo4jService = new Neo4jService();