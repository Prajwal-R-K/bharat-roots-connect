// src/components/FamilyTreeVisualization1.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Position,
  Handle,
  ConnectionLineType,
  MarkerType,
  useNodes,
  useEdges
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getFamilyRelationships } from '@/lib/neo4j/family-tree';
import { getUserPersonalizedFamilyTree, deriveExtendedRelationships } from '@/lib/neo4j/relationships';
import { Heart, Crown, User as UserIcon, Users, Plus, Mail, Phone, Calendar } from "lucide-react";

interface FamilyMember {
  userId: string;
  name: string;
  email: string;
  status: string;
  relationship?: string;
  createdBy?: string;
  profilePicture?: string;
  gender?: string;
}

interface CoreRelationship {
  source: string;
  target: string;
  type: 'PARENTS_OF' | 'SIBLING' | 'MARRIED_TO';
  sourceName?: string;
  targetName?: string;
  sourceGender?: string;
  targetGender?: string;
}

interface SemanticRelationship {
  source: string;
  target: string;
  type: string;
  sourceName?: string;
  targetName?: string;
  isExtended?: boolean;
}

interface FamilyTreeVisualizationProps {
  user: User;
  familyMembers: FamilyMember[];
  viewMode?: 'personal' | 'all' | 'hyper';
  level?: number;
  minHeight?: string;
  showControls?: boolean;
  defaultNodeRadius?: number;
  defaultLineWidth?: number;
  defaultZoom?: number;
}

// Relationship categorization for positioning
const getRelationshipCategory = (relationship: string): 'ancestor' | 'descendant' | 'sibling' => {
  const ancestors = ['father', 'mother', 'grandfather', 'grandmother', 'great-grandfather', 'great-grandmother'];
  const descendants = ['son', 'daughter', 'grandson', 'granddaughter', 'great-grandson', 'great-granddaughter'];
  const siblings = ['brother', 'sister', 'spouse', 'wife', 'husband'];
  
  if (ancestors.includes(relationship.toLowerCase())) return 'ancestor';
  if (descendants.includes(relationship.toLowerCase())) return 'descendant';
  return 'sibling';
};

// Get reciprocal relationship with gender
const getReciprocalRelationship = (relationship: string, targetGender: string, sourceGender?: string): string => {
  const reciprocals: Record<string, Record<string, string>> = {
    father: { male: 'son', female: 'daughter' },
    mother: { male: 'son', female: 'daughter' },
    son: { male: 'father', female: 'mother' },
    daughter: { male: 'father', female: 'mother' },
    brother: { male: 'brother', female: 'sister' },
    sister: { male: 'brother', female: 'sister' },
    grandfather: { male: 'grandson', female: 'granddaughter' },
    grandmother: { male: 'grandson', female: 'granddaughter' },
    grandson: { male: 'grandfather', female: 'grandmother' },
    granddaughter: { male: 'grandfather', female: 'grandmother' },
    husband: { female: 'wife' },
    wife: { male: 'husband' },
    spouse: { male: 'husband', female: 'wife' }
  };
  
  const targetReciprocal = reciprocals[relationship.toLowerCase()]?.[targetGender] || relationship;
  if (sourceGender && ['spouse', 'husband', 'wife'].includes(relationship.toLowerCase())) {
    return reciprocals[targetReciprocal.toLowerCase()]?.[sourceGender] || targetReciprocal;
  }
  // Ensure reciprocal matches the source's perspective for parent-child
  if (['son', 'daughter'].includes(relationship.toLowerCase()) && sourceGender) {
    return reciprocals[relationship.toLowerCase()]?.[sourceGender] || relationship;
  }
  return targetReciprocal;
};

