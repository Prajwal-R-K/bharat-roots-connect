// src/components/FamilyTreeVisualization1.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
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

// Beautiful hierarchical family member node with improved styling
const FamilyMemberNode = ({ data, id, selected }: { data: any; id: string; selected?: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Helper function to compute display position with hierarchical layout
  const computeDisplayPosition = () => {
    const generation = data.generation || 0;
    const baseY = generation * 180; // Snap to generation rows
    
    // For siblings, center them horizontally with small gaps
    const siblingIndex = data.siblingIndex || 0;
    const siblingCount = data.siblingCount || 1;
    const siblingSpacing = 120;
    const baseX = (siblingIndex - (siblingCount - 1) / 2) * siblingSpacing;
    
    return { x: baseX, y: baseY };
  };

  const displayPos = computeDisplayPosition();

  const getNodeColor = (isRoot?: boolean, gender?: string, isCurrentUser?: boolean) => {
    if (isCurrentUser) return 'from-violet-500 via-purple-500 to-indigo-500';
    if (isRoot) return 'from-amber-400 via-yellow-400 to-orange-400';
    
    if (gender === 'male') return 'from-blue-400 via-sky-400 to-cyan-400';
    if (gender === 'female') return 'from-pink-400 via-rose-400 to-red-400';
    return 'from-slate-400 via-gray-400 to-zinc-400';
  };

  const getNodeShape = (gender?: string) => {
    return gender === 'female' ? 'rounded-full' : 'rounded-2xl';
  };

  const getStatusBadge = () => {
    const dotColor = data.status === 'invited' ? 'bg-yellow-400' : 'bg-green-400';
    return (
      <div className={`absolute -top-1 -right-1 w-3 h-3 ${dotColor} rounded-full border-2 border-white shadow-sm ${
        data.status === 'invited' ? 'animate-pulse' : ''
      }`} />
    );
  };

  const isCurrentUser = data.userId === data.loginUserId;
  const nodeShape = getNodeShape(data.gender);
  const hoverClass = isHovered ? 'scale-105 rotate-1 shadow-2xl' : '';
  const selectedClass = selected || data.isSelected ? 'ring-4 ring-blue-400 animate-pulse' : '';
  const highlightClass = data.isHighlighted ? 'ring-4 ring-yellow-400 shadow-yellow-300/50 scale-110' : '';

  return (
    <div 
      className={`group relative transition-all duration-300 cursor-pointer ${hoverClass} ${selectedClass} ${highlightClass}`}
      style={{
        transform: `translate(${displayPos.x}px, ${displayPos.y}px)`,
        zIndex: data.isSelected || data.isHighlighted ? 20 : 10
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${data.name}${data.relationship ? ` (${data.relationship})` : ''}${data.email ? ` - ${data.email}` : ''}`}
    >
      {/* Connection Handles */}
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

      {/* Main Node Card */}
      <div className={`relative bg-white ${nodeShape} border-2 border-white shadow-lg backdrop-blur-sm p-3 w-[120px] h-[160px] flex flex-col items-center justify-between bg-gradient-to-br ${getNodeColor(data.isRoot, data.gender, isCurrentUser)}`}>
        
        {getStatusBadge()}

        {/* Crown overlay for current user or root */}
        {(isCurrentUser || data.isRoot) && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <Crown className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Avatar Section */}
        <div className={`w-14 h-14 ${nodeShape} overflow-hidden border-2 border-white/50 shadow-inner`}>
          {data.profilePicture ? (
            <Avatar className={`w-full h-full ${nodeShape}`}>
              <AvatarImage src={data.profilePicture} className="object-cover" />
              <AvatarFallback className="text-xs font-bold text-white bg-transparent">
                {data.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white/80" />
            </div>
          )}
        </div>

        {/* Name and Info */}
        <div className="text-center space-y-1 text-white">
          <div className="font-bold text-sm leading-tight truncate max-w-[100px]">{data.name}</div>
          
          {/* Relationship Badge */}
          {data.relationship && !data.isRoot && !isCurrentUser && (
            <div className="text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
              {data.relationship.charAt(0).toUpperCase() + data.relationship.slice(1)}
            </div>
          )}
          
          {/* Generation Badge */}
          <div className="text-xs bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
            Gen {data.generation || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

// Beautiful animated couple node with side-by-side avatars and heart
const CoupleNode = ({ data, id, selected }: { data: any; id: string; selected?: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);

  const member1 = data.member1;
  const member2 = data.member2;

  // Helper function to compute display position with hierarchical layout
  const computeDisplayPosition = () => {
    const generation = data.generation || 0;
    const baseY = generation * 180; // Snap to generation rows
    
    const siblingIndex = data.siblingIndex || 0;
    const siblingCount = data.siblingCount || 1;
    const siblingSpacing = 120;
    const baseX = (siblingIndex - (siblingCount - 1) / 2) * siblingSpacing;
    
    return { x: baseX, y: baseY };
  };

  const displayPos = computeDisplayPosition();

  const getNodeColor = (member: any) => {
    const isRoot = member.isRoot;
    const gender = member.gender;
    const isCurrentUser = member.userId === data.loginUserId;
    if (isCurrentUser) return 'from-violet-500 via-purple-500 to-indigo-500';
    if (isRoot) return 'from-amber-400 via-yellow-400 to-orange-400';
    if (gender === 'male') return 'from-blue-400 via-sky-400 to-cyan-400';
    if (gender === 'female') return 'from-pink-400 via-rose-400 to-red-400';
    return 'from-slate-400 via-gray-400 to-zinc-400';
  };

  const getStatusBadge = (member: any) => {
    const dotColor = member.status === 'invited' ? 'bg-yellow-400' : 'bg-green-400';
    return (
      <div className={`absolute -top-1 w-3 h-3 ${dotColor} rounded-full border-2 border-white shadow-sm ${
        member.status === 'invited' ? 'animate-pulse' : ''
      }`} />
    );
  };

  const isCurrentUser1 = member1.userId === data.loginUserId;
  const isCurrentUser2 = member2.userId === data.loginUserId;
  const hoverClass = isHovered ? 'scale-105 rotate-1 shadow-2xl' : '';
  const selectedClass = selected || data.isSelected ? 'ring-4 ring-blue-400 animate-pulse' : '';
  const highlightClass = data.isHighlighted ? 'ring-4 ring-yellow-400 shadow-yellow-300/50 scale-110' : '';

  return (
    <div 
      className={`group relative transition-all duration-300 cursor-pointer ${hoverClass} ${selectedClass} ${highlightClass}`}
      style={{
        transform: `translate(${displayPos.x}px, ${displayPos.y}px)`,
        zIndex: data.isSelected || data.isHighlighted ? 20 : 10
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${member1.name} & ${member2.name}`}
    >
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="left"
        className="left-[25%] w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id="right"
        className="left-[75%] w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="children"
        className="left-[50%] w-2 h-2 bg-gradient-to-r from-green-400 to-blue-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />

      {/* Main Couple Container */}
      <div className="relative bg-white rounded-2xl border-2 border-white shadow-lg backdrop-blur-sm p-4 w-[240px] h-[160px] flex items-center justify-between bg-gradient-to-br from-rose-100 via-pink-50 to-red-100">
        
        {/* Left Member */}
        <div className="flex flex-col items-center space-y-2 relative">
          {getStatusBadge(member1)}
          <div className={`w-12 h-12 ${member1.gender === 'female' ? 'rounded-full' : 'rounded-2xl'} overflow-hidden border-2 border-white/50 shadow-inner bg-gradient-to-br ${getNodeColor(member1)} animate-pulse`}>
            {member1.profilePicture ? (
              <Avatar className={`w-full h-full ${member1.gender === 'female' ? 'rounded-full' : 'rounded-2xl'}`}>
                <AvatarImage src={member1.profilePicture} className="object-cover" />
                <AvatarFallback className="text-xs font-bold text-white bg-transparent">
                  {member1.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-white/80" />
              </div>
            )}
          </div>
          
          {/* Crown for current user */}
          {isCurrentUser1 && (
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Crown className="w-2 h-2 text-white" />
            </div>
          )}
          
          <div className="text-center">
            <div className="font-bold text-sm text-slate-800 truncate max-w-[80px]">{member1.name}</div>
          </div>
        </div>

        {/* Animated Heart Center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-pink-400 to-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
          💕
        </div>

        {/* Right Member */}
        <div className="flex flex-col items-center space-y-2 relative">
          {getStatusBadge(member2)}
          <div className={`w-12 h-12 ${member2.gender === 'female' ? 'rounded-full' : 'rounded-2xl'} overflow-hidden border-2 border-white/50 shadow-inner bg-gradient-to-br ${getNodeColor(member2)} animate-pulse`}>
            {member2.profilePicture ? (
              <Avatar className={`w-full h-full ${member2.gender === 'female' ? 'rounded-full' : 'rounded-2xl'}`}>
                <AvatarImage src={member2.profilePicture} className="object-cover" />
                <AvatarFallback className="text-xs font-bold text-white bg-transparent">
                  {member2.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-white/80" />
              </div>
            )}
          </div>
          
          {/* Crown for current user */}
          {isCurrentUser2 && (
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Crown className="w-2 h-2 text-white" />
            </div>
          )}
          
          <div className="text-center">
            <div className="font-bold text-sm text-slate-800 truncate max-w-[80px]">{member2.name}</div>
          </div>
        </div>

        {/* Generation Badge */}
        <div className="absolute top-2 left-2 text-xs font-bold text-slate-500 bg-white/80 px-2 py-1 rounded-full shadow-sm">
          Gen {data.generation || 0}
        </div>
      </div>
    </div>
  );
};

// Beautiful animated parent-child edge with flowing gradient and emoji
const ParentChildEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {}, source, target, data }: any) => {
  // Create smooth cubic-bezier curve for downward flow
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const edgePath = `M ${sourceX},${sourceY} C ${sourceX},${midY} ${targetX},${midY} ${targetX},${targetY}`;
  
  return (
    <>
      <defs>
        <linearGradient id={`parent-gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6">
            <animate attributeName="stop-color" values="#3b82f6;#06b6d4;#8b5cf6;#3b82f6" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#8b5cf6">
            <animate attributeName="stop-color" values="#8b5cf6;#06b6d4;#3b82f6;#8b5cf6" dur="5s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#1d4ed8">
            <animate attributeName="stop-color" values="#1d4ed8;#7c3aed;#0ea5e9;#1d4ed8" dur="4s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        
        <marker id={`parent-arrow-${id}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
          <polygon points="0,0 0,8 8,4" fill="url(#parent-gradient-${id})" />
        </marker>
      </defs>
      
      {/* Main animated path */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 3,
          stroke: `url(#parent-gradient-${id})`,
          strokeLinecap: 'round',
          strokeDasharray: '8,4',
          filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={`url(#parent-arrow-${id})`}
      >
        <animate attributeName="stroke-dashoffset" values="0;-24;0" dur="3s" repeatCount="indefinite" />
      </path>
      
      {/* Emoji label at midpoint */}
      <foreignObject x={midX - 10} y={midY - 10} width="20" height="20">
        <div className="text-sm animate-bounce">👨‍👩‍👧</div>
      </foreignObject>
    </>
  );
};

// Beautiful curved sibling edge with dashed animation and emoji
const SiblingEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {} }: any) => {
  const centerX = (sourceX + targetX) / 2;
  const centerY = Math.min(sourceY, targetY) - 40; // Arc above both nodes
  
  const edgePath = `M ${sourceX},${sourceY} Q ${centerX},${centerY} ${targetX},${targetY}`;
  
  return (
    <>
      <defs>
        <linearGradient id={`sibling-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6">
            <animate attributeName="stop-color" values="#8b5cf6;#a855f7;#ec4899;#8b5cf6" dur="4s" repeatCount="indefinite" />
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
        className="react-flow__edge-path animate-dash"
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
  couple: CoupleNode,
};

// Beautiful straight marriage edge with heart and dashed animation
const MarriageEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {} }: any) => {
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  return (
    <>
      <defs>
        <linearGradient id={`marriage-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f472b6">
            <animate attributeName="stop-color" values="#f472b6;#ec4899;#be185d;#f472b6" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#ec4899">
            <animate attributeName="stop-color" values="#ec4899;#be185d;#f472b6;#ec4899" dur="4s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#be185d">
            <animate attributeName="stop-color" values="#be185d;#f472b6;#ec4899;#be185d" dur="2s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>
      
      {/* Straight dashed marriage line */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 3,
          stroke: `url(#marriage-gradient-${id})`,
          strokeLinecap: 'round',
          strokeDasharray: '10,5',
          filter: 'drop-shadow(0 2px 4px rgba(236, 72, 153, 0.4))'
        }}
        className="react-flow__edge-path"
        d={`M ${sourceX},${sourceY} L ${targetX},${targetY}`}
      >
        <animate attributeName="stroke-dashoffset" values="0;-30;0" dur="2s" repeatCount="indefinite" />
      </path>
      
      {/* Heart emoji at midpoint */}
      <foreignObject x={midX - 10} y={midY - 10} width="20" height="20">
        <div className="text-sm animate-heartBeat">💕</div>
      </foreignObject>
    </>
  );
};

const edgeTypes = {
  parentChild: ParentChildEdge,
  sibling: SiblingEdge,
  marriage: MarriageEdge,
};

// Enhanced position calculation with better spacing and alignment
const calculateNodePositions = (
  members: FamilyMember[], 
  coreRelationships: CoreRelationship[], 
  createdByUserId: string,
  loggedInUserId: string
): { nodes: Node[]; edges: Edge[] } => {
  const nodeMap = new Map<string, FamilyMember>();
  members.forEach(member => nodeMap.set(member.userId, member));
  
  // Identify couples
  const spouseMap = new Map<string, string[]>();
  coreRelationships.forEach(rel => {
    if (rel.type === 'MARRIED_TO') {
      if (!spouseMap.has(rel.source)) spouseMap.set(rel.source, []);
      spouseMap.get(rel.source)!.push(rel.target);
      if (!spouseMap.has(rel.target)) spouseMap.set(rel.target, []);
      spouseMap.get(rel.target)!.push(rel.source);
    }
  });

  const couples = new Map<string, {member1: string; member2: string}>();
  const coupleMap = new Map<string, string>();
  spouseMap.forEach((spouses, id) => {
    spouses.forEach(spouse => {
      const sortedIds = [id, spouse].sort();
      const pair = sortedIds.join('-');
      if (!couples.has(pair)) {
        let m1 = nodeMap.get(sortedIds[0])!;
        let m2 = nodeMap.get(sortedIds[1])!;
        // Sort by gender: male left if possible
        if ((m2.gender === 'male' && m1.gender !== 'male') || (m1.gender !== 'male' && m2.gender === 'female')) {
          [m1, m2] = [m2, m1];
        }
        couples.set(pair, {member1: m1.userId, member2: m2.userId});
      }
      coupleMap.set(id, pair);
      coupleMap.set(spouse, pair);
    });
  });

  const getGroupId = (id: string) => coupleMap.get(id) || id;
  const isCouple = (gid: string) => couples.has(gid);
  const getNodeWidth = (gid: string) => isCouple(gid) ? 200 : 100;

  const positions = new Map<string, { x: number; y: number; generation: number }>();
  const processedGroups = new Set<string>();
  
  // Improved spacing constants for better readability and alignment
  const GENERATION_SPACING = 250;
  const BASE_SPACING = 220;
  const MIN_NODE_SPACING = 180;
  
  // Start with root group
  const rootGroup = getGroupId(createdByUserId);
  positions.set(rootGroup, { x: 0, y: 0, generation: 0 });
  
  // Build relationship maps (individual level)
  const parentChildMap = new Map<string, string[]>();
  const childParentMap = new Map<string, string[]>();
  const siblingMap = new Map<string, string[]>();
  
  coreRelationships.forEach(rel => {
    switch (rel.type) {
      case 'PARENTS_OF':
        if (!parentChildMap.has(rel.source)) parentChildMap.set(rel.source, []);
        parentChildMap.get(rel.source)!.push(rel.target);
        
        if (!childParentMap.has(rel.target)) childParentMap.set(rel.target, []);
        childParentMap.get(rel.target)!.push(rel.source);
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
    const maxAttempts = 20;

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

      const angle = (attempts * 45) * (Math.PI / 180);
      const radius = 100 * (1 + Math.floor(attempts / 8));
      testX = preferredX + Math.cos(angle) * radius;
      testY = preferredY + Math.sin(angle) * radius;
      attempts++;
    }

    return { x: testX, y: testY };
  };
  
  const queue: Array<{ groupId: string; generation: number }> = [
    { groupId: rootGroup, generation: 0 }
  ];
  
  while (queue.length > 0) {
    const { groupId, generation } = queue.shift()!;
    
    if (processedGroups.has(groupId)) continue;
    processedGroups.add(groupId);
    
    const currentPos = positions.get(groupId)!;
    const members = isCouple(groupId) ? [couples.get(groupId)!.member1, couples.get(groupId)!.member2] : [groupId];
    
    // Position parents
    let allParents: string[] = [];
    members.forEach(m => {
      const parents = childParentMap.get(m) || [];
      allParents = [...new Set([...allParents, ...parents])];
    });
    if (allParents.length > 0) {
      let totalSpan = 0;
      allParents.forEach(pId => totalSpan += getNodeWidth(getGroupId(pId)));
      totalSpan += (allParents.length - 1) * BASE_SPACING;
      let startX = currentPos.x - totalSpan / 2;
      allParents.forEach((parentId) => {
        const parentGroup = getGroupId(parentId);
        if (!positions.has(parentGroup)) {
          const parentGen = generation - 1;
          const thisWidth = getNodeWidth(parentGroup);
          const preferredX = startX + thisWidth / 2;
          const freePos = findFreePosition(preferredX, parentGen * GENERATION_SPACING);
          positions.set(parentGroup, { x: freePos.x, y: freePos.y, generation: parentGen });
          queue.push({ groupId: parentGroup, generation: parentGen });
          startX += thisWidth + BASE_SPACING;
        }
      });
    }
    
    // Position children
    let allChildren: string[] = [];
    members.forEach(m => {
      const children = parentChildMap.get(m) || [];
      allChildren = [...new Set([...allChildren, ...children])];
    });
    if (allChildren.length > 0) {
      let totalSpan = 0;
      allChildren.forEach(cId => totalSpan += getNodeWidth(getGroupId(cId)));
      totalSpan += (allChildren.length - 1) * BASE_SPACING;
      let startX = currentPos.x - totalSpan / 2;
      allChildren.forEach((childId) => {
        const childGroup = getGroupId(childId);
        if (!positions.has(childGroup)) {
          const childGen = generation + 1;
          const thisWidth = getNodeWidth(childGroup);
          const preferredX = startX + thisWidth / 2;
          const freePos = findFreePosition(preferredX, childGen * GENERATION_SPACING);
          positions.set(childGroup, { x: freePos.x, y: freePos.y, generation: childGen });
          queue.push({ groupId: childGroup, generation: childGen });
          startX += thisWidth + BASE_SPACING;
        }
      });
    }
    
    // Position siblings
    let allSiblings: string[] = [];
    members.forEach(m => {
      const sibs = siblingMap.get(m) || [];
      allSiblings = [...new Set([...allSiblings, ...sibs.filter(s => !members.includes(s))])];
    });
    if (allSiblings.length > 0) {
      let totalSpan = 0;
      allSiblings.forEach(sId => totalSpan += getNodeWidth(getGroupId(sId)));
      totalSpan += (allSiblings.length - 1) * BASE_SPACING;
      let startX = currentPos.x - totalSpan / 2;
      allSiblings.forEach((sibId, index) => {
        const sibGroup = getGroupId(sibId);
        if (!positions.has(sibGroup)) {
          const thisWidth = getNodeWidth(sibGroup);
          const preferredX = startX + thisWidth / 2 + (index % 2 === 0 ? BASE_SPACING : -BASE_SPACING);
          const freePos = findFreePosition(preferredX, currentPos.y);
          positions.set(sibGroup, { x: freePos.x, y: freePos.y, generation });
          queue.push({ groupId: sibGroup, generation });
          startX += thisWidth + BASE_SPACING;
        }
      });
    }
  }
  
  // Create nodes
  const nodes: Node[] = [];
  positions.forEach((pos, groupId) => {
    if (isCouple(groupId)) {
      const {member1: m1Id, member2: m2Id} = couples.get(groupId)!;
      const m1 = nodeMap.get(m1Id)!;
      const m2 = nodeMap.get(m2Id)!;
      nodes.push({
        id: groupId,
        type: 'couple',
        position: { x: pos.x + 600, y: pos.y + 300 },
        data: {
          member1: { ...m1, userId: m1Id, isRoot: m1Id === createdByUserId, generation: pos.generation, loginUserId: loggedInUserId, isSelected: false },
          member2: { ...m2, userId: m2Id, isRoot: m2Id === createdByUserId, generation: pos.generation, loginUserId: loggedInUserId, isSelected: false },
          isSelected: false
        }
      });
    } else {
      const m = nodeMap.get(groupId)!;
      nodes.push({
        id: groupId,
        type: 'familyMember',
        position: { x: pos.x + 600, y: pos.y + 300 },
        data: { ...m, isRoot: groupId === createdByUserId, generation: pos.generation, loginUserId: loggedInUserId, isSelected: false }
      });
    }
  });
  
  // Create edges
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();
  
  coreRelationships.forEach(rel => {
    if (rel.type === 'MARRIED_TO') return;
    
    const sourceGroup = getGroupId(rel.source);
    const targetGroup = getGroupId(rel.target);
    if (sourceGroup === targetGroup) return;
    
    let edgeId = `${rel.type}-${rel.source}-${rel.target}`;
    if (edgeSet.has(edgeId)) return;
    
    const edge: Edge = {
      id: edgeId,
      source: sourceGroup,
      target: targetGroup,
      type: rel.type === 'PARENTS_OF' ? 'parentChild' : 'sibling',
      animated: true,
      style: { strokeWidth: 2 },
      data: {
        relationship: rel.type,
        sourceName: rel.sourceName,
        targetName: rel.targetName
      }
    };
    
    if (isCouple(sourceGroup)) {
      edge.sourceHandle = 'children';
    }
    
    if (isCouple(targetGroup)) {
      const {member1, member2} = couples.get(targetGroup)!;
      edge.targetHandle = rel.target === member1 ? 'left' : 'right';
    }
    
    if (rel.type === 'SIBLING') {
      const sorted = [sourceGroup, targetGroup].sort().join('-');
      if (edgeSet.has(sorted)) return;
      edge.id = `sibling-${sorted}`;
      edgeSet.add(sorted);
    } else {
      edgeSet.add(edgeId);
    }
    
    edges.push(edge);
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
  const [selectedCouple, setSelectedCouple] = useState<string | null>(null);
  const [coupleDetailsOpen, setCoupleDetailsOpen] = useState(false);
  
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
    
    if (node.type === 'couple') {
      setSelectedCouple(node.id);
      setCoupleDetailsOpen(true);
      return;
    }
    
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
  
  // Get selected couple details
  const getSelectedCoupleDetails = () => {
    if (!selectedCouple) return null;
    const node = nodes.find(n => n.id === selectedCouple);
    if (!node || node.type !== 'couple') return null;
    return {
      member1: familyMembers.find(m => m.userId === (node.data.member1 as any)?.userId),
      member2: familyMembers.find(m => m.userId === (node.data.member2 as any)?.userId)
    };
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
          padding: 0.15,
          includeHiddenNodes: false,
          minZoom: 0.4,
          maxZoom: 2.5
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
          variant={BackgroundVariant.Dots}
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
      
      {/* Couple Details Dialog */}
      <Dialog open={coupleDetailsOpen} onOpenChange={setCoupleDetailsOpen}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-sm border border-slate-200/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Heart className="w-5 h-5 text-pink-500" />
              Couple Details
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Information about the selected couple
            </DialogDescription>
          </DialogHeader>
          
          {(() => {
            const couple = getSelectedCoupleDetails();
            if (!couple) return null;
            
            const { member1, member2 } = couple;
            
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200/40">
                    <div className="text-lg font-semibold text-blue-800">{member1.name}</div>
                    <div className="text-sm text-blue-600 mt-1">
                      {member1.relationship || 'Family Member'}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200/40">
                    <div className="text-lg font-semibold text-blue-800">{member2.name}</div>
                    <div className="text-sm text-blue-600 mt-1">
                      {member2.relationship || 'Family Member'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    {member1.email && (
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-700">{member1.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Badge variant="outline" className={`${
                        member1.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                        member1.status === 'invited' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {member1.status === 'active' ? '✓ Active' : 
                         member1.status === 'invited' ? '⏳ Invited' : 
                         '❓ Unknown'}
                      </Badge>
                    </div>
                    {member1.gender && (
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-500">Gender:</span>
                        <span className="text-slate-700 capitalize">{member1.gender}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {member2.email && (
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-700">{member2.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <Badge variant="outline" className={`${
                        member2.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                        member2.status === 'invited' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {member2.status === 'active' ? '✓ Active' : 
                         member2.status === 'invited' ? '⏳ Invited' : 
                         '❓ Unknown'}
                      </Badge>
                    </div>
                    {member2.gender && (
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-500">Gender:</span>
                        <span className="text-slate-700 capitalize">{member2.gender}</span>
                      </div>
                    )}
                  </div>
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
                  <div className="text-slate-600 font-semibold">{(selectedEdge.data as any)?.sourceName || 'Unknown'}</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium text-slate-700 mb-1">To</div>
                  <div className="text-slate-600 font-semibold">{(selectedEdge.data as any)?.targetName || 'Unknown'}</div>
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