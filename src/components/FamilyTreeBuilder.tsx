import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, User, Save, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { createUser, getUserByEmailOrId, createFamilyTree } from '@/lib/neo4j';
import { generateId, getCurrentDateTime } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { runQuery } from '@/lib/neo4j/connection';

// Helper functions to create specific relationships
const createParentsOf = async (familyTreeId: string, sourceUserId: string, targetUserId: string) => {
  try {
    const cypher = `
      MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})
      MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetUserId})
      CREATE (source)-[:PARENTS_OF]->(target)
      RETURN source.userId as sourceId, target.userId as targetId
    `;
    const result = await runQuery(cypher, { familyTreeId, sourceUserId, targetUserId });
    return !!result;
  } catch (error) {
    console.error('Error creating PARENTS_OF:', error);
    return false;
  }
};

const createMarriedTo = async (familyTreeId: string, sourceUserId: string, targetUserId: string) => {
  try {
    const exists = await edgeExists(familyTreeId, sourceUserId, targetUserId, 'MARRIED_TO');
    if (exists) {
      return true; // Already exists, no need to create
    }
    const cypher = `
      MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})
      MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetUserId})
      CREATE (source)-[:MARRIED_TO]->(target)
      RETURN source.userId as sourceId, target.userId as targetId
    `;
    const result = await runQuery(cypher, { familyTreeId, sourceUserId, targetUserId });
    return !!result;
  } catch (error) {
    console.error('Error creating MARRIED_TO:', error);
    return false;
  }
};

