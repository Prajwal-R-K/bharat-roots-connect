// src/components/FamilyTreeVisualization.tsx
import React, { useState } from 'react';
import { Handle, Position, Node, Edge, useNodes, useEdges } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Plus, User, Crown, Heart, Calendar, Mail, Phone, Users } from 'lucide-react';

export interface FamilyMemberNode extends Node {
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
    spouseId?: string;
    parentIds?: string[];
    childIds?: string[];
    status?: string;
  };
}

// Enhanced node component with better visual hierarchy and interactions
export const FamilyNode = ({ data, id, selected }: { data: any; id: string; selected?: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getNodeColor = (relationship?: string, isRoot?: boolean, gender?: string) => {
    if (isRoot) return 'from-purple-600 via-purple-500 to-indigo-600';
    
    const baseColors = {
      parent: gender === 'male' ? 'from-blue-500 via-blue-400 to-cyan-500' : 'from-pink-500 via-pink-400 to-rose-500',
      child: gender === 'male' ? 'from-green-500 via-emerald-400 to-teal-500' : 'from-yellow-500 via-orange-400 to-red-500',
      spouse: 'from-red-500 via-pink-500 to-rose-600',
      sibling: gender === 'male' ? 'from-indigo-500 via-purple-400 to-violet-500' : 'from-purple-500 via-fuchsia-400 to-pink-500'
    };

    switch (relationship) {
      case 'father':
      case 'mother':
        return baseColors.parent;
      case 'son':
      case 'daughter':
        return baseColors.child;
      case 'husband':
      case 'wife':
        return baseColors.spouse;
      case 'brother':
      case 'sister':
        return baseColors.sibling;
      default:
        return 'from-gray-500 via-slate-400 to-gray-600';
    }
  };

  const getRelationshipIcon = (relationship?: string, isRoot?: boolean) => {
    if (isRoot) return <Crown className="w-6 h-6 text-yellow-300" />;
    
    switch (relationship) {
      case 'father':
      case 'mother':
        return <Users className="w-6 h-6 text-white" />;
      case 'husband':
      case 'wife':
        return <Heart className="w-6 h-6 text-white" />;
      default:
        return <User className="w-6 h-6 text-white" />;
    }
  };

  const getBorderStyle = () => {
    if (selected) return 'border-4 border-blue-400 shadow-2xl shadow-blue-200';
    if (isHovered) return 'border-3 border-purple-300 shadow-xl shadow-purple-100';
    return 'border-2 border-slate-200 shadow-lg';
  };

  const getStatusBadge = () => {
    if (data.status === 'invited') {
      return (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-md">
          Invited
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className={`relative bg-white ${getBorderStyle()} rounded-2xl p-5 w-[240px] h-[320px] flex flex-col justify-between transition-all duration-300 hover:scale-105 cursor-pointer`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 border-3 border-white shadow-lg" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-4 h-4 bg-gradient-to-r from-green-500 to-blue-500 border-3 border-white shadow-lg" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 border-3 border-white shadow-lg" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 border-3 border-white shadow-lg" 
      />

      {getStatusBadge()}

      <div className="flex flex-col items-center space-y-4">
        {/* Avatar */}
        <div className={`w-20 h-20 bg-gradient-to-br ${getNodeColor(data.relationship, data.isRoot, data.gender)} rounded-full flex items-center justify-center shadow-xl ring-4 ring-white`}>
          {getRelationshipIcon(data.relationship, data.isRoot)}
        </div>

        {/* Main Info */}
        <div className="text-center space-y-2">
          <div className="font-bold text-slate-800 text-lg">{data.name}</div>
          
          {/* Contact Info */}
          <div className="space-y-1">
            {data.email && (
              <div className="flex items-center justify-center text-xs text-slate-600 space-x-1">
                <Mail className="w-3 h-3" />
                <span className="truncate max-w-[160px]">{data.email}</span>
              </div>
            )}
            {data.phone && (
              <div className="flex items-center justify-center text-xs text-slate-600 space-x-1">
                <Phone className="w-3 h-3" />
                <span>{data.phone}</span>
              </div>
            )}
            {data.dateOfBirth && (
              <div className="flex items-center justify-center text-xs text-slate-600 space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{data.dateOfBirth}</span>
              </div>
            )}
          </div>

          {/* Relationship Badge */}
          {data.relationship && !data.isRoot && (
            <div className="inline-flex items-center text-xs font-semibold text-white px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-md">
              {data.relationship.charAt(0).toUpperCase() + data.relationship.slice(1)}
            </div>
          )}
          
          {data.isRoot && (
            <div className="inline-flex items-center text-xs font-semibold text-white px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-md">
              <Crown className="w-3 h-3 mr-1" />
              Root
            </div>
          )}

          {/* Marriage Info */}
          {data.marriageStatus && data.marriageDate && (
            <div className="text-xs text-slate-500 bg-pink-50 px-2 py-1 rounded-full">
              💍 {data.marriageStatus} {data.marriageDate && `on ${data.marriageDate}`}
            </div>
          )}
        </div>
      </div>

      {/* Add Relation Button */}
      <Button
        size="sm"
        variant="outline"
        className="w-10 h-10 rounded-full p-0 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white border-2 border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg self-center"
        onClick={() => {
          console.log('Adding relation for node:', id);
          data.onAddRelation && data.onAddRelation(id);
        }}
      >
        <Plus className="w-5 h-5" />
      </Button>

      {/* Generation Indicator */}
      <div className="absolute top-2 left-2 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
        G{data.generation}
      </div>
    </div>
  );
};

export const nodeTypes = {
  familyMember: FamilyNode,
};

// Enhanced Marriage Edge Component with better visual design
export const MarriageEdge = ({ id, sourceX, sourceY, targetX, targetY, source, target, style = {} }: any) => {
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;
  
  // Dynamic arch height based on distance for smoother curve
  const distance = Math.abs(targetX - sourceX);
  const archHeight = Math.max(30, Math.min(60, distance / 4));
  const controlPointY = centerY - archHeight;
  const edgePath = `M ${sourceX},${centerY} Q ${centerX},${controlPointY} ${targetX},${centerY}`;
  
  // Position connector on the central heart
  const connectorY = controlPointY - 8;

  return (
    <>
      <defs>
        <linearGradient id={`marriage-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        
        <filter id={`marriage-glow-${id}`}>
          <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
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
          strokeWidth: 8,
          stroke: `url(#marriage-gradient-${id})`,
          filter: `url(#marriage-glow-${id})`,
        }}
        className="react-flow__edge-path animate-pulse"
        d={edgePath}
      />
      
      {/* Multiple heart symbols */}
      <g>
        <text
          x={centerX - 20}
          y={controlPointY - 5}
          textAnchor="middle"
          style={{ fontSize: '18px', fill: '#ef4444', fontWeight: 'bold' }}
        >
          💕
        </text>
        <text
          x={centerX}
          y={controlPointY - 8}
          textAnchor="middle"
          style={{ fontSize: '24px', fill: '#ef4444', fontWeight: 'bold' }}
        >
          💍
        </text>
        <text
          x={centerX + 20}
          y={controlPointY - 5}
          textAnchor="middle"
          style={{ fontSize: '18px', fill: '#ef4444', fontWeight: 'bold' }}
        >
          💕
        </text>
      </g>
    </>
  );
};

// Enhanced Parent-Child Edge Component with better routing
export const ParentChildEdge = ({ id, sourceX, sourceY, targetX, targetY, data, style = {}, source, target }: any) => {
  let marriageCenterX;
  let marriageCenterY;

  if (data?.isFromMarriage) {
    const edges = useEdges();
    const marriageEdge = edges.find(e => (e.source === source || e.target === source) && e.type === 'marriage');
    if (marriageEdge) {
      const spouseId = marriageEdge.source === source ? marriageEdge.target : marriageEdge.source;
      const nodes = useNodes<FamilyMemberNode>();
      const sourceNode = nodes.find(n => n.id === source);
      const spouseNode = nodes.find(n => n.id === spouseId);
      if (sourceNode && spouseNode) {
        const leftNode = sourceNode.position.x < spouseNode.position.x ? sourceNode : spouseNode;
        const rightNode = sourceNode.position.x < spouseNode.position.x ? spouseNode : sourceNode;
        const leftHandleX = leftNode.position.x + (leftNode.width || 240);
        const leftHandleY = leftNode.position.y + (leftNode.height || 320) / 2;
        const rightHandleX = rightNode.position.x;
        const rightHandleY = rightNode.position.y + (rightNode.height || 320) / 2;
        const centerX = (leftHandleX + rightHandleX) / 2;
        const centerY = (leftHandleY + rightHandleY) / 2;
        const distance = Math.abs(rightHandleX - leftHandleX);
        const archHeight = Math.max(30, Math.min(60, distance / 4));
        const controlPointY = centerY - archHeight;
        marriageCenterX = centerX;
        marriageCenterY = controlPointY - 8;
      }
    }
  }

  // For children from marriage
  if (data?.isFromMarriage && marriageCenterX !== undefined && marriageCenterY !== undefined) {
    const dropDistance = 120;
    const horizontalDistance = 60;
    
    const intermediateY = marriageCenterY + dropDistance;
    
    // Create smooth L-shaped path
    const edgePath = `
      M ${marriageCenterX},${marriageCenterY}
      L ${marriageCenterX},${intermediateY - horizontalDistance}
      Q ${marriageCenterX},${intermediateY} ${marriageCenterX + (targetX > marriageCenterX ? horizontalDistance : -horizontalDistance)},${intermediateY}
      L ${targetX - (targetX > marriageCenterX ? horizontalDistance : -horizontalDistance)},${intermediateY}
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
          
          <marker id={`child-arrow-${id}`} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
            <polygon points="0,0 0,12 12,6" fill="#22c55e" />
          </marker>
        </defs>
        
        <path
          id={id}
          style={{
            ...style,
            strokeWidth: 4,
            stroke: `url(#child-gradient-${id})`,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={`url(#child-arrow-${id})`}
        />
        
        {/* Connection indicators */}
        <circle
          cx={marriageCenterX}
          cy={marriageCenterY}
          r="5"
          fill="#22c55e"
          stroke="white"
          strokeWidth="2"
          className="drop-shadow-md"
        />
        
        <circle
          cx={targetX}
          cy={intermediateY}
          r="3"
          fill="#10b981"
          stroke="white"
          strokeWidth="1"
        />
      </>
    );
  }
  
  // Standard parent-child connection with improved curve
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
        
        <marker id={`parent-arrow-${id}`} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
          <polygon points="0,0 0,10 10,5" fill="#1d4ed8" />
        </marker>
      </defs>
      
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 3,
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
export const SiblingEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {} }: any) => {
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2 - 40; // Arc above
  
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
          strokeWidth: 3,
          stroke: `url(#sibling-gradient-${id})`,
          strokeDasharray: '8,4',
          strokeLinecap: 'round',
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />
      
      <text
        x={centerX}
        y={centerY - 5}
        textAnchor="middle"
        style={{ fontSize: '14px', fill: '#8b5cf6', fontWeight: 'bold' }}
      >
        👫
      </text>
    </>
  );
};

export const edgeTypes = {
  marriage: MarriageEdge,
  parentChild: ParentChildEdge,
  sibling: SiblingEdge,
};

// Enhanced generation calculation with proper hierarchy
export const calculateGeneration = (
  relationship: string, 
  rootGeneration: number, 
  referenceGeneration: number
): number => {
  const relationshipHierarchy = {
    // Parents go up one generation
    'father': referenceGeneration - 1,
    'mother': referenceGeneration - 1,
    'grandfather': referenceGeneration - 2,
    'grandmother': referenceGeneration - 2,
    
    // Children go down one generation
    'son': referenceGeneration + 1,
    'daughter': referenceGeneration + 1,
    'grandson': referenceGeneration + 2,
    'granddaughter': referenceGeneration + 2,
    
    // Same generation relationships
    'husband': referenceGeneration,
    'wife': referenceGeneration,
    'brother': referenceGeneration,
    'sister': referenceGeneration,
    'cousin': referenceGeneration,
    
    // Extended family
    'uncle': referenceGeneration - 1,
    'aunt': referenceGeneration - 1,
    'nephew': referenceGeneration + 1,
    'niece': referenceGeneration + 1,
  };

  return relationshipHierarchy[relationship as keyof typeof relationshipHierarchy] || referenceGeneration;
};

// Significantly enhanced position calculation with better spacing and collision detection
export const calculateOptimalPosition = (
  parentNode: Node,
  relationship: string,
  existingNodes: Node[],
  edges: Edge[]
): { x: number; y: number } => {
  const parentPos = parentNode.position;
  const parentGeneration = Number(parentNode.data?.generation) || 0;
  const newGeneration = calculateGeneration(relationship, 0, parentGeneration);
  
  // Enhanced spacing constants for better visual hierarchy
  const GENERATION_SPACING = 350;
  const SIBLING_SPACING = 300;
  const MARRIAGE_SPACING = 500;
  const PARENT_SPACING = 320;
  const MIN_NODE_SPACING = 280;
  const COLLISION_PADDING = 50;

  // Calculate base Y position with improved spacing
  const baseY = parentPos.y + (newGeneration - parentGeneration) * GENERATION_SPACING;

  // Helper function to check for collisions and find free space
  const findFreePosition = (preferredX: number, preferredY: number): { x: number; y: number } => {
    let testX = preferredX;
    let testY = preferredY;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      const hasCollision = existingNodes.some(node => {
        const distance = Math.sqrt(
          Math.pow(node.position.x - testX, 2) + Math.pow(node.position.y - testY, 2)
        );
        return distance < MIN_NODE_SPACING;
      });

      if (!hasCollision) {
        return { x: testX, y: testY };
      }

      // Try different positions in a spiral pattern
      const angle = (attempts * 60) * (Math.PI / 180); // 60 degrees increment
      const radius = COLLISION_PADDING * (1 + Math.floor(attempts / 6));
      testX = preferredX + Math.cos(angle) * radius;
      testY = preferredY + Math.sin(angle) * radius;
      attempts++;
    }

    return { x: testX, y: testY };
  };

  // Handle different relationship types with improved positioning
  switch (relationship) {
    case 'husband':
    case 'wife': {
      // Position spouse with better horizontal spacing
      const spouseOffset = relationship === 'husband' ? -MARRIAGE_SPACING : MARRIAGE_SPACING;
      const preferredX = parentPos.x + spouseOffset;
      return findFreePosition(preferredX, parentPos.y);
    }

    case 'father':
    case 'mother': {
      // Position parents above with proper spacing and gender-based positioning
      const existingParents = existingNodes.filter(node => 
        Number(node.data?.generation) === newGeneration && 
        ['father', 'mother'].includes(node.data?.relationship as string)
      );
      
      let parentOffset;
      if (existingParents.length === 0) {
        // First parent - position based on gender preference
        parentOffset = relationship === 'father' ? -PARENT_SPACING / 2 : PARENT_SPACING / 2;
      } else {
        // Second parent - position on opposite side
        const existingParent = existingParents[0];
        const existingOffset = existingParent.position.x - parentPos.x;
        parentOffset = existingOffset > 0 ? -PARENT_SPACING : PARENT_SPACING;
      }
      
      const preferredX = parentPos.x + parentOffset;
      return findFreePosition(preferredX, baseY);
    }

    case 'son':
    case 'daughter': {
      // Enhanced child positioning with marriage center awareness
      const marriageCenter = findMarriageCenter(parentNode.id, edges, existingNodes);
      const baseX = marriageCenter ? marriageCenter.x : parentPos.x;
      
      // Get existing children at this generation
      const existingChildren = existingNodes.filter(node => 
        node.data?.generation === newGeneration &&
        ['son', 'daughter'].includes(node.data?.relationship as string)
      );
      
      // Calculate child position with better distribution
      const childrenCount = existingChildren.length;
      let childOffset = 0;
      
      if (childrenCount === 0) {
        childOffset = 0; // Center first child
      } else {
        // Distribute children evenly around center
        const totalWidth = childrenCount * SIBLING_SPACING;
        const startOffset = -totalWidth / 2 + SIBLING_SPACING / 2;
        childOffset = startOffset + childrenCount * SIBLING_SPACING;
      }
      
      const preferredX = baseX + childOffset;
      return findFreePosition(preferredX, baseY);
    }

    case 'brother':
    case 'sister': {
      // Enhanced sibling positioning with better spacing
      const existingSiblings = existingNodes.filter(node => 
        node.data?.generation === newGeneration && 
        ['brother', 'sister', 'husband', 'wife'].includes(node.data?.relationship as string) &&
        node.id !== parentNode.id
      );
      
      // Find the best position for new sibling
      let siblingOffset = SIBLING_SPACING;
      let attempts = 0;
      
      // Try positions to the right first, then left
      while (attempts < 10) {
        const testX = parentPos.x + (attempts % 2 === 0 ? siblingOffset : -siblingOffset);
        const hasConflict = existingSiblings.some(node => 
          Math.abs(node.position.x - testX) < MIN_NODE_SPACING / 2
        );
        
        if (!hasConflict) {
          return findFreePosition(testX, parentPos.y);
        }
        
        siblingOffset += SIBLING_SPACING / 2;
        attempts++;
      }
      
      return findFreePosition(parentPos.x + SIBLING_SPACING, parentPos.y);
    }

    default: {
      // Default positioning for extended family with generation awareness
      const sameGenerationNodes = existingNodes.filter(node => 
        node.data?.generation === newGeneration
      );
      
      const offset = sameGenerationNodes.length * SIBLING_SPACING;
      const preferredX = parentPos.x + offset;
      
      return findFreePosition(preferredX, baseY);
    }
  }
};

// Enhanced function to find marriage center with better calculation
export const findMarriageCenter = (nodeId: string, edges: Edge[], nodes: Node[]): { x: number; y: number } | null => {
  const marriageEdge = edges.find(e => 
    (e.source === nodeId || e.target === nodeId) && e.type === 'marriage'
  );
  
  if (!marriageEdge) return null;
  
  const sourceNode = nodes.find(n => n.id === marriageEdge.source);
  const targetNode = nodes.find(n => n.id === marriageEdge.target);
  
  if (!sourceNode || !targetNode) return null;
  
  // Calculate center point with node dimensions consideration
  const nodeWidth = 240; // Average node width
  const nodeHeight = 320; // Average node height
  
  const centerX = (sourceNode.position.x + targetNode.position.x) / 2 + nodeWidth / 2;
  const centerY = (sourceNode.position.y + targetNode.position.y) / 2 + nodeHeight / 2;
  
  return { x: centerX, y: centerY };
};

// Function to create marriage edge between two nodes
export const createMarriageEdge = (node1Id: string, node2Id: string): Edge => {
  return {
    id: `marriage-${node1Id}-${node2Id}`,
    source: node1Id,
    target: node2Id,
    type: 'marriage',
    style: { strokeWidth: 6 },
    data: { isMarriage: true },
    animated: true
  };
};

// Function to create parent-child edge with enhanced routing
export const createParentChildEdge = (
  parentId: string, 
  childId: string, 
  isFromMarriage: boolean = false
): Edge => {
  return {
    id: `parent-child-${parentId}-${childId}`,
    source: parentId,
    target: childId,
    type: 'parentChild',
    data: {
      isFromMarriage
    }
  };
};

// Function to create sibling edge
export const createSiblingEdge = (node1Id: string, node2Id: string): Edge => {
  return {
    id: `sibling-${node1Id}-${node2Id}`,
    source: node1Id,
    target: node2Id,
    type: 'sibling',
    style: { strokeWidth: 3 },
    data: { isSibling: true }
  };
};

// Significantly enhanced auto-layout function with improved spacing
export const autoLayoutFamilyTree = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
  const layoutNodes = [...nodes];
  const layoutEdges = [...edges];
  
  // Find root node
  const rootNode = nodes.find(node => node.data?.isRoot) || nodes[0];
  if (!rootNode) return { nodes: layoutNodes, edges: layoutEdges };
  
  // Group nodes by generation
  const nodesByGeneration = new Map<number, Node[]>();
  nodes.forEach(node => {
    const generation = Number(node.data?.generation) || 0;
    if (!nodesByGeneration.has(generation)) {
      nodesByGeneration.set(generation, []);
    }
    nodesByGeneration.get(generation)!.push(node);
  });
  
  // Enhanced layout algorithm
  const GENERATION_Y_SPACING = 400;
  const BASE_X_SPACING = 300;
  const MARRIAGE_PAIR_SPACING = 540;
  
  // Sort generations
  const sortedGenerations = Array.from(nodesByGeneration.keys()).sort((a, b) => a - b);
  
  sortedGenerations.forEach((generation) => {
    const generationNodes = nodesByGeneration.get(generation)!;
    const baseY = rootNode.position.y + (generation * GENERATION_Y_SPACING);
    
    // Group married pairs
    const marriedPairs: Node[][] = [];
    const singleNodes: Node[] = [];
    const processedNodes = new Set<string>();
    
    generationNodes.forEach(node => {
      if (processedNodes.has(node.id)) return;
      
      const marriageEdge = edges.find(e => 
        (e.source === node.id || e.target === node.id) && e.type === 'marriage'
      );
      
      if (marriageEdge) {
        const spouseId = marriageEdge.source === node.id ? marriageEdge.target : marriageEdge.source;
        const spouseNode = generationNodes.find(n => n.id === spouseId);
        
        if (spouseNode && !processedNodes.has(spouseNode.id)) {
          marriedPairs.push([node, spouseNode]);
          processedNodes.add(node.id);
          processedNodes.add(spouseNode.id);
        } else if (!processedNodes.has(node.id)) {
          singleNodes.push(node);
          processedNodes.add(node.id);
        }
      } else {
        singleNodes.push(node);
        processedNodes.add(node.id);
      }
    });
    
    // Calculate total width needed
    const totalPairs = marriedPairs.length;
    const totalSingles = singleNodes.length;
    const totalWidth = (totalPairs * MARRIAGE_PAIR_SPACING) + (totalSingles * BASE_X_SPACING);
    const startX = rootNode.position.x - (totalWidth / 2);
    
    // Position married pairs with improved spacing
    let currentX = startX;
    marriedPairs.forEach(([node1, node2]) => {
      const nodeInLayout1 = layoutNodes.find(n => n.id === node1.id);
      const nodeInLayout2 = layoutNodes.find(n => n.id === node2.id);
      
      if (nodeInLayout1 && nodeInLayout2) {
        // Position husband on left, wife on right (or maintain existing order)
        const leftNode = node1.data?.relationship === 'husband' ? nodeInLayout1 : nodeInLayout2;
        const rightNode = node1.data?.relationship === 'husband' ? nodeInLayout2 : nodeInLayout1;
        
        leftNode.position = { x: currentX, y: baseY };
        rightNode.position = { x: currentX + 440, y: baseY };
        
        currentX += MARRIAGE_PAIR_SPACING;
      }
    });
    
    // Position single nodes
    singleNodes.forEach(node => {
      const nodeInLayout = layoutNodes.find(n => n.id === node.id);
      if (nodeInLayout) {
        nodeInLayout.position = { x: currentX, y: baseY };
        currentX += BASE_X_SPACING;
      }
    });
  });
  
  return { nodes: layoutNodes, edges: layoutEdges };
};