// Custom family member node component
const FamilyMemberNode = ({ data, id }: { data: any; id: string }) => {
  const getNodeColor = () => {
    // Use logged-in user (data.loginUserId) to determine crown color;
    // the node whose id matches loginUserId gets the crown.
    if (data.userId === data.loginUserId) return 'border-amber-400 bg-amber-50';
    if (data.gender === 'male') return 'border-blue-400 bg-blue-50';
    if (data.gender === 'female') return 'border-pink-400 bg-pink-50';
    return 'border-gray-400 bg-gray-50';
  };

  return (
    <div className={`relative ${getNodeColor()} border-2 rounded-xl p-3 min-w-[160px] shadow-lg hover:shadow-xl transition-shadow`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-gray-400" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-gray-400" />
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-gray-400" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-gray-400" />
      
      <div className="flex flex-col items-center space-y-2">
        <Avatar className="w-12 h-12">
          <AvatarImage src={data.profilePicture} />
          <AvatarFallback className="text-xs font-semibold">
            {data.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="text-center">
          <div className="font-semibold text-sm text-gray-800">{data.name}</div>
          {data.relationship && (
            <Badge variant="secondary" className="text-xs mt-1">
              {data.relationship}
            </Badge>
          )}
          {/* Show crown if this node is the logged-in user */}
          {data.userId === data.loginUserId && (
            <Crown className="w-4 h-4 text-amber-500 mx-auto mt-1" />
          )}
        </div>
      </div>

      {/* Compact Generation Indicator */}
      <div className="absolute top-1 left-1 text-xs font-bold text-slate-400 bg-slate-100/80 px-1.5 py-0.5 rounded-full">
        G{data.generation || 0}
      </div>
    </div>
  );
};

// Enhanced Marriage Edge Component with better visual design
const MarriageEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {} }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;
  
  const distance = Math.abs(targetX - sourceX);
  const archHeight = Math.max(20, Math.min(40, distance / 6));
  const controlPointY = centerY - archHeight;
  const edgePath = `M ${sourceX},${centerY} Q ${centerX},${controlPointY} ${targetX},${centerY}`;

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="cursor-pointer"
    >
      <defs>
        <linearGradient id={`marriage-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        
        <linearGradient id={`marriage-gradient-hover-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        
        <filter id={`marriage-glow-${id}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: isHovered ? 6 : 4,
          stroke: isHovered ? `url(#marriage-gradient-hover-${id})` : `url(#marriage-gradient-${id})`,
          strokeDasharray: '12,8',
          strokeLinecap: 'round',
          filter: isHovered ? `url(#marriage-glow-${id})` : 'none',
        }}
        className={`react-flow__edge-path transition-all duration-300 ${isHovered ? 'animate-pulse' : ''}`}
        d={edgePath}
      />
      
      <text
        x={centerX}
        y={controlPointY - 8}
        textAnchor="middle"
        style={{ 
          fontSize: isHovered ? '18px' : '16px', 
          fill: '#ef4444', 
          fontWeight: 'bold',
          transition: 'all 0.3s ease'
        }}
        className="pointer-events-none"
      >
        💍
      </text>
    </g>
  );
};