const createSibling = async (familyTreeId: string, sourceUserId: string, targetUserId: string) => {
  try {
    const cypher = `
      MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})
      MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetUserId})
      CREATE (source)-[:SIBLING]->(target)
    `;
    await runQuery(cypher, { familyTreeId, sourceUserId, targetUserId });
    return true;
  } catch (error) {
    console.error('Error creating SIBLING:', error);
    return false;
  }
};
const edgeExists = async (familyTreeId: string, sourceUserId: string, targetUserId: string, relType: string) => {
  try {
    const cypher = `
      MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})-[:${relType}]->(target:User {userId: $targetUserId})
      RETURN source
    `;
    const result = await runQuery(cypher, { familyTreeId, sourceUserId, targetUserId });
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking if ${relType} edge exists:`, error);
    return false;
  }
};

interface FamilyMemberNode extends Node {
  data: {
    label: string;
    name: string;
    email: string;
    phone?: string;
    relationship?: string;
    generation: number;
    isRoot?: boolean;
    onAddRelation?: (nodeId: string) => void;
    gender?: string;
    dateOfBirth?: string;
    marriageDate?: string;
    marriageStatus?: string;
    userId?: string;
  };
  parentId?: string;
}

// Custom node component for individual family members
const FamilyNode = ({ data, id }: { data: any; id: string }) => {
  return (
    <div className="relative bg-white border-2 border-blue-200 rounded-xl p-3 min-w-[180px] max-w-[180px] shadow-lg hover:shadow-xl transition-shadow">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />

      <div className="flex flex-col items-center space-y-2">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>

        <div className="text-center">
          <div className="font-semibold text-slate-800 text-xs">{data.name}</div>
          <div className="text-xs text-slate-600 truncate max-w-[140px]">{data.email}</div>
          {data.relationship && !data.isRoot && (
            <div className="text-xs font-medium text-blue-600 mt-1 capitalize bg-blue-50 px-2 py-1 rounded">
              {data.relationship}
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-6 h-6 rounded-full p-0 hover:bg-blue-50 border-blue-300"
          onClick={() => {
            console.log('Plus button clicked for node:', id);
            data.onAddRelation && data.onAddRelation(id);
          }}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

// Custom group node for couples
const CoupleGroup = ({ data, id }: { data: any; id: string }) => {
  return (
    <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-4 shadow-lg min-w-[440px] min-h-[180px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
      <div className="flex justify-center items-center h-full">
        <div className="text-sm text-blue-600 font-medium">Married Couple</div>
      </div>
    </div>
  );
};

const nodeTypes = {
  familyMember: FamilyNode,
  coupleGroup: CoupleGroup,
};

interface FamilyTreeBuilderProps {
  onComplete: (familyData: any) => void;
  onBack: () => void;
  registrationData: any;
}

const relationshipCategories = {
  parent: ['father', 'mother'],
  child: ['son', 'daughter'],
  spouse: ['husband', 'wife'],
  sibling: ['brother', 'sister']
};

const FamilyTreeBuilder: React.FC<FamilyTreeBuilderProps> = ({ onComplete, onBack, registrationData }) => {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRelationshipChoice, setShowRelationshipChoice] = useState(false);
  const [selectedRelationshipCategory, setSelectedRelationshipCategory] = useState<string>('');
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: '',
    gender: '',
    dateOfBirth: '',
    marriageDate: '',
    marriageStatus: 'married'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [familyTreeId, setFamilyTreeId] = useState<string | null>(null);
  const [rootUser, setRootUser] = useState<any>(null);

  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const handleAddRelation = useCallback((nodeId: string) => {
    console.log('handleAddRelation called with nodeId:', nodeId);
    const node = nodesRef.current.find(n => n.id === nodeId);
    console.log('Found node:', node);
    if (!node) {
      console.log('Node not found!');
      return;
    }
    
    setSelectedNodeId(nodeId);
    setSelectedNode(node);
    setShowRelationshipChoice(true);
    setNewMember({ 
      name: '', 
      email: '', 
      phone: '', 
      relationship: '', 
      gender: '',
      dateOfBirth: '',
      marriageDate: '',
      marriageStatus: 'married'
    });
  }, []);

  // Initialize family tree, root user, and root node
  useEffect(() => {
    const initialize = async () => {
      if (registrationData && !familyTreeId && nodes.length === 0) {
        const ftId = generateId('FT');
        await createFamilyTree({
          familyTreeId: ftId,
          createdBy: 'self',
          createdAt: getCurrentDateTime(),
        });
        setFamilyTreeId(ftId);

        const ru = await createUser({
          userId: generateId('U'),
          name: registrationData.name || 'You',
          email: registrationData.email || '',
          password: registrationData.password,
          status: 'active',
          familyTreeId: ftId,
          createdBy: 'self',
          createdAt: getCurrentDateTime(),
          gender: registrationData.gender || 'other',
        });
        setRootUser(ru);
        localStorage.setItem("userId", ru.userId);
        localStorage.setItem("userData", JSON.stringify(ru));

        const rootNode: FamilyMemberNode = {
          id: 'root',
          type: 'familyMember',
          position: { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100 },
          data: {
            label: ru.name,
            name: ru.name,
            email: ru.email,
            generation: 0,
            isRoot: true,
            onAddRelation: handleAddRelation,
            gender: ru.gender,
            userId: ru.userId,
          }
        };
        setNodes([rootNode]);
      }
    };
    initialize();
  }, [registrationData, handleAddRelation, setNodes, familyTreeId, nodes.length]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleRelationshipCategorySelect = async (category: string) => {
    if (category === 'sibling') {
      const parents = await getParents(selectedNode.data.userId);
      if (parents.length === 0) {
        const addParent = window.confirm("Please add parents first to connect siblings properly. Would you like to add a parent now?");
        if (addParent) {
          setSelectedRelationshipCategory('parent');
          setShowRelationshipChoice(false);
          setShowAddDialog(true);
          return;
        }
        const direct = window.confirm("No parents exist. The sibling will be connected directly to you with a SIBLING relationship. OK?");
        if (!direct) {
          setShowRelationshipChoice(false);
          return;
        }
      }
    }
    setSelectedRelationshipCategory(category);
    setShowRelationshipChoice(false);
    setShowAddDialog(true);
  };

  // Helper query functions with updated relationship types
  const getParents = async (userId: string) => {
    const cypher = `
      MATCH (p:User)-[:PARENTS_OF]->(u:User {userId: $userId, familyTreeId: $familyTreeId})
      RETURN p.userId as userId, p.name as name
    `;
    const result = await runQuery(cypher, { userId, familyTreeId });
    return result.map((r: any) => ({ userId: r.userId, name: r.name }));
  };

  const getSpouses = async (userId: string) => {
    const cypher = `
      MATCH (u:User {userId: $userId, familyTreeId: $familyTreeId})-[:MARRIED_TO]->(s:User)
      RETURN s.userId as userId, s.name as name, s.marriageStatus as marriageStatus
      UNION
      MATCH (s:User)-[:MARRIED_TO]->(u:User {userId: $userId, familyTreeId: $familyTreeId})
      RETURN s.userId as userId, s.name as name, s.marriageStatus as marriageStatus
    `;
    const result = await runQuery(cypher, { userId, familyTreeId });
    return result.map((r: any) => ({ userId: r.userId, name: r.name, marriageStatus: r.marriageStatus }));
  };

  const getChildren = async (userId: string) => {
    const cypher = `
      MATCH (u:User {userId: $userId, familyTreeId: $familyTreeId})-[:PARENTS_OF]->(c:User)
      RETURN c.userId as userId, c.name as name
    `;
    const result = await runQuery(cypher, { userId, familyTreeId });
    return result.map((r: any) => ({ userId: r.userId, name: r.name }));
  };

  const getSiblings = async (userId: string) => {
    const cypher = `
      MATCH (s:User)-[:SIBLING]->(u:User {userId: $userId, familyTreeId: $familyTreeId})
      RETURN s.userId as userId, s.name as name
    `;
    const result = await runQuery(cypher, { userId, familyTreeId });
    return result.map((r: any) => ({ userId: r.userId, name: r.name }));
  };

  // Validation using Neo4j queries
  const validateRelationshipAddition = async (selectedNode: any, category: string): Promise<{ valid: boolean; message?: string; requiresConfirmation?: boolean }> => {
    if (!familyTreeId) return { valid: false, message: "Family tree not initialized." };
    const selectedUserId = selectedNode.data.userId;

    if (category === 'parent') {
      const parents = await getParents(selectedUserId);
      if (parents.length >= 2) {
        return { 
          valid: false, 
          message: "A person can have max 2 parents. You can add a step-parent instead." 
        };
      }
    }

    if (category === 'spouse') {
      const spouses = await getSpouses(selectedUserId);
      const marriedSpouses = spouses.filter(s => s.marriageStatus === 'married');
      if (marriedSpouses.length > 0 && newMember.marriageStatus === 'married') {
        return {
          valid: true,
          requiresConfirmation: true,
          message: `${selectedNode.data.name} is already married to ${marriedSpouses[0].name}. Do you want to end the current marriage and add a new spouse?`
        };
      }
    }

    return { valid: true };
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    const existsInTree = nodes.some(node => node.data.email === email);
    if (existsInTree) {
      return true;
    }
    try {
      const existingUser = await getUserByEmailOrId(email);
      return existingUser !== null;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  const getGeneration = (relationship: string, parentGeneration: number): number => {
    if (relationshipCategories.parent.includes(relationship)) {
      return parentGeneration - 1;
    } else if (relationshipCategories.child.includes(relationship)) {
      return parentGeneration + 1;
    } else if (relationshipCategories.sibling.includes(relationship) || relationshipCategories.spouse.includes(relationship)) {
      return parentGeneration;
    }
    return parentGeneration;
  };

  const calculateNodePosition = (
    parentNode: Node,
    relationship: string,
    existingNodes: Node[],
    category: string
  ): { x: number; y: number } => {
    const parentPos = parentNode.position;
    const parentGeneration = typeof parentNode.data?.generation === 'number' ? parentNode.data.generation : 0;
    const generation = getGeneration(relationship, parentGeneration);

    const generationSpacing = 200;
    const siblingSpacing = 250;

    const baseY = parentPos.y + (generation - parentGeneration) * generationSpacing;

    if (category === 'spouse') {
      const spouseOffset = relationship === 'husband' ? -200 : 200;
      return {
        x: parentPos.x + spouseOffset,
        y: parentPos.y
      };
    }

    if (category === 'parent') {
      const parentsAtLevel = existingNodes.filter(node => {
        const nodeGeneration = typeof node.data?.generation === 'number' ? node.data.generation : 0;
        return nodeGeneration === generation && relationshipCategories.parent.includes((node.data.relationship as string) || '');
      });
      const parentIndex = parentsAtLevel.length;
      return {
        x: parentPos.x + (parentIndex === 0 ? -100 : 100),
        y: baseY
      };
    }

    if (category === 'child') {
      const childrenAtLevel = existingNodes.filter(node => {
        const nodeGeneration = typeof node.data?.generation === 'number' ? node.data.generation : 0;
        return nodeGeneration === generation && relationshipCategories.child.includes((node.data.relationship as string) || '');
      });
      const childIndex = childrenAtLevel.length;
      return {
        x: parentPos.x + (childIndex * siblingSpacing) - (childIndex > 0 ? siblingSpacing / 2 : 0),
        y: baseY
      };
    }

    if (category === 'sibling') {
      const siblingsAtLevel = existingNodes.filter(node => {
        const nodeGeneration = typeof node.data?.generation === 'number' ? node.data.generation : 0;
        return nodeGeneration === parentGeneration && 
               relationshipCategories.sibling.includes((node.data.relationship as string) || '') &&
               node.id !== parentNode.id;
      });
      const siblingIndex = siblingsAtLevel.length;
      return {
        x: parentPos.x + ((siblingIndex + 1) * siblingSpacing),
        y: parentPos.y
      };
    }

    return {
      x: parentPos.x + 200,
      y: baseY
    };
  };

  const getEffectiveSource = (nodeId: string, nodes: Node[]): string => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.parentId || nodeId;
  };

  const getNodeIdByUserId = (userId: string, nodes: Node[]): string | null => {
    const node = nodes.find(n => n.data.userId === userId);
    return node?.id || null;
  };

  const addFamilyMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.relationship || !newMember.gender || !selectedNodeId || !familyTreeId || !rootUser) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields (name, email, relationship, gender).",
        variant: "destructive",
      });
      return;
    }

    const validation = await validateRelationshipAddition(selectedNode, selectedRelationshipCategory);
    if (!validation.valid) {
      toast({
        title: "Cannot add relationship",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    let spouseConfirmation = false;
    let endMarriageConfirmation = false;

    if (validation.requiresConfirmation) {
      const confirmed = window.confirm(validation.message + "\n\nClick OK to continue or Cancel to abort.");
      if (!confirmed) {
        return;
      }
      if (selectedRelationshipCategory === 'parent') {
        spouseConfirmation = true;
      } else if (selectedRelationshipCategory === 'spouse') {
        endMarriageConfirmation = true;
      }
    }

    const emailExists = await checkEmailExists(newMember.email);
    if (emailExists) {
      toast({
        title: "Email already exists",
        description: "This email is already in use. Please use a different email.",
        variant: "destructive",
      });
      return;
    }

    const selectedNodeData = nodes.find(n => n.id === selectedNodeId);
    if (!selectedNodeData) {
      toast({
        title: "Error",
        description: "Selected node not found.",
        variant: "destructive",
      });
      return;
    }

    const selectedUserId = selectedNodeData.data.userId;

    // Create new user in Neo4j
    const memberData: any = {
      userId: generateId('U'),
      name: newMember.name,
      email: newMember.email,
      phone: newMember.phone,
      status: 'invited' as const,
      familyTreeId,
      createdBy: rootUser.userId,
      createdAt: getCurrentDateTime(),
      myRelationship: newMember.relationship,
      gender: newMember.gender || 'other',
      dateOfBirth: newMember.dateOfBirth,
    };

    if (selectedRelationshipCategory === 'spouse') {
      memberData.marriageStatus = newMember.marriageStatus;
      memberData.marriageDate = newMember.marriageDate;
    }

    const createdMember = await createUser(memberData);
    const newUserId = createdMember.userId;

    const newNodeId = `node-${Date.now()}`;
    const selectedGeneration = typeof selectedNodeData.data?.generation === 'number' ? selectedNodeData.data.generation : 0;
    const generation = getGeneration(newMember.relationship, selectedGeneration);

    let position = calculateNodePosition(selectedNodeData, newMember.relationship, nodes, selectedRelationshipCategory);
    let newNode: FamilyMemberNode = {
      id: newNodeId,
      type: 'familyMember',
      position,
      data: {
        label: newMember.name,
        name: newMember.name,
        email: newMember.email,
        phone: newMember.phone,
        relationship: newMember.relationship,
        generation,
        onAddRelation: handleAddRelation,
        gender: newMember.gender,
        dateOfBirth: newMember.dateOfBirth,
        marriageDate: newMember.marriageDate,
        marriageStatus: newMember.marriageStatus,
        userId: newUserId,
      }
    };

    let additionalUiEdges: Edge[] = [];

    // Handle relationship creation and visualization
    if (selectedRelationshipCategory === 'parent') {
  const existingParents = await getParents(selectedUserId);
  if (existingParents.length === 1) {
    // Create MARRIED_TO between existing parent and new parent
    const existingParentId = existingParents[0].userId;
    const existsMarriedTo = await edgeExists(familyTreeId, existingParentId, newUserId, 'MARRIED_TO');
    if (!existsMarriedTo) {
      await createMarriedTo(familyTreeId, existingParentId, newUserId);
    }

    // Create couple group for existing parent and new parent
    const existingParentNode = nodes.find(n => n.data.userId === existingParentId);
    if (existingParentNode) {
      const selectedPos = existingParentNode.position;
      const spousePos = position;
      const minX = Math.min(selectedPos.x, spousePos.x);
      const minY = Math.min(selectedPos.y, spousePos.y);
      const maxX = minX + 200;
      const maxY = minY + 120;
      const groupPosition = { x: minX - 20, y: minY - 10 };
      const groupWidth = 440;
      const groupHeight = 180;

      const groupId = `group-${Date.now()}`;
      const groupNode: Node = {
        id: groupId,
        type: 'coupleGroup',
        position: groupPosition,
        style: { width: groupWidth, height: groupHeight, position: 'relative', overflow: 'hidden' },
        data: {},
      };

      // Update existing parent with parentId and relative position
      const existingParentRelativePos = { x: 40, y: 40 };
      const updatedNodes = nodes.map(n => n.data.userId === existingParentId ? { ...n, parentId: groupId, position: existingParentRelativePos } : n);

      // Set new node parentId and relative position, ensuring it fits within group
      const newRelativePos = { x: 220, y: 40 };
      newNode.parentId = groupId;
      newNode.position = newRelativePos;

      // Add group node
      updatedNodes.push(groupNode);

      setNodes(updatedNodes);

      // Update existing children edges to point from group
      const children = await getChildren(existingParentId);
      for (const child of children) {
        const existsParentOf = await edgeExists(familyTreeId, newUserId, child.userId, 'PARENTS_OF');
        if (!existsParentOf) {
          await createParentsOf(familyTreeId, newUserId, child.userId);
        }
        const childNodeId = getNodeIdByUserId(child.userId, nodes);
        if (childNodeId) {
          const childEdge: Edge = {
            id: `edge-${groupId}-${childNodeId}`,
            source: groupId,
            target: childNodeId,
            type: 'smoothstep',
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed' as any, color: '#3b82f6' }
          };
          additionalUiEdges.push(childEdge);
        }
      }

      // Remove old child edges from existing parent
      setEdges((eds) => eds.filter(e => e.source !== existingParentNode.id));
    }
  }
  // Create PARENTS_OF from new parent to current node only if it doesn't exist
  const existsParentOf = await edgeExists(familyTreeId, newUserId, selectedUserId, 'PARENTS_OF');
  if (!existsParentOf) {
    await createParentsOf(familyTreeId, newUserId, selectedUserId);
  }
      // UI edge from effective source (parent's couple group if exists)
      const effectiveSource = getEffectiveSource(newNodeId, [...nodes, newNode]);
      const newEdge: Edge = {
        id: `edge-${newNodeId}-${selectedNodeId}`,
        source: effectiveSource,
        target: selectedNodeId,
        type: 'smoothstep',
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed' as any, color: '#3b82f6' }
      };
      additionalUiEdges.push(newEdge);
    } else if (selectedRelationshipCategory === 'spouse') {
      // Create MARRIED_TO in one direction only
      const marriedToSuccess = await createMarriedTo(familyTreeId, selectedUserId, newUserId);
      if (!marriedToSuccess) {
        console.error('Failed to create MARRIED_TO edge from selected user to new user');
        return;
      }

      // Create couple group
      const selectedPos = selectedNodeData.position;
      const spousePos = position;
      const minX = Math.min(selectedPos.x, spousePos.x);
      const minY = Math.min(selectedPos.y, spousePos.y);
      const maxX = minX + 200;
      const maxY = minY + 120;
      const groupPosition = { x: minX - 20, y: minY - 10 };
      const groupWidth = 440;
      const groupHeight = 180;

      const groupId = `group-${Date.now()}`;
      const groupNode: Node = {
        id: groupId,
        type: 'coupleGroup',
        position: groupPosition,
        style: { width: groupWidth, height: groupHeight, position: 'relative', overflow: 'hidden' },
        data: {},
      };

      // Update selected node with parentId and relative position
      const selectedRelativePos = { x: 40, y: 40 };
      const updatedNodes = nodes.map(n => n.id === selectedNodeId ? { ...n, parentId: groupId, position: selectedRelativePos } : n);

      // Set new node parentId and relative position, ensuring it fits within group
      const newRelativePos = { x: 220, y: 40 };
      newNode.parentId = groupId;
      newNode.position = newRelativePos;

      // Add group node
      updatedNodes.push(groupNode);

      setNodes(updatedNodes);

      // Handle existing children
      const children = await getChildren(selectedUserId);
      if (children.length > 0) {
        const linkToChildren = window.confirm(`Do you want to connect ${newMember.name} to all existing children of ${selectedNodeData.data.name}?`);
        if (linkToChildren) {
          for (const child of children) {
            await createParentsOf(familyTreeId, newUserId, child.userId);
            const childNodeId = getNodeIdByUserId(child.userId, nodes);
            if (childNodeId) {
              const childEdge: Edge = {
                id: `edge-${groupId}-${childNodeId}`,
                source: groupId,
                target: childNodeId,
                type: 'smoothstep',
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                markerEnd: { type: 'arrowclosed' as any, color: '#3b82f6' }
              };
              additionalUiEdges.push(childEdge);
            }
          }
          // Remove old child edges from selected node
          setEdges((eds) => eds.filter(e => e.source !== selectedNodeId));
        }
      }
   } 
  //else if (selectedRelationshipCategory === 'child') {
  // // Check for spouse and create PARENTS_OF edges
  // const spouses = await getSpouses(selectedUserId);
  // for (const spouse of spouses) {
  //   if (spouse.marriageStatus === 'married') {
  //     const existsParentOfSpouse = await edgeExists(familyTreeId, spouse.userId, newUserId, 'PARENTS_OF');
  //     if (!existsParentOfSpouse) {
  //       await createParentsOf(familyTreeId, spouse.userId, newUserId);
  //     }
  //   }
  // }

  // // Create PARENTS_OF from current node to child, avoiding duplicates
  // const existsParentOfCurrent = await edgeExists(familyTreeId, selectedUserId, newUserId, 'PARENTS_OF');
  // if (!existsParentOfCurrent) {
  //   await createParentsOf(familyTreeId, selectedUserId, newUserId);
  // }

  // // UI edge from effective source (couple group if exists)
  // const effectiveSource = getEffectiveSource(selectedNodeId, nodes);
  // const newEdge: Edge = {
  //   id: `edge-${effectiveSource}-${newNodeId}`,
  //   source: effectiveSource,
  //   target: newNodeId,
  //   type: 'smoothstep',
  //   style: { stroke: '#3b82f6', strokeWidth: 2 },
  //   markerEnd: { type: 'arrowclosed' as any, color: '#3b82f6' }
  // };
  // additionalUiEdges.push(newEdge);
//}

else if (selectedRelationshipCategory === 'child') {
  // Check for spouses and create PARENTS_OF edges
  const spouses = await getSpouses(selectedUserId);
  for (const spouse of spouses) {
    const existsParentOfSpouse = await edgeExists(familyTreeId, spouse.userId, newUserId, 'PARENTS_OF');
    if (!existsParentOfSpouse) {
      await createParentsOf(familyTreeId, spouse.userId, newUserId);
    }
  }

  // Create PARENTS_OF from current node to child, avoiding duplicates
  const existsParentOfCurrent = await edgeExists(familyTreeId, selectedUserId, newUserId, 'PARENTS_OF');
  if (!existsParentOfCurrent) {
    await createParentsOf(familyTreeId, selectedUserId, newUserId);
  }

  // UI edge from effective source (couple group if exists)
  const effectiveSource = getEffectiveSource(selectedNodeId, nodes);
  const newEdge: Edge = {
    id: `edge-${effectiveSource}-${newNodeId}`,
    source: effectiveSource,
    target: newNodeId,
    type: 'smoothstep',
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#3b82f6' }
  };
  additionalUiEdges.push(newEdge);
}

else if (selectedRelationshipCategory === 'sibling') {
      const parents = await getParents(selectedUserId);
      if (parents.length > 0) {
        for (const parent of parents) {
          await createParentsOf(familyTreeId, parent.userId, newUserId);
          const parentNodeId = getNodeIdByUserId(parent.userId, nodes);
          if (parentNodeId) {
            const effectiveSource = getEffectiveSource(parentNodeId, nodes);
            const sibEdge: Edge = {
              id: `edge-${effectiveSource}-${newNodeId}`,
              source: effectiveSource,
              target: newNodeId,
              type: 'smoothstep',
              style: { stroke: '#3b82f6', strokeWidth: 2 },
              markerEnd: { type: 'arrowclosed' as any, color: '#3b82f6' }
            };
            additionalUiEdges.push(sibEdge);
          }
        }
      } else {
        // Direct SIBLING relationship
        await createSibling(familyTreeId, selectedUserId, newUserId);
        const effectiveSource = getEffectiveSource(selectedNodeId, nodes);
        const newEdge: Edge = {
          id: `edge-${effectiveSource}-${newNodeId}`,
          source: effectiveSource,
          target: newNodeId,
          type: 'smoothstep',
          style: { stroke: '#8b5cf6', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed' as any, color: '#8b5cf6' }
        };
        additionalUiEdges.push(newEdge);
      }
    }

    // Add new node
    setNodes((nds) => nds.map(node => ({
      ...node,
      data: {
        ...node.data,
        onAddRelation: handleAddRelation
      }
    })).concat([newNode]));

    // Add additional UI edges
    setEdges((eds) => [...eds, ...additionalUiEdges]);

    setShowAddDialog(false);
    setSelectedRelationshipCategory('');
    setNewMember({ 
      name: '', 
      email: '', 
      phone: '', 
      relationship: '', 
      gender: '',
      dateOfBirth: '',
      marriageDate: '',
      marriageStatus: 'married'
    });

    toast({
      title: "Family member added",
      description: `${newMember.name} has been added to the family tree.`,
    });
  };

  const handleComplete = async () => {
    if (nodes.length <= 1) {
      toast({
        title: "Add family members",
        description: "Please add at least one family member before creating the tree.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      toast({
        title: "Family Tree Created!",
        description: "Your family tree has been saved successfully.",
      });

      navigate('/dashboard', {
        state: { user: rootUser },
        replace: true
      });
    } catch (error) {
      console.error('Error completing family tree:', error);
      toast({
        title: "Error",
        description: "Failed to complete family tree. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Build Your Family Tree</h1>
          <p className="text-slate-600 text-sm mt-1">Click the + button on any node to add family members</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={handleComplete}
            disabled={nodes.length <= 1 || isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Creating...' : 'Create Family Tree'}
          </Button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-transparent"
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.1}
          maxZoom={2}
          panOnScroll={true}
          panOnScrollSpeed={0.5}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnDrag={true}
          selectNodesOnDrag={false}
        >
          <Controls className="bg-white shadow-lg border border-slate-200" />
          <Background color="#e2e8f0" gap={30} size={2} />
        </ReactFlow>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
              <Input
                id="name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="Enter full name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gender" className="text-sm font-medium">Gender *</Label>
              <select
                id="gender"
                value={newMember.gender}
                onChange={e => setNewMember({ ...newMember, gender: e.target.value })}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring mt-1"
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <Label htmlFor="relationship" className="text-sm font-medium">Relationship *</Label>
              <Select
                value={newMember.relationship}
                onValueChange={(value) => setNewMember({ ...newMember, relationship: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {relationshipCategories[selectedRelationshipCategory as keyof typeof relationshipCategories]?.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="Enter email address"
                className="mt-1"
              />
            </div>

            {selectedRelationshipCategory === 'spouse' && (
              <>
                <div>
                  <Label htmlFor="marriageDate" className="text-sm font-medium">Marriage Date</Label>
                  <Input
                    id="marriageDate"
                    type="date"
                    value={newMember.marriageDate}
                    onChange={(e) => setNewMember({ ...newMember, marriageDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="marriageStatus" className="text-sm font-medium">Marriage Status</Label>
                  <Select value={newMember.marriageStatus} onValueChange={(value) => setNewMember({ ...newMember, marriageStatus: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

           <div>
              <Label htmlFor="dateOfBirth" className="text-sm font-medium">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={newMember.dateOfBirth}
                onChange={(e) => setNewMember({ ...newMember, dateOfBirth: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium">Phone (Optional)</Label>
              <Input
                id="phone"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                placeholder="Enter phone number"
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={addFamilyMember}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!newMember.name || !newMember.email || !newMember.relationship || !newMember.gender}
              >
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRelationshipChoice} onOpenChange={setShowRelationshipChoice}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Add Relation to {selectedNode?.data?.name}
            </DialogTitle>
            <p className="text-sm text-slate-600 mt-2">
              What relation do you want to add?
            </p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center text-center space-y-2"
              onClick={() => handleRelationshipCategorySelect('parent')}
            >
              <User className="w-6 h-6" />
              <span className="text-sm font-medium">Add Parent</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center text-center space-y-2"
              onClick={() => handleRelationshipCategorySelect('spouse')}
            >
              <User className="w-6 h-6" />
              <span className="text-sm font-medium">Add Spouse</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center text-center space-y-2"
              onClick={() => handleRelationshipCategorySelect('child')}
            >
              <User className="w-6 h-6" />
              <span className="text-sm font-medium">Add Child</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center text-center space-y-2"
              onClick={() => handleRelationshipCategorySelect('sibling')}
            >
              <User className="w-6 h-6" />
              <span className="text-sm font-medium">Add Sibling</span>
            </Button>
          </div>
          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowRelationshipChoice(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeBuilder;
