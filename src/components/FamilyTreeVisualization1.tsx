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
import { Heart, Crown, User as UserIcon, Users, Plus, Mail, Phone, Calendar, X } from "lucide-react";

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

// Enhanced compact family member node component with selection
const FamilyMemberNode = ({ data, id, selected }: { data: any; id: string; selected?: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getNodeColor = (isRoot?: boolean, gender?: string, isCurrentUser?: boolean) => {
    if (isCurrentUser) return 'from-violet-500 via-purple-500 to-indigo-500';
    if (isRoot) return 'from-amber-400 via-yellow-400 to-orange-400';
    
    if (gender === 'male') return 'from-blue-400 via-sky-400 to-cyan-400';
    if (gender === 'female') return 'from-pink-400 via-rose-400 to-red-400';
    return 'from-slate-400 via-gray-400 to-zinc-400';
  };

  const getRelationshipIcon = (relationship?: string, isRoot?: boolean, isCurrentUser?: boolean) => {
    if (isCurrentUser) return <Crown className="w-4 h-4 text-yellow-200" />;
    if (isRoot) return <Crown className="w-4 h-4 text-yellow-200" />;
    
    switch (relationship) {
      case 'father':
      case 'mother':
        return <Users className="w-4 h-4 text-white" />;
      case 'husband':
      case 'wife':
        return <Heart className="w-4 h-4 text-white" />;
      default:
        return <UserIcon className="w-4 h-4 text-white" />;
    }
  };

  const getBorderStyle = () => {
    if (data.isSelected) return 'border-4 border-blue-500 shadow-2xl shadow-blue-300/60 ring-2 ring-blue-200';
    if (selected) return 'border-3 border-blue-400 shadow-xl shadow-blue-200/50';
    if (isHovered) return 'border-2 border-purple-300 shadow-lg shadow-purple-100/50';
    return 'border border-slate-200/60 shadow-md';
  };

  const getStatusBadge = () => {
    if (data.status === 'invited') {
      return (
        <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold shadow-sm animate-pulse">
          !
        </div>
      );
    }
    return null;
  };

  const isCurrentUser = data.userId === data.loginUserId;

  return (
    <div 
      className={`group relative bg-white ${getBorderStyle()} rounded-xl p-3 w-[140px] h-[180px] flex flex-col justify-between transition-all duration-300 hover:scale-110 cursor-pointer backdrop-blur-sm ${
        data.isSelected ? 'animate-pulse z-10' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${data.name}${data.relationship ? ` (${data.relationship})` : ''}${data.email ? ` - ${data.email}` : ''}`}
    >
      {/* Connection Handles - Smaller and more subtle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-2 h-2 bg-gradient-to-r from-green-400 to-blue-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-2 h-2 bg-gradient-to-r from-red-400 to-pink-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-2 h-2 bg-gradient-to-r from-red-400 to-pink-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />

      {getStatusBadge()}

      {/* Selection indicator */}
      {data.isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold animate-bounce">
          ✓
        </div>
      )}

      <div className="flex flex-col items-center space-y-2">
        {/* Compact Avatar */}
        <div className={`w-12 h-12 bg-gradient-to-br ${getNodeColor(data.isRoot, data.gender, isCurrentUser)} rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/80 ${
          data.isSelected ? 'ring-4 ring-blue-300 animate-pulse' : ''
        }`}>
          {data.profilePicture ? (
            <Avatar className="w-12 h-12">
              <AvatarImage src={data.profilePicture} />
              <AvatarFallback className="text-xs font-semibold text-white">
                {data.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            getRelationshipIcon(data.relationship, data.isRoot, isCurrentUser)
          )}
        </div>

        {/* Compact Info */}
        <div className="text-center space-y-1">
          <div className="font-semibold text-slate-800 text-xs leading-tight truncate max-w-[120px]">{data.name}</div>
          
          {/* Compact Contact Info */}
          {data.email && (
            <div className="text-xs text-slate-500 truncate max-w-[120px]" title={data.email}>
              {data.email.split('@')[0]}
            </div>
          )}

          {/* Compact Relationship Badge */}
          {data.relationship && !data.isRoot && !isCurrentUser && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
              {data.relationship.charAt(0).toUpperCase() + data.relationship.slice(1)}
            </Badge>
          )}
          
          {(data.isRoot || isCurrentUser) && (
            <div className="inline-flex items-center text-xs font-semibold text-white px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-sm">
              <Crown className="w-2 h-2 mr-1" />
              {isCurrentUser ? 'You' : 'Root'}
            </div>
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

// Enhanced Marriage Edge Component with better animations
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
          <stop offset="0%" stopColor="#ec4899">
            <animate attributeName="stop-color" values="#ec4899;#f97316;#ec4899" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#ef4444">
            <animate attributeName="stop-color" values="#ef4444;#dc2626;#ef4444" dur="2s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#ec4899">
            <animate attributeName="stop-color" values="#ec4899;#f97316;#ec4899" dur="3s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        
        <linearGradient id={`marriage-gradient-hover-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        
        <filter id={`marriage-glow-${id}`}>
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <filter id={`marriage-sparkle-${id}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feOffset in="coloredBlur" dx="1" dy="1" result="offsetBlur"/>
          <feMerge> 
            <feMergeNode in="offsetBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Animated background glow */}
      <path
        style={{
          strokeWidth: 8,
          stroke: `url(#marriage-gradient-${id})`,
          opacity: 0.3,
          filter: `url(#marriage-sparkle-${id})`,
        }}
        className="react-flow__edge-path animate-pulse"
        d={edgePath}
      />
      
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: isHovered ? 6 : 4,
          stroke: isHovered ? `url(#marriage-gradient-hover-${id})` : `url(#marriage-gradient-${id})`,
          strokeDasharray: isHovered ? '16,12' : '12,8',
          strokeLinecap: 'round',
          filter: isHovered ? `url(#marriage-glow-${id})` : 'none',
        }}
        className={`react-flow__edge-path transition-all duration-300 ${isHovered ? 'animate-pulse' : ''}`}
        d={edgePath}
      >
        <animate attributeName="stroke-dashoffset" values="0;-40;0" dur="4s" repeatCount="indefinite" />
      </path>
      
      {/* Enhanced diamond ring with animations */}
      <g transform={`translate(${centerX}, ${controlPointY - 12})`}>
        <circle
          r={isHovered ? "12" : "8"}
          fill="url(#marriage-gradient-${id})"
          className="transition-all duration-300"
        >
          <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
        </circle>
        <text
          textAnchor="middle"
          dominantBaseline="central"
          style={{ 
            fontSize: isHovered ? '24px' : '20px', 
            transition: 'all 0.3s ease'
          }}
          className="pointer-events-none"
        >
          💍
          <animateTransform 
            attributeName="transform" 
            type="rotate" 
            values="0;360;0" 
            dur="6s" 
            repeatCount="indefinite"
          />
        </text>
        {/* Sparkle effects */}
        <g>
          <text x="-15" y="-10" style={{ fontSize: '12px' }} className="animate-ping">✨</text>
          <text x="15" y="-8" style={{ fontSize: '10px' }} className="animate-pulse">💫</text>
          <text x="-12" y="12" style={{ fontSize: '8px' }} className="animate-bounce">⭐</text>
        </g>
      </g>
    </g>
  );
};

// Enhanced Parent-Child Edge Component with animations
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
    // Route from marriage center to child with animations
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
            <stop offset="0%" stopColor="#3b82f6">
              <animate attributeName="stop-color" values="#3b82f6;#06b6d4;#3b82f6" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#22c55e">
              <animate attributeName="stop-color" values="#22c55e;#10b981;#22c55e" dur="2s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#10b981">
              <animate attributeName="stop-color" values="#10b981;#059669;#10b981" dur="3s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          
          <marker id={`child-arrow-${id}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
            <polygon points="0,0 0,8 8,4" fill="#22c55e" />
          </marker>

          <filter id={`child-glow-${id}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
            strokeWidth: 3,
            stroke: `url(#child-gradient-${id})`,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            filter: `url(#child-glow-${id})`,
            strokeDasharray: '8,4',
          }}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={`url(#child-arrow-${id})`}
        >
          <animate attributeName="stroke-dashoffset" values="0;-24;0" dur="3s" repeatCount="indefinite" />
        </path>
        
        <circle
          cx={marriageCenter.x}
          cy={marriageCenter.y}
          r="4"
          fill="#22c55e"
          stroke="white"
          strokeWidth="2"
          className="drop-shadow-sm"
        >
          <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
        </circle>
      </>
    );
  }
  
  // Standard parent-child connection with animations
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
          <stop offset="0%" stopColor="#3b82f6">
            <animate attributeName="stop-color" values="#3b82f6;#06b6d4;#3b82f6" dur="4s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#1d4ed8">
            <animate attributeName="stop-color" values="#1d4ed8;#1e40af;#1d4ed8" dur="3s" repeatCount="indefinite" />
          </stop>
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
          strokeDasharray: '6,3',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={`url(#parent-arrow-${id})`}
      >
        <animate attributeName="stroke-dashoffset" values="0;-18;0" dur="4s" repeatCount="indefinite" />
      </path>
    </>
  );
};

