import React, { useState, useCallback, useEffect } from 'react';
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
import { runQuery } from '@/lib/neo4j/connection'; // Import runQuery

// Helper function to create relationships in Neo4j - Defined OUTSIDE the component
const createRelationshipInNeo4j = async (
  familyTreeId: string,
  sourceUserId: string,
  targetUserId: string,
  relationshipType: string
) => {
   try {
      const cypher = `
         MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceUserId})
         MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetUserId})
         CREATE (source)-[:RELATES_TO {relationship: $relationshipType}]->(target)
         RETURN source.userId as sourceId, target.userId as targetId
      `;

      const result = await runQuery(cypher, {
         familyTreeId,
         sourceUserId,
         targetUserId,
         relationshipType: relationshipType.toLowerCase(), // Store in lowercase
      });

      return !!result;
   } catch (error) {
      console.error(`Error creating ${relationshipType} relationship:`, error);
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
  };
}

// Hierarchical relationship types based on the new flow
const relationshipCategories = {
  parent: ['father', 'mother'],
  child: ['son', 'daughter'],
  spouse: ['husband', 'wife'],
  sibling: ['brother', 'sister']
};

const allRelationshipTypes = [
  'father', 'mother', 'son', 'daughter', 'brother', 'sister',
  'husband', 'wife', 'grandfather', 'grandmother', 'grandson', 'granddaughter'
];