// Helper function to validate family relationships with enhanced checks
export const validateRelationship = (
  newRelationship: string,
  parentNode: Node,
  existingNodes: Node[]
): { isValid: boolean; message?: string } => {
  const parentData = parentNode.data;
  
  // Check for conflicting spouse relationships
  if (['husband', 'wife'].includes(newRelationship)) {
    const existingSpouses = existingNodes.filter(node => 
      ['husband', 'wife'].includes(node.data?.relationship as string) &&
      node.data?.generation === parentData.generation
    );
    
    if (existingSpouses.length > 0) {
      return {
        isValid: false,
        message: 'This person already has a spouse. Consider adding as divorced/separated spouse or remove existing marriage first.'
      };
    }
  }
  
  // Check for duplicate parent relationships
  if (['father', 'mother'].includes(newRelationship)) {
    const existingParent = existingNodes.find(node => 
      node.data?.relationship === newRelationship &&
      Number(node.data?.generation) === (Number(parentData.generation) - 1)
    );
    
    if (existingParent) {
      return {
        isValid: false,
        message: `A ${newRelationship} already exists for this person.`
      };
    }
    
    // Check if already has 2 parents
    const existingParents = existingNodes.filter(node => 
      ['father', 'mother'].includes(node.data?.relationship as string) &&
      Number(node.data?.generation) === (Number(parentData.generation) - 1)
    );
    
    if (existingParents.length >= 2) {
      return {
        isValid: false,
        message: 'This person already has two parents. Consider adding step-parents or grandparents instead.'
      };
    }
  }
  
  // Validate generation consistency
  const expectedGeneration = calculateGeneration(newRelationship, 0, Number(parentData.generation));
  const conflictingNodes = existingNodes.filter(node => 
    node.data?.generation === expectedGeneration &&
    node.data?.relationship === newRelationship
  );
  
  if (conflictingNodes.length > 3) { // Allow multiple siblings/cousins
    return {
      isValid: false,
      message: `Too many ${newRelationship}s at this generation level. Consider organizing the family tree.`
    };
  }
  
  return { isValid: true };
};

