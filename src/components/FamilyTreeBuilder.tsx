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
}

// Custom node component for individual family members
const FamilyNode = ({ data, id }: { data: any; id: string }) => {
  return (
    <div className="relative bg-white border-2 border-blue-200 rounded-xl p-4 min-w-[200px] shadow-lg hover:shadow-xl transition-shadow">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-red-500" />

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

// Custom edge types for marriage connections
const MarriageEdge = ({ id, sourceX, sourceY, targetX, targetY, source, target, style = {}, markerEnd, markerStart }: any) => {
  // Force horizontal line by using same Y coordinate
  const midY = (sourceY + targetY) / 2;
  const edgePath = `M ${sourceX},${midY} L ${targetX},${midY}`;
  
  return (
    <>
      <defs>
        <marker
          id={`marriage-arrow-${id}`}
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0,0 0,8 8,4"
            fill="#ef4444"
          />
        </marker>
      </defs>
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 6,
          stroke: '#ef4444',
          strokeDasharray: '8,4',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={`url(#marriage-arrow-${id})`}
        markerStart={`url(#marriage-arrow-${id})`}
      />
      <text>
        <textPath href={`#${id}`} style={{ fontSize: '16px', fill: '#ef4444', fontWeight: 'bold' }} startOffset="50%" textAnchor="middle">
          ♥
        </textPath>
      </text>
      {/* Invisible handle for children to connect to marriage center */}
      <circle
        cx={(sourceX + targetX) / 2}
        cy={midY}
        r="4"
        fill="transparent"
        stroke="transparent"
        className="marriage-center-handle"
        data-marriage-id={id}
        data-source={source}
        data-target={target}
      />
    </>
  );
};

// Custom edge for children connecting from marriage center
const MarriageChildEdge = ({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  source, 
  target, 
  data, 
  style = {},
  sourcePosition,
  targetPosition 
}: any) => {
  // If this is from a marriage, calculate the marriage center point
  if (data?.isFromMarriage && data?.marriageCenterX !== undefined && data?.marriageCenterY !== undefined) {
    const marriageCenterX = data.marriageCenterX;
    const marriageCenterY = data.marriageCenterY;
    
    // Create path from marriage center to child
    const dropDistance = 50; // Distance to drop down from marriage line
    const edgePath = `M ${marriageCenterX},${marriageCenterY} L ${marriageCenterX},${marriageCenterY + dropDistance} L ${targetX},${targetY}`;
    
    return (
      <>
        <defs>
          <marker
            id={`child-arrow-${id}`}
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0,0 0,6 6,3"
              fill="#3b82f6"
            />
          </marker>
        </defs>
        <path
          id={id}
          style={{
            ...style,
            strokeWidth: 3,
            stroke: '#3b82f6',
          }}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={`url(#child-arrow-${id})`}
        />
      </>
    );
  }
  
  // Regular parent-child edge
  const edgePath = `M ${sourceX},${sourceY} Q ${sourceX},${(sourceY + targetY) / 2} ${targetX},${targetY}`;
  
  return (
    <>
      <defs>
        <marker
          id={`regular-arrow-${id}`}
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0,0 0,6 6,3"
            fill="#3b82f6"
          />
        </marker>
      </defs>
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#3b82f6',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={`url(#regular-arrow-${id})`}
      />
    </>
  );
};

const edgeTypes = {
  marriage: MarriageEdge,
  marriageChild: MarriageChildEdge,
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
      // Position spouse horizontally next to the selected node, ensuring same Y coordinate
      const spouseOffset = relationship === 'husband' ? -250 : 250;
      return {
        x: parentPos.x + spouseOffset,
        y: parentPos.y // Same Y coordinate for horizontal marriage line
      };
    }

    if (category === 'parent') {
      const parentsAtLevel = existingNodes.filter(node => {
        const nodeGeneration = typeof node.data?.generation === 'number' ? node.data.generation : 0;
        return nodeGeneration === generation && relationshipCategories.parent.includes((node.data.relationship as string) || '');
      });
      const parentIndex = parentsAtLevel.length;
      return {
        x: parentPos.x + (parentIndex === 0 ? -125 : 125),
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

  const getNodeIdByUserId = (userId: string, nodes: Node[]): string | null => {
    const node = nodes.find(n => n.data.userId === userId);
    return node?.id || null;
  };

  // Helper function to find marriage partner midpoint for children connections
  const findMarriageMidpoint = (node1: Node, node2: Node): { x: number; y: number } => {
    return {
      x: (node1.position.x + node2.position.x) / 2,
      y: Math.max(node1.position.y, node2.position.y) + 50
    };
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

    if (validation.requiresConfirmation) {
      const confirmed = window.confirm(validation.message + "\n\nClick OK to continue or Cancel to abort.");
      if (!confirmed) {
        return;
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
        const existingParentId = existingParents[0].userId;
        if (!await edgeExists(familyTreeId, existingParentId, newUserId, 'MARRIED_TO')) {
          await createMarriedTo(familyTreeId, existingParentId, newUserId);
        }
        
        const existingParentNode = nodes.find(n => n.data.userId === existingParentId);
        if (existingParentNode) {
          // Create marriage edge between parents
          additionalUiEdges.push({
            id: `marriage-${existingParentNode.id}-${newNodeId}`,
            source: existingParentNode.id,
            target: newNodeId,
            type: 'marriage',
            style: { strokeWidth: 4, stroke: '#ef4444' },
            markerEnd: { type: 'arrowclosed', color: '#ef4444' },
            markerStart: { type: 'arrowclosed', color: '#ef4444' },
          });

          // Connect children from marriage midpoint
          const children = await getChildren(existingParentId);
          const marriageMidpoint = findMarriageMidpoint(existingParentNode, newNode);
          
          for (const child of children) {
            if (!await edgeExists(familyTreeId, newUserId, child.userId, 'PARENTS_OF')) {
              await createParentsOf(familyTreeId, newUserId, child.userId);
            }
            const childNodeId = getNodeIdByUserId(child.userId, nodes);
            if (childNodeId) {
              // Remove existing parent-child edge and add new one from marriage midpoint
              setEdges((eds) => eds.filter((e) => e.source !== existingParentNode.id || e.target !== childNodeId));
              additionalUiEdges.push({
                id: `marriage-child-${newNodeId}-${childNodeId}`,
                source: newNodeId,
                target: childNodeId,
                type: 'marriageChild',
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
                data: { 
                  isFromMarriage: true, 
                  marriagePartner: existingParentNode.id,
                  marriageCenterX: (existingParentNode.position.x + position.x) / 2,
                  marriageCenterY: existingParentNode.position.y
                }
              });
            }
          }
        }
      }
      if (!await edgeExists(familyTreeId, newUserId, selectedUserId, 'PARENTS_OF')) {
        await createParentsOf(familyTreeId, newUserId, selectedUserId);
      }
      
      // Add parent-child edge
      additionalUiEdges.push({
        id: `parent-child-${newNodeId}-${selectedNodeId}`,
        source: newNodeId,
        target: selectedNodeId,
        type: 'smoothstep',
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
      });

    } else if (selectedRelationshipCategory === 'spouse') {
      if (!await createMarriedTo(familyTreeId, selectedUserId, newUserId)) {
        console.error('Failed to create MARRIED_TO edge');
        return;
      }

      // Create special marriage edge
      additionalUiEdges.push({
        id: `marriage-${selectedNodeId}-${newNodeId}`,
        source: selectedNodeId,
        target: newNodeId,
        type: 'marriage',
        style: { strokeWidth: 4, stroke: '#ef4444' },
        markerEnd: { type: 'arrowclosed', color: '#ef4444' },
        markerStart: { type: 'arrowclosed', color: '#ef4444' },
      });

      // Handle existing children
      const children = await getChildren(selectedUserId);
      if (children.length > 0) {
        const linkToChildren = window.confirm(`Connect ${newMember.name} to ${selectedNodeData.data.name}'s children?`);
        if (linkToChildren) {
          for (const child of children) {
            if (!await edgeExists(familyTreeId, newUserId, child.userId, 'PARENTS_OF')) {
              await createParentsOf(familyTreeId, newUserId, child.userId);
            }
            const childNodeId = getNodeIdByUserId(child.userId, nodes);
            if (childNodeId) {
              // Remove existing single parent edge and add marriage-based edge
              setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId || e.target !== childNodeId));
              additionalUiEdges.push({
                id: `marriage-child-${selectedNodeId}-${childNodeId}`,
                source: selectedNodeId,
                target: childNodeId,
                type: 'smoothstep',
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
                data: { isFromMarriage: true, marriagePartner: newNodeId }
              });
            }
          }
        }
      }

    } else if (selectedRelationshipCategory === 'child') {
      const spouses = await getSpouses(selectedUserId);
      for (const spouse of spouses) {
        if (!await edgeExists(familyTreeId, spouse.userId, newUserId, 'PARENTS_OF')) {
          await createParentsOf(familyTreeId, spouse.userId, newUserId);
        }
      }
      if (!await edgeExists(familyTreeId, selectedUserId, newUserId, 'PARENTS_OF')) {
        await createParentsOf(familyTreeId, selectedUserId, newUserId);
      }

      // Check if selected node has a spouse to create marriage-based edge
      const marriageEdge = edges.find(e => 
        (e.source === selectedNodeId || e.target === selectedNodeId) && e.type === 'marriage'
      );
      
      if (marriageEdge) {
        const marriagePartner = marriageEdge.source === selectedNodeId ? marriageEdge.target : marriageEdge.source;
        const partnerNode = nodes.find(n => n.id === marriagePartner);
        const marriageCenterX = partnerNode ? (selectedNodeData.position.x + partnerNode.position.x) / 2 : selectedNodeData.position.x;
        
        additionalUiEdges.push({
          id: `marriage-child-${selectedNodeId}-${newNodeId}`,
          source: selectedNodeId,
          target: newNodeId,
          type: 'marriageChild',
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
          data: { 
            isFromMarriage: true, 
            marriagePartner: marriagePartner,
            marriageCenterX: marriageCenterX,
            marriageCenterY: selectedNodeData.position.y
          }
        });
      } else {
        additionalUiEdges.push({
          id: `parent-child-${selectedNodeId}-${newNodeId}`,
          source: selectedNodeId,
          target: newNodeId,
          type: 'smoothstep',
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
        });
      }

    } else if (selectedRelationshipCategory === 'sibling') {
      const parents = await getParents(selectedUserId);
      if (parents.length > 0) {
        for (const parent of parents) {
          await createParentsOf(familyTreeId, parent.userId, newUserId);
          const parentNodeId = getNodeIdByUserId(parent.userId, nodes);
          if (parentNodeId) {
            // Check if this parent has a marriage edge
            const parentMarriageEdge = edges.find(e => 
              (e.source === parentNodeId || e.target === parentNodeId) && e.type === 'marriage'
            );
            
            if (parentMarriageEdge) {
              const marriagePartner = parentMarriageEdge.source === parentNodeId ? parentMarriageEdge.target : parentMarriageEdge.source;
              const partnerNode = nodes.find(n => n.id === marriagePartner);
              const parentNode = nodes.find(n => n.id === parentNodeId);
              const marriageCenterX = partnerNode && parentNode ? (parentNode.position.x + partnerNode.position.x) / 2 : (parentNode?.position.x || 0);
              
              additionalUiEdges.push({
                id: `marriage-child-${parentNodeId}-${newNodeId}`,
                source: parentNodeId,
                target: newNodeId,
                type: 'marriageChild',
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
                data: { 
                  isFromMarriage: true, 
                  marriagePartner: marriagePartner,
                  marriageCenterX: marriageCenterX,
                  marriageCenterY: parentNode?.position.y || 0
                }
              });
            } else {
              additionalUiEdges.push({
                id: `parent-child-${parentNodeId}-${newNodeId}`,
                source: parentNodeId,
                target: newNodeId,
                type: 'smoothstep',
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
              });
            }
          }
        }
      } else {
        await createSibling(familyTreeId, selectedUserId, newUserId);
        additionalUiEdges.push({
          id: `sibling-${selectedNodeId}-${newNodeId}`,
          source: selectedNodeId,
          target: newNodeId,
          type: 'smoothstep',
          style: { stroke: '#8b5cf6', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#8b5cf6' },
        });
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
          edgeTypes={edgeTypes}
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