// Custom node component
const FamilyNode = ({ data, id }: { data: any; id: string }) => {
  return (
    <div className="relative bg-white border-2 border-blue-200 rounded-xl p-4 min-w-[200px] shadow-lg hover:shadow-xl transition-shadow">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />

      <div className="flex flex-col items-center space-y-3">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-white" />
        </div>

        <div className="text-center">
          <div className="font-semibold text-slate-800 text-sm">{data.name}</div>
          <div className="text-xs text-slate-600">{data.email}</div>
          {data.relationship && !data.isRoot && (
            <div className="text-xs font-medium text-blue-600 mt-1 capitalize bg-blue-50 px-2 py-1 rounded">
              {data.relationship}
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-8 h-8 rounded-full p-0 hover:bg-blue-50 border-blue-300"
          onClick={() => {
            console.log('Plus button clicked for node:', id);
            console.log('onAddRelation function exists:', !!data.onAddRelation);
            data.onAddRelation && data.onAddRelation(id);
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const nodeTypes = {
  familyMember: FamilyNode,
};

interface FamilyTreeBuilderProps {
  onComplete: (familyData: any) => void;
  onBack: () => void;
  registrationData: any;
}

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

  const handleAddRelation = useCallback((nodeId: string) => {
    console.log('handleAddRelation called with nodeId:', nodeId);
    const node = nodes.find(n => n.id === nodeId);
    console.log('Found node:', node);
    if (!node) {
      console.log('Node not found!');
      return;
    }
    
    console.log('Setting selectedNodeId to:', nodeId);
    setSelectedNodeId(nodeId);
    setSelectedNode(node);
    setShowRelationshipChoice(true);
    console.log('showRelationshipChoice set to true');
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
  }, [nodes]);

  // Initialize with "You" node in center using registration data
  useEffect(() => {
    if (registrationData) {
      const rootNode: FamilyMemberNode = {
        id: 'root',
        type: 'familyMember',
        position: { x: 0, y: 0 },
        data: {
          label: registrationData.name,
          name: registrationData.name,
          email: registrationData.email,
          generation: 0,
          isRoot: true,
          onAddRelation: handleAddRelation
        }
      };
      setNodes([rootNode]);
    }
  }, [registrationData, handleAddRelation]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleRelationshipCategorySelect = (category: string) => {
    setSelectedRelationshipCategory(category);
    setShowRelationshipChoice(false);
    setShowAddDialog(true);
  };

  // Validation functions for edge cases
  const validateRelationshipAddition = async (selectedNode: any, category: string): Promise<{ valid: boolean; message?: string; requiresConfirmation?: boolean }> => {
    if (category === 'parent') {
      // Check parent count
      const existingParents = nodes.filter(node => 
        edges.some(edge => edge.target === selectedNode.id && edge.source === node.id) &&
        relationshipCategories.parent.includes(node.data.relationship || '')
      );
      
      if (existingParents.length >= 2) {
        return { 
          valid: false, 
          message: "A person can have max 2 parents. You can add a step-parent instead." 
        };
      }
      
      if (existingParents.length === 1) {
        return {
          valid: true,
          requiresConfirmation: true,
          message: `${selectedNode.data.name} already has one parent (${existingParents[0].data.name}). Is this new parent a spouse to the existing parent?`
        };
      }
    }

    if (category === 'spouse') {
      // Check for existing married spouse
      const existingSpouses = nodes.filter(node => 
        edges.some(edge => 
          (edge.source === selectedNode.id && edge.target === node.id) || 
          (edge.target === selectedNode.id && edge.source === node.id)
        ) &&
        relationshipCategories.spouse.includes(node.data.relationship || '') &&
        node.data.marriageStatus === 'married'
      );
      
      if (existingSpouses.length > 0 && newMember.marriageStatus === 'married') {
        return {
          valid: true,
          requiresConfirmation: true,
          message: `${selectedNode.data.name} is already married to ${existingSpouses[0].data.name}. Do you want to end the current marriage and add a new spouse?`
        };
      }
    }

    if (category === 'sibling') {
      // Check if selected person has parents
      const hasParents = nodes.some(node => 
        edges.some(edge => edge.target === selectedNode.id && edge.source === node.id) &&
        relationshipCategories.parent.includes(node.data.relationship || '')
      );
      
      if (!hasParents) {
        return {
          valid: false,
          message: "Please add at least one parent first before adding siblings."
        };
      }
    }

    return { valid: true };
  };

  // Check if email already exists in current tree or in database
  const checkEmailExists = async (email: string): Promise<boolean> => {
    // Check in current tree first
    const existsInTree = nodes.some(node => node.data.email === email);
    if (existsInTree) {
      return true;
    }

    // Check in database
    try {
      const existingUser = await getUserByEmailOrId(email);
      return existingUser !== null;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  // Calculate generation based on hierarchical relationship
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

  // Enhanced position calculation for hierarchical tree structure (top to bottom)
  const calculateNodePosition = (
    parentNode: Node,
    relationship: string,
    existingNodes: Node[],
    category: string
  ): { x: number; y: number } => {
    const parentPos = parentNode.position;
    const parentGeneration = typeof parentNode.data?.generation === 'number' ? parentNode.data.generation : 0;
    const generation = getGeneration(relationship, parentGeneration);

    const generationSpacing = 200; // Vertical spacing between generations
    const siblingSpacing = 250; // Horizontal spacing between siblings

    // Top-to-bottom layout: negative Y for ancestors, positive Y for descendants
    const baseY = parentPos.y + (generation - parentGeneration) * generationSpacing;

    // Handle different relationship categories
    if (category === 'spouse') {
      // Place spouse horizontally adjacent
      const spouseOffset = relationship === 'husband' ? -200 : 200;
      return {
        x: parentPos.x + spouseOffset,
        y: parentPos.y
      };
    }

    if (category === 'parent') {
      // Place parents above the current person
      const parentsAtLevel = existingNodes.filter(node => {
        const nodeGeneration = typeof node.data?.generation === 'number' ? node.data.generation : 0;
        return nodeGeneration === generation && relationshipCategories.parent.includes((node.data.relationship as string) || '');
      });
      
      const parentIndex = parentsAtLevel.length;
      return {
        x: parentPos.x + (parentIndex === 0 ? -100 : 100), // First parent left, second parent right
        y: baseY
      };
    }

    if (category === 'child') {
      // Place children below the current person
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
      // Place siblings at the same level as the reference person
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

    // Default positioning
    return {
      x: parentPos.x + 200,
      y: baseY
    };
  };

  const addFamilyMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.relationship || !newMember.gender || !selectedNodeId) {
      return;
    }

    // Validate relationship addition
    const validation = await validateRelationshipAddition(selectedNode, selectedRelationshipCategory);
    if (!validation.valid) {
      toast({
        title: "Cannot add relationship",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    // Handle confirmation cases
    if (validation.requiresConfirmation) {
      const confirmed = window.confirm(validation.message + "\n\nClick OK to continue or Cancel to abort.");
      if (!confirmed) {
        return;
      }
    }

    // Check for email duplicates
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
    if (!selectedNodeData) return;

    const newNodeId = `node-${Date.now()}`;
    const selectedGeneration = typeof selectedNodeData.data?.generation === 'number' ? selectedNodeData.data.generation : 0;
    const generation = getGeneration(newMember.relationship, selectedGeneration);

    const position = calculateNodePosition(selectedNodeData, newMember.relationship, nodes, selectedRelationshipCategory);

    const newNode: FamilyMemberNode = {
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
        marriageStatus: newMember.marriageStatus
      }
    };

    // Create appropriate edge based on relationship hierarchy
    let sourceId = selectedNodeId;
    let targetId = newNodeId;
    
    // For hierarchical relationships, parent should be source, child should be target
    if (selectedRelationshipCategory === 'parent') {
      sourceId = newNodeId;
      targetId = selectedNodeId;
    }

    const newEdge: Edge = {
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      style: {
        stroke: '#3b82f6',
        strokeWidth: 2,
      },
      markerEnd: {
        type: 'arrowclosed' as any,
        color: '#3b82f6'
      }
    };

    // Auto-link logic for special cases
    let additionalEdges: Edge[] = [];
    
    // If adding spouse and selected person has children, auto-link to children
    if (selectedRelationshipCategory === 'spouse') {
      const children = nodes.filter(node => 
        edges.some(edge => edge.source === selectedNodeId && edge.target === node.id) &&
        relationshipCategories.child.includes(node.data.relationship || '')
      );
      
      if (children.length > 0) {
        const linkToChildren = window.confirm(`Do you want to connect ${newMember.name} to all existing children of ${selectedNodeData.data.name}?`);
        if (linkToChildren) {
          additionalEdges = children.map(child => ({
            id: `edge-${newNodeId}-${child.id}`,
            source: newNodeId,
            target: child.id,
            type: 'smoothstep',
            style: { stroke: '#10b981', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed' as any, color: '#10b981' }
          }));
        }
      }
    }

    // If adding child and selected person has spouse, auto-link to spouse
    if (selectedRelationshipCategory === 'child') {
      const spouse = nodes.find(node => 
        edges.some(edge => 
          (edge.source === selectedNodeId && edge.target === node.id) || 
          (edge.target === selectedNodeId && edge.source === node.id)
        ) &&
        relationshipCategories.spouse.includes(node.data.relationship || '')
      );
      
      if (spouse) {
        additionalEdges.push({
          id: `edge-${spouse.id}-${newNodeId}`,
          source: spouse.id,
          target: newNodeId,
          type: 'smoothstep',
          style: { stroke: '#10b981', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed' as any, color: '#10b981' }
        });
      }
    }

    // If adding sibling, link to same parents
    if (selectedRelationshipCategory === 'sibling') {
      const parents = nodes.filter(node => 
        edges.some(edge => edge.source === node.id && edge.target === selectedNodeId) &&
        relationshipCategories.parent.includes(node.data.relationship || '')
      );
      
      additionalEdges = parents.map(parent => ({
        id: `edge-${parent.id}-${newNodeId}`,
        source: parent.id,
        target: newNodeId,
        type: 'smoothstep',
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed' as any, color: '#8b5cf6' }
      }));
    }

    setNodes((nds) => nds.map(node => ({
      ...node,
      data: {
        ...node.data,
        onAddRelation: handleAddRelation
      }
    })).concat([newNode]));

    setEdges((eds) => [...eds, newEdge, ...additionalEdges]);

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

   // This function is not needed for storing unidirectional relationships as per new requirement
   // const getOppositeRelationship = (relationship: string): string => {
  //   if (!relationship || typeof relationship !== 'string') return "family";
  //   const opposites: Record<string, string> = {
  //     "father": "child",
  //     "mother": "child",
  //     "son": "parent",
  //     "daughter": "parent",
  //     "brother": "sibling",
  //     "sister": "sibling",
  //     "husband": "wife",
  //     "wife": "husband",
  //     "grandfather": "grandchild",
  //     "grandmother": "grandchild",
  //     "grandson": "grandparent",
  //     "granddaughter": "grandparent"
  //   };
  //   return opposites[relationship.toLowerCase()] || "family";
  // };


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
      console.log('Starting family tree creation...');
      const familyTreeId = generateId('FT');
      await createFamilyTree({
        familyTreeId,
        createdBy: 'self',
        createdAt: getCurrentDateTime(),
      });

      // 1. Create all users and build a nodeId → userId map
      const nodeIdToUserId: Record<string, string> = {};
      // Create root user
      const rootUser = await createUser({
        userId: generateId('U'),
        name: registrationData.name,
        email: registrationData.email,
        password: registrationData.password,
        status: 'active' as const,
        familyTreeId,
        createdBy: 'self',
        createdAt: getCurrentDateTime(),
        gender: registrationData.gender,
      });
      nodeIdToUserId['root'] = rootUser.userId;
      localStorage.setItem("userId", rootUser.userId);
      localStorage.setItem("userData", JSON.stringify(rootUser));

      // Create all other users
      for (const node of nodes) {
        if (node.id !== 'root') {
          let createdMember = null;
          let memberUserId = null;
          let existingUser = await getUserByEmailOrId(node.data.email);
          if (!existingUser && node.data.userId) {
            existingUser = await getUserByEmailOrId(node.data.userId);
          }
          if (existingUser) {
            createdMember = existingUser;
            memberUserId = existingUser.userId;
          } else {
            const memberData = {
              userId: generateId('U'),
              name: node.data.name,
              email: node.data.email,
              phone: node.data.phone,
              status: 'invited' as const,
              familyTreeId,
              createdBy: rootUser.userId,
              createdAt: getCurrentDateTime(),
              myRelationship: node.data.relationship,
              gender: node.data.gender || 'other',
            };
            createdMember = await createUser(memberData);
            memberUserId = createdMember.userId;
          }
          nodeIdToUserId[node.id] = memberUserId;
        }
      }

      // 2. Create unidirectional relationships based on the edge direction and selected relationship
      for (const edge of edges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) continue;

        const sourceUserId = nodeIdToUserId[sourceNode.id];
        const targetUserId = nodeIdToUserId[targetNode.id];
        const targetNodeRelationship = targetNode.data.relationship?.toLowerCase();

        // Store the relationship as it was created in the UI with the selected label
        if (targetNodeRelationship) {
            await createRelationshipInNeo4j(
                familyTreeId,
                sourceUserId,
                targetUserId,
                targetNodeRelationship // Use the selected relationship directly
            );
        }
      }

      toast({
        title: "Family Tree Created!",
        description: "Your family tree has been saved successfully.",
      });

      navigate('/dashboard', {
        state: { user: rootUser },
        replace: true
      });

    } catch (error) {
      console.error('Error saving family tree:', error);
      toast({
        title: "Error",
        description: "Failed to save family tree. Please try again.",
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

      {/* Relationship Category Selection Dialog */}
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