// Enhanced Sibling Edge Component with animations
const SiblingEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {} }: any) => {
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2 - 30;
  
  const edgePath = `M ${sourceX},${sourceY} Q ${centerX},${centerY} ${targetX},${targetY}`;
  
  return (
    <>
      <defs>
        <linearGradient id={`sibling-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6">
            <animate attributeName="stop-color" values="#8b5cf6;#a855f7;#8b5cf6" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#a855f7">
            <animate attributeName="stop-color" values="#a855f7;#9333ea;#a855f7" dur="2s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#8b5cf6">
            <animate attributeName="stop-color" values="#8b5cf6;#a855f7;#8b5cf6" dur="3s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>
      
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: `url(#sibling-gradient-${id})`,
          strokeDasharray: '8,4',
          strokeLinecap: 'round',
        }}
        className="react-flow__edge-path"
        d={edgePath}
      >
        <animate attributeName="stroke-dashoffset" values="0;-24;0" dur="3s" repeatCount="indefinite" />
      </path>
      
      <text
        x={centerX}
        y={centerY - 5}
        textAnchor="middle"
        style={{ fontSize: '14px', fill: '#8b5cf6', fontWeight: 'bold' }}
        className="pointer-events-none animate-bounce"
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
        status: member.status,
        generation: pos.generation,
        isSelected: false
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

// Relationship calculation function
const calculateRelationship = (
  person1Id: string, 
  person2Id: string, 
  coreRelationships: CoreRelationship[], 
  familyMembers: FamilyMember[]
): string => {
  const person1 = familyMembers.find(m => m.userId === person1Id);
  const person2 = familyMembers.find(m => m.userId === person2Id);
  
  if (!person1 || !person2) return 'Unknown relationship';

  // Build relationship maps for analysis
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

  // Check direct relationships first
  if (spouseMap.get(person1Id)?.includes(person2Id)) {
    return `${person1.name} and ${person2.name} are married to each other`;
  }
  
  if (parentChildMap.get(person1Id)?.includes(person2Id)) {
    return `${person1.name} is the parent of ${person2.name}`;
  }
  
  if (childParentMap.get(person1Id)?.includes(person2Id)) {
    return `${person1.name} is the child of ${person2.name}`;
  }
  
  if (siblingMap.get(person1Id)?.includes(person2Id)) {
    return `${person1.name} and ${person2.name} are siblings`;
  }

  // Check for extended relationships using BFS
  const visited = new Set<string>();
  const queue: Array<{id: string, path: string[], relationship: string}> = [
    {id: person1Id, path: [person1Id], relationship: 'self'}
  ];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    
    if (current.id === person2Id && current.path.length > 1) {
      // Found the target, analyze the path
      return analyzeRelationshipPath(current.path, familyMembers, coreRelationships);
    }
    
    if (current.path.length > 6) continue; // Limit search depth
    
    // Add connected people to queue
    const connections = [
      ...(parentChildMap.get(current.id) || []),
      ...(childParentMap.get(current.id) || []),
      ...(spouseMap.get(current.id) || []),
      ...(siblingMap.get(current.id) || [])
    ];
    
    connections.forEach(connectedId => {
      if (!visited.has(connectedId)) {
        queue.push({
          id: connectedId,
          path: [...current.path, connectedId],
          relationship: 'extended'
        });
      }
    });
  }
  
  return `${person1.name} and ${person2.name} appear to be distantly related or not directly connected`;
};

const analyzeRelationshipPath = (
  path: string[], 
  familyMembers: FamilyMember[], 
  coreRelationships: CoreRelationship[]
): string => {
  if (path.length < 2) return 'No relationship';
  
  const person1 = familyMembers.find(m => m.userId === path[0]);
  const person2 = familyMembers.find(m => m.userId === path[path.length - 1]);
  
  if (!person1 || !person2) return 'Unknown relationship';
  
  // Simplified relationship analysis based on path length and connections
  if (path.length === 3) {
    // Could be grandparent-grandchild, aunt/uncle-niece/nephew, etc.
    return `${person1.name} and ${person2.name} are likely grandparent-grandchild or aunt/uncle-niece/nephew`;
  } else if (path.length === 4) {
    return `${person1.name} and ${person2.name} are likely cousins or great-grandparent-great-grandchild`;
  } else if (path.length > 4) {
    return `${person1.name} and ${person2.name} are distantly related (${path.length - 1} degrees of separation)`;
  }
  
  return `${person1.name} and ${person2.name} are related through the family tree`;
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
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
  const [relationshipAnalysisOpen, setRelationshipAnalysisOpen] = useState(false);
  const [calculatedRelationship, setCalculatedRelationship] = useState<string>('');
  
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
  
  // Handle node click for selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    
    if (selectedNodes.includes(node.id)) {
      // Deselect if already selected
      const newSelection = selectedNodes.filter(id => id !== node.id);
      setSelectedNodes(newSelection);
      
      // Update node selection state
      setNodes(nodes => nodes.map(n => ({
        ...n,
        data: { ...n.data, isSelected: newSelection.includes(n.id) }
      })));
      
      if (newSelection.length === 0) {
        setNodeDetailsOpen(false);
        setRelationshipAnalysisOpen(false);
      }
    } else if (selectedNodes.length < 2) {
      // Select node (max 2)
      const newSelection = [...selectedNodes, node.id];
      setSelectedNodes(newSelection);
      
      // Update node selection state
      setNodes(nodes => nodes.map(n => ({
        ...n,
        data: { ...n.data, isSelected: newSelection.includes(n.id) }
      })));
      
      if (newSelection.length === 1) {
        setNodeDetailsOpen(true);
      } else if (newSelection.length === 2) {
        // Calculate relationship between two nodes
        const relationship = calculateRelationship(
          newSelection[0], 
          newSelection[1], 
          coreRelationships, 
          familyMembers
        );
        setCalculatedRelationship(relationship);
        setRelationshipAnalysisOpen(true);
        setNodeDetailsOpen(false);
      }
    }
  }, [selectedNodes, nodes, setNodes, coreRelationships, familyMembers]);
  
  // Handle edge click to show relationship details
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setRelationshipDetailsOpen(true);
  }, []);
  
  // Handle pane click to deselect all
  const onPaneClick = useCallback(() => {
    setSelectedNodes([]);
    setNodes(nodes => nodes.map(n => ({
      ...n,
      data: { ...n.data, isSelected: false }
    })));
    setNodeDetailsOpen(false);
    setRelationshipAnalysisOpen(false);
  }, [setNodes]);
  
  // Get selected node details
  const getSelectedNodeDetails = () => {
    if (selectedNodes.length !== 1) return null;
    const node = nodes.find(n => n.id === selectedNodes[0]);
    return node ? familyMembers.find(m => m.userId === node.id) : null;
  };
  
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
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
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
      
      {/* Node Details Dialog */}
      <Dialog open={nodeDetailsOpen} onOpenChange={setNodeDetailsOpen}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border border-slate-200/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <UserIcon className="w-5 h-5 text-blue-500" />
              Family Member Details
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Information about the selected family member
            </DialogDescription>
          </DialogHeader>
          
          {(() => {
            const member = getSelectedNodeDetails();
            if (!member) return null;
            
            return (
              <div className="space-y-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200/40">
                  <div className="text-lg font-semibold text-blue-800">{member.name}</div>
                  <div className="text-sm text-blue-600 mt-1">
                    {member.relationship || 'Family Member'}
                  </div>
                </div>
                
                <div className="space-y-3 text-sm">
                  {member.email && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-700">{member.email}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <Badge variant="outline" className={`${
                      member.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                      member.status === 'invited' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {member.status === 'active' ? '✓ Active' : 
                       member.status === 'invited' ? '⏳ Invited' : 
                       '❓ Unknown'}
                    </Badge>
                  </div>
                  
                  {member.gender && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-500">Gender:</span>
                      <span className="text-slate-700 capitalize">{member.gender}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      
      {/* Relationship Analysis Dialog */}
      <Dialog open={relationshipAnalysisOpen} onOpenChange={setRelationshipAnalysisOpen}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-sm border border-slate-200/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Users className="w-5 h-5 text-purple-500" />
              Relationship Analysis
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Analysis of the relationship between selected family members
            </DialogDescription>
          </DialogHeader>
          
          {selectedNodes.length === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {selectedNodes.map((nodeId, index) => {
                  const member = familyMembers.find(m => m.userId === nodeId);
                  if (!member) return null;
                  
                  return (
                    <div key={nodeId} className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200/40">
                      <div className="font-semibold text-purple-800">{member.name}</div>
                      <div className="text-xs text-purple-600 mt-1">
                        {member.relationship || 'Family Member'}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200/40">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Relationship Analysis
                </h4>
                <p className="text-blue-700 text-sm leading-relaxed">
                  {calculatedRelationship}
                </p>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setRelationshipAnalysisOpen(false);
                    setSelectedNodes([]);
                    setNodes(nodes => nodes.map(n => ({
                      ...n,
                      data: { ...n.data, isSelected: false }
                    })));
                  }}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Close Analysis
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
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