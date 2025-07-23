// Client-side family tree service using localStorage for demo purposes
// In production, this would connect to a backend API that interfaces with Neo4j

interface FamilyMember {
  userId: string;
  name: string;
  email: string;
  gender: 'male' | 'female';
  dob?: string;
  isCurrentUser: boolean;
  relation: string;
  createdAt: string;
}

interface Relationship {
  from: string;
  to: string;
  type: 'PARENT_OF' | 'MARRIED_TO' | 'SIBLING_OF';
}

class FamilyTreeService {
  private getStorageKey(userId: string) {
    return `familyTree_${userId}`;
  }

  private getRelationshipsKey(userId: string) {
    return `relationships_${userId}`;
  }

  async createUser(userData: {
    userId: string;
    name: string;
    email: string;
    gender: 'male' | 'female';
    dob?: string;
    isCurrentUser: boolean;
  }) {
    try {
      const member: FamilyMember = {
        ...userData,
        relation: 'Self',
        createdAt: new Date().toISOString(),
      };

      // Store user data
      localStorage.setItem('currentUser', JSON.stringify(member));
      localStorage.setItem(this.getStorageKey(userData.userId), JSON.stringify([member]));
      localStorage.setItem(this.getRelationshipsKey(userData.userId), JSON.stringify([]));

      return member;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async addFamilyMember(memberData: {
    userId: string;
    name: string;
    relation: string;
    gender: 'male' | 'female';
    dob?: string;
    email?: string;
    currentUserId: string;
  }) {
    try {
      const member: FamilyMember = {
        userId: memberData.userId,
        name: memberData.name,
        email: memberData.email || '',
        gender: memberData.gender,
        dob: memberData.dob,
        isCurrentUser: false,
        relation: memberData.relation,
        createdAt: new Date().toISOString(),
      };

      // Get existing family data
      const existingData = localStorage.getItem(this.getStorageKey(memberData.currentUserId));
      const family = existingData ? JSON.parse(existingData) : [];
      
      // Add new member
      family.push(member);
      localStorage.setItem(this.getStorageKey(memberData.currentUserId), JSON.stringify(family));

      // Create relationships
      const relationshipsData = localStorage.getItem(this.getRelationshipsKey(memberData.currentUserId));
      const relationships: Relationship[] = relationshipsData ? JSON.parse(relationshipsData) : [];

      // Add relationship based on relation type
      if (memberData.relation.toLowerCase() === 'father' || memberData.relation.toLowerCase() === 'mother') {
        relationships.push({
          from: memberData.userId,
          to: memberData.currentUserId,
          type: 'PARENT_OF'
        });
      } else if (memberData.relation.toLowerCase() === 'son' || memberData.relation.toLowerCase() === 'daughter') {
        relationships.push({
          from: memberData.currentUserId,
          to: memberData.userId,
          type: 'PARENT_OF'
        });
      } else if (memberData.relation.toLowerCase() === 'spouse') {
        relationships.push({
          from: memberData.currentUserId,
          to: memberData.userId,
          type: 'MARRIED_TO'
        });
        relationships.push({
          from: memberData.userId,
          to: memberData.currentUserId,
          type: 'MARRIED_TO'
        });
      }

      localStorage.setItem(this.getRelationshipsKey(memberData.currentUserId), JSON.stringify(relationships));

      return { success: true };
    } catch (error) {
      console.error('Error adding family member:', error);
      throw error;
    }
  }

  async getFamilyTree(userId: string) {
    try {
      const familyData = localStorage.getItem(this.getStorageKey(userId));
      const relationshipsData = localStorage.getItem(this.getRelationshipsKey(userId));
      
      const family = familyData ? JSON.parse(familyData) : [];
      const relationships = relationshipsData ? JSON.parse(relationshipsData) : [];

      // Add relationship information to members
      return family.map((member: FamilyMember) => ({
        ...member,
        relationships: relationships.filter((rel: Relationship) => 
          rel.from === member.userId || rel.to === member.userId
        )
      }));
    } catch (error) {
      console.error('Error getting family tree:', error);
      return [];
    }
  }

  async deleteFamilyMember(userId: string, currentUserId: string) {
    try {
      const familyData = localStorage.getItem(this.getStorageKey(currentUserId));
      const family = familyData ? JSON.parse(familyData) : [];
      
      // Filter out the member to delete (don't allow deleting current user)
      const updatedFamily = family.filter((member: FamilyMember) => 
        member.userId !== userId || member.isCurrentUser
      );
      
      localStorage.setItem(this.getStorageKey(currentUserId), JSON.stringify(updatedFamily));

      // Remove relationships involving this member
      const relationshipsData = localStorage.getItem(this.getRelationshipsKey(currentUserId));
      const relationships = relationshipsData ? JSON.parse(relationshipsData) : [];
      
      const updatedRelationships = relationships.filter((rel: Relationship) =>
        rel.from !== userId && rel.to !== userId
      );
      
      localStorage.setItem(this.getRelationshipsKey(currentUserId), JSON.stringify(updatedRelationships));

      return { success: true };
    } catch (error) {
      console.error('Error deleting family member:', error);
      throw error;
    }
  }

  getCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
  }
}

export const familyTreeService = new FamilyTreeService();