// Helper function to remove conflicting edges with improved logic
export const removeConflictingEdges = (childNodeId: string, setEdges: any) => {
  setEdges((edges: Edge[]) => 
    edges.filter(edge => {
      // Keep marriage edges
      if (edge.type === 'marriage') return true;
      
      // Remove old parent-child edges to this child
      if (edge.target === childNodeId && edge.type === 'parentChild') {
        return false;
      }
      
      return true;
    })
  );
};

// Utility function to get family statistics
export const getFamilyTreeStats = (nodes: Node[], edges: Edge[]) => {
  const stats = {
    totalMembers: nodes.length,
    generations: new Set(nodes.map(n => n.data?.generation || 0)).size,
    marriages: edges.filter(e => e.type === 'marriage').length,
    relationships: edges.filter(e => e.type === 'parentChild').length,
    pendingInvitations: nodes.filter(n => n.data?.status === 'invited').length,
  };
  
  return stats;
};

// Utility function to highlight related nodes
export const highlightRelatedNodes = (selectedNodeId: string, nodes: Node[], edges: Edge[]) => {
  const relatedNodeIds = new Set<string>();
  relatedNodeIds.add(selectedNodeId);
  
  // Find all directly connected nodes
  edges.forEach(edge => {
    if (edge.source === selectedNodeId) {
      relatedNodeIds.add(edge.target);
    }
    if (edge.target === selectedNodeId) {
      relatedNodeIds.add(edge.source);
    }
  });
  
  return nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      isHighlighted: relatedNodeIds.has(node.id),
      isSelected: node.id === selectedNodeId
    }
  }));
};

export default FamilyNode;