// Enhanced Parent-Child Edge Component with marriage center routing
const ParentChildEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {}, source, target, data }: any) => {
  const nodes = useNodes();
  const edges = useEdges();
  
  // Find if this child should connect from a marriage center
  const findMarriageCenter = (parentId: string) => {
    const marriageEdge = edges.find(e => 
      (e.source === parentId || e.target === parentId) && e.type === 'marriage'
    );
    
    if (!marriageEdge) return null;
    
    const spouseId = marriageEdge.source === parentId ? marriageEdge.target : marriageEdge.source;
    const parentNode = nodes.find(n => n.id === parentId);
    const spouseNode = nodes.find(n => n.id === spouseId);
    
    if (!parentNode || !spouseNode) return null;
    
    const leftNode = parentNode.position.x < spouseNode.position.x ? parentNode : spouseNode;
    const rightNode = parentNode.position.x < spouseNode.position.x ? spouseNode : parentNode;
    
    const leftHandleX = leftNode.position.x + 140; // node width
    const leftHandleY = leftNode.position.y + 90; // node height / 2
    const rightHandleX = rightNode.position.x;
    const rightHandleY = rightNode.position.y + 90;
    
    const centerX = (leftHandleX + rightHandleX) / 2;
    const centerY = (leftHandleY + rightHandleY) / 2;
    const distance = Math.abs(rightHandleX - leftHandleX);
    const archHeight = Math.max(20, Math.min(40, distance / 6));
    const controlPointY = centerY - archHeight;
    
    return {
      x: centerX,
      y: controlPointY - 8
    };
  };

  const marriageCenter = findMarriageCenter(source);
  
  if (marriageCenter) {
    // Route from marriage center to child
    const dropDistance = 80;
    const horizontalDistance = 40;
    
    const intermediateY = marriageCenter.y + dropDistance;
    
    const edgePath = `
      M ${marriageCenter.x},${marriageCenter.y}
      L ${marriageCenter.x},${intermediateY - horizontalDistance}
      Q ${marriageCenter.x},${intermediateY} ${marriageCenter.x + (targetX > marriageCenter.x ? horizontalDistance : -horizontalDistance)},${intermediateY}
      L ${targetX - (targetX > marriageCenter.x ? horizontalDistance : -horizontalDistance)},${intermediateY}
      Q ${targetX},${intermediateY} ${targetX},${intermediateY + horizontalDistance}
      L ${targetX},${targetY}
    `;
    
    return (
      <>
        <defs>
          <linearGradient id={`child-gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          
          <marker id={`child-arrow-${id}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
            <polygon points="0,0 0,8 8,4" fill="#22c55e" />
          </marker>
        </defs>
        
        <path
          id={id}
          style={{
            ...style,
            strokeWidth: 2,
            stroke: `url(#child-gradient-${id})`,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={`url(#child-arrow-${id})`}
        />
        
        <circle
          cx={marriageCenter.x}
          cy={marriageCenter.y}
          r="3"
          fill="#22c55e"
          stroke="white"
          strokeWidth="1"
          className="drop-shadow-sm"
        />
      </>
    );
  }
  
  // Standard parent-child connection
  const deltaX = targetX - sourceX;
  const deltaY = targetY - sourceY;
  const controlPoint1X = sourceX + deltaX * 0.2;
  const controlPoint1Y = sourceY + deltaY * 0.8;
  const controlPoint2X = sourceX + deltaX * 0.8;
  const controlPoint2Y = sourceY + deltaY * 0.2;
  
  const edgePath = `M ${sourceX},${sourceY} C ${controlPoint1X},${controlPoint1Y} ${controlPoint2X},${controlPoint2Y} ${targetX},${targetY}`;
  
  return (
    <>
      <defs>
        <linearGradient id={`parent-gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        
        <marker id={`parent-arrow-${id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
          <polygon points="0,0 0,6 6,3" fill="#1d4ed8" />
        </marker>
      </defs>
      
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: `url(#parent-gradient-${id})`,
          strokeLinecap: 'round',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={`url(#parent-arrow-${id})`}
      />
    </>
  );
};

// Enhanced Sibling Edge Component
const SiblingEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {} }: any) => {
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2 - 30;
  
  const edgePath = `M ${sourceX},${sourceY} Q ${centerX},${centerY} ${targetX},${targetY}`;
  
  return (
    <>
      <defs>
        <linearGradient id={`sibling-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: `url(#sibling-gradient-${id})`,
          strokeDasharray: '6,3',
          strokeLinecap: 'round',
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />
      
      <text
        x={centerX}
        y={centerY - 5}
        textAnchor="middle"
        style={{ fontSize: '12px', fill: '#8b5cf6', fontWeight: 'bold' }}
        className="pointer-events-none"
      >
        👫
      </text>
    </>
  );
};

const nodeTypes = {
  familyMember: FamilyMemberNode,
};

const edgeTypes = {
  marriage: MarriageEdge,
  parentChild: ParentChildEdge,
  sibling: SiblingEdge,
};

// Enhanced position calculation with better spacing for compact nodes
const calculateNodePositions = (
  members: FamilyMember[], 
  coreRelationships: CoreRelationship[], 
  createdByUserId: string,
  loggedInUserId: string
): { nodes: Node[]; edges: Edge[] } => {
  const nodeMap = new Map<string, FamilyMember>();
  members.forEach(member => nodeMap.set(member.userId, member));
  
  const positions = new Map<string, { x: number; y: number; generation: number }>();
  const processedNodes = new Set<string>();
  
  // Compact spacing constants
  const GENERATION_SPACING = 220;
  const SIBLING_SPACING = 180;
  const MARRIAGE_SPACING = 260;
  const MIN_NODE_SPACING = 160;
  
  // Start with the root user at center
  const rootPosition = { x: 0, y: 0, generation: 0 };
  positions.set(createdByUserId, rootPosition);
  
  // Build relationship maps
  const parentChildMap = new Map<string, string[]>();
  const childParentMap = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();
  const siblingMap = new Map<string, string[]>();
  
  coreRelationships.forEach(rel => {
    switch (rel.type) {
      case 'PARENTS_OF':
        if (!parentChildMap.has(rel.source)) parentChildMap.set(rel.source, []);
        parentChildMap.get(rel.source)!.push(rel.target);
        
        if (!childParentMap.has(rel.target)) childParentMap.set(rel.target, []);
        childParentMap.get(rel.target)!.push(rel.source);
        break;
        
      case 'MARRIED_TO':
        if (!spouseMap.has(rel.source)) spouseMap.set(rel.source, []);
        spouseMap.get(rel.source)!.push(rel.target);
        if (!spouseMap.has(rel.target)) spouseMap.set(rel.target, []);
        spouseMap.get(rel.target)!.push(rel.source);
        break;
        
      case 'SIBLING':
        if (!siblingMap.has(rel.source)) siblingMap.set(rel.source, []);
        siblingMap.get(rel.source)!.push(rel.target);
        if (!siblingMap.has(rel.target)) siblingMap.set(rel.target, []);
        siblingMap.get(rel.target)!.push(rel.source);
        break;
    }
  });
  
  const findFreePosition = (preferredX: number, preferredY: number): { x: number; y: number } => {
    let testX = preferredX;
    let testY = preferredY;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      const hasCollision = Array.from(positions.values()).some(pos => {
        const distance = Math.sqrt(
          Math.pow(pos.x - testX, 2) + Math.pow(pos.y - testY, 2)
        );
        return distance < MIN_NODE_SPACING;
      });

      if (!hasCollision) {
        return { x: testX, y: testY };
      }

      const angle = (attempts * 60) * (Math.PI / 180);
      const radius = 80 * (1 + Math.floor(attempts / 6));
      testX = preferredX + Math.cos(angle) * radius;
      testY = preferredY + Math.sin(angle) * radius;
      attempts++;
    }

    return { x: testX, y: testY };
  };
  
  const queue: Array<{ userId: string; fromUserId?: string; generation: number }> = [
    { userId: createdByUserId, generation: 0 }
  ];
  
  while (queue.length > 0) {
    const { userId, generation } = queue.shift()!;
    
    if (processedNodes.has(userId)) continue;
    processedNodes.add(userId);
    
    const currentPos = positions.get(userId) || { x: 0, y: generation * GENERATION_SPACING, generation };
    
    // Position spouses
    const spouses = spouseMap.get(userId) || [];
    spouses.forEach((spouseId, index) => {
      if (!processedNodes.has(spouseId)) {
        const spouseX = currentPos.x + MARRIAGE_SPACING;
        const freePos = findFreePosition(spouseX, currentPos.y);
        positions.set(spouseId, { x: freePos.x, y: freePos.y, generation });
        queue.push({ userId: spouseId, generation });
      }
    });
    
    // Position parents
    const parents = childParentMap.get(userId) || [];
    parents.forEach((parentId, index) => {
      if (!processedNodes.has(parentId)) {
        const parentX = currentPos.x + (index * SIBLING_SPACING) - ((parents.length - 1) * SIBLING_SPACING / 2);
        const parentGeneration = generation - 1;
        const freePos = findFreePosition(parentX, parentGeneration * GENERATION_SPACING);
        positions.set(parentId, { 
          x: freePos.x, 
          y: freePos.y, 
          generation: parentGeneration 
        });
        queue.push({ userId: parentId, generation: parentGeneration });
      }
    });
    
    // Position children
    const children = parentChildMap.get(userId) || [];
    children.forEach((childId, index) => {
      if (!processedNodes.has(childId)) {
        const childX = currentPos.x + (index * SIBLING_SPACING) - ((children.length - 1) * SIBLING_SPACING / 2);
        const childGeneration = generation + 1;
        const freePos = findFreePosition(childX, childGeneration * GENERATION_SPACING);
        positions.set(childId, { 
          x: freePos.x, 
          y: freePos.y, 
          generation: childGeneration 
        });
        queue.push({ userId: childId, generation: childGeneration });
      }
    });
    
    // Position siblings
    const siblings = siblingMap.get(userId) || [];
    siblings.forEach((siblingId, index) => {
      if (!processedNodes.has(siblingId)) {
        const siblingX = currentPos.x + ((index + 1) * SIBLING_SPACING);
        const freePos = findFreePosition(siblingX, currentPos.y);
        positions.set(siblingId, { x: freePos.x, y: freePos.y, generation });
        queue.push({ userId: siblingId, generation });
      }
    });
  }
  
  // Convert to compact nodes
  const nodes: Node[] = Array.from(positions.entries()).map(([userId, pos]) => {
    const member = nodeMap.get(userId)!;
    
    return {
      id: userId,
      type: 'familyMember',
      position: { x: pos.x + 600, y: pos.y + 300 }, // Adjusted for compact layout
      data: {
        name: member.name,
        email: member.email,
        relationship: member.relationship,
        profilePicture: member.profilePicture,
        gender: member.gender,
        userId: member.userId,
        loginUserId: loggedInUserId,
        isRoot: userId === createdByUserId,
        status: member.status
      }
    };
  });
  
  // Create edges - children now connect from marriage centers
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();
  
  coreRelationships.forEach(rel => {
    const sourcePos = positions.get(rel.source);
    const targetPos = positions.get(rel.target);
    
    if (!sourcePos || !targetPos) return;
    
    let edgeId = '';
    let edgeType = '';
    let style = {};
    let animated = false;
    
    switch (rel.type) {
      case 'MARRIED_TO':
        const marriageId1 = `${rel.source}-${rel.target}`;
        const marriageId2 = `${rel.target}-${rel.source}`;
        if (!edgeSet.has(marriageId1) && !edgeSet.has(marriageId2)) {
          edgeId = `marriage-${rel.source}-${rel.target}`;
          edgeType = 'marriage';
          style = { strokeWidth: 4 };
          animated = false;
          edgeSet.add(marriageId1);
          edgeSet.add(marriageId2);
        }
        break;
        
      case 'PARENTS_OF':
        edgeId = `parent-child-${rel.source}-${rel.target}`;
        edgeType = 'parentChild';
        style = { strokeWidth: 2 };
        break;
        
      case 'SIBLING':
        const siblingId1 = `${rel.source}-${rel.target}`;
        const siblingId2 = `${rel.target}-${rel.source}`;
        if (!edgeSet.has(siblingId1) && !edgeSet.has(siblingId2)) {
          edgeId = `sibling-${rel.source}-${rel.target}`;
          edgeType = 'sibling';
          style = { strokeWidth: 2 };
          edgeSet.add(siblingId1);
          edgeSet.add(siblingId2);
        }
        break;
    }
    
    if (edgeId && !edgeSet.has(edgeId)) {
      edges.push({
        id: edgeId,
        source: rel.source,
        target: rel.target,
        type: edgeType,
        animated,
        style,
        data: {
          relationship: rel.type,
          sourceName: rel.sourceName,
          targetName: rel.targetName
        }
      });
      edgeSet.add(edgeId);
    }
  });
  
  return { nodes, edges };
};

const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({ 
  user, 
  familyMembers,
  viewMode = 'personal',
  minHeight = '600px',
  showControls = true
}) => {
  const [coreRelationships, setCoreRelationships] = useState<CoreRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [relationshipDetailsOpen, setRelationshipDetailsOpen] = useState(false);
  
  // Calculate nodes and edges
  const { nodes: calculatedNodes, edges: calculatedEdges } = React.useMemo(() => {
    if (!coreRelationships.length || !familyMembers.length) {
      return { nodes: [], edges: [] };
    }
    
    const rootUserId = user.createdBy === 'self' ? user.userId : user.createdBy;
    return calculateNodePositions(familyMembers, coreRelationships, rootUserId, user.userId);
  }, [familyMembers, coreRelationships, user.createdBy, user.userId]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(calculatedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(calculatedEdges);
  
  // Update nodes and edges when calculated values change
  useEffect(() => {
    setNodes(calculatedNodes);
    setEdges(calculatedEdges);
  }, [calculatedNodes, calculatedEdges, setNodes, setEdges]);
  
  // Fetch core relationships
  useEffect(() => {
    const fetchRelationships = async () => {
      setIsLoading(true);
      try {
        let relationshipData: CoreRelationship[] = [];
        
        if (viewMode === 'personal') {
          const personalData = await getUserPersonalizedFamilyTree(user.userId, user.familyTreeId);
          relationshipData = personalData.map(rel => ({
            source: rel.source,
            target: rel.target,
            type: mapSemanticToCore(rel.type),
            sourceName: rel.sourceName,
            targetName: rel.targetName
          })).filter(rel => rel.type) as CoreRelationship[];
        } else {
          relationshipData = await getFamilyRelationships(user.familyTreeId);
        }
        
        setCoreRelationships(relationshipData);
      } catch (error) {
        console.error('Error fetching relationships:', error);
        setCoreRelationships([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRelationships();
  }, [user.userId, user.familyTreeId, viewMode]);
  
  // Helper function to map semantic relationship back to core relationship
  const mapSemanticToCore = (semanticType: string): 'PARENTS_OF' | 'SIBLING' | 'MARRIED_TO' | null => {
    const type = semanticType.toLowerCase();
    
    if (['father', 'mother', 'son', 'daughter', 'grandfather', 'grandmother', 'grandson', 'granddaughter'].includes(type)) {
      return 'PARENTS_OF';
    } else if (['husband', 'wife', 'spouse'].includes(type)) {
      return 'MARRIED_TO';
    } else if (['brother', 'sister', 'sibling'].includes(type)) {
      return 'SIBLING';
    }
    
    return null;
  };
  
  // Handle edge click to show relationship details
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setRelationshipDetailsOpen(true);
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight }}>
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full mx-auto mb-4 animate-bounce"></div>
          <p className="text-slate-600 font-medium">Loading family tree...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-xl border border-slate-200/60 shadow-lg overflow-hidden" style={{ height: minHeight }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ 
          padding: 0.1,
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 2
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
        className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        panOnScrollSpeed={0.5}
        zoomOnDoubleClick={false}
        minZoom={0.3}
        maxZoom={3}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background 
          color="#e2e8f0" 
          gap={24} 
          size={1}
          variant="dots"
          className="opacity-40"
        />
        {showControls && (
          <Controls 
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-lg shadow-md"
            showZoom={true}
            showFitView={true}
            showInteractive={false}
          />
        )}
      </ReactFlow>
      
      {/* Enhanced Relationship Details Dialog */}
      <Dialog open={relationshipDetailsOpen} onOpenChange={setRelationshipDetailsOpen}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border border-slate-200/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Heart className="w-5 h-5 text-rose-500" />
              Relationship Details
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Family connection information
            </DialogDescription>
          </DialogHeader>
          
          {selectedEdge && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200/40">
                <div className="text-lg font-semibold text-blue-800 capitalize">
                  {selectedEdge.data?.relationship === 'MARRIED_TO' ? 'Marriage' : 
                   selectedEdge.data?.relationship === 'PARENTS_OF' ? 'Parent-Child' : 
                   selectedEdge.data?.relationship === 'SIBLING' ? 'Sibling' : 
                   selectedEdge.type}
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  Direct family relationship
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium text-slate-700 mb-1">From</div>
                  <div className="text-slate-600 font-semibold">{selectedEdge.data?.sourceName || 'Unknown'}</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium text-slate-700 mb-1">To</div>
                  <div className="text-slate-600 font-semibold">{selectedEdge.data?.targetName || 'Unknown'}</div>
                </div>
              </div>
              
              <div className="text-xs text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200/40">
                <strong>Connection Type:</strong> {
                  selectedEdge.type === 'marriage' ? '💍 Marriage Bond' : 
                  selectedEdge.type === 'parentChild' ? '👨‍👩‍👧‍👦 Parent-Child Link' : 
                  selectedEdge.type === 'sibling' ? '👫 Sibling Connection' : 'Family Relation'
                }
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeVisualization;