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
    if (isCurrentUser) return <Crown className="w-3 h-3 text-yellow-200" />;
    if (isRoot) return <Crown className="w-3 h-3 text-yellow-200" />;
    
    switch (relationship) {
      case 'father':
      case 'mother':
        return <Users className="w-3 h-3 text-white" />;
      case 'husband':
      case 'wife':
        return <Heart className="w-3 h-3 text-white" />;
      default:
        return <UserIcon className="w-3 h-3 text-white" />;
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
        <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] px-1 py-0.5 rounded-full font-semibold shadow-sm animate-pulse">
          !
        </div>
      );
    }
    return null;
  };

  const isCurrentUser = data.userId === data.loginUserId;

  return (
    <div 
      className={`group relative bg-white ${getBorderStyle()} rounded-xl p-2 w-[100px] h-[140px] flex flex-col justify-between transition-all duration-300 hover:scale-110 cursor-pointer backdrop-blur-sm animate-fadeIn ${
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
        className="w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-purple-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-1.5 h-1.5 bg-gradient-to-r from-green-400 to-blue-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-1.5 h-1.5 bg-gradient-to-r from-red-400 to-pink-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-1.5 h-1.5 bg-gradient-to-r from-red-400 to-pink-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />

      {getStatusBadge()}

      {/* Selection indicator */}
      {data.isSelected && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold animate-bounce">
          ✓
        </div>
      )}

      <div className="flex flex-col items-center space-y-1">
        {/* Compact Avatar */}
        <div className={`w-10 h-10 bg-gradient-to-br ${getNodeColor(data.isRoot, data.gender, isCurrentUser)} rounded-full flex items-center justify-center shadow-lg ring-1 ring-white/80 ${
          data.isSelected ? 'ring-3 ring-blue-300 animate-pulse' : ''
        }`}>
          {data.profilePicture ? (
            <Avatar className="w-10 h-10">
              <AvatarImage src={data.profilePicture} />
              <AvatarFallback className="text-[10px] font-semibold text-white">
                {data.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            getRelationshipIcon(data.relationship, data.isRoot, isCurrentUser)
          )}
        </div>

        {/* Compact Info */}
        <div className="text-center space-y-0.5">
          <div className="font-semibold text-slate-800 text-[10px] leading-tight truncate max-w-[90px]">{data.name}</div>
          
          {/* Compact Contact Info */}
          {data.email && (
            <div className="text-[9px] text-slate-500 truncate max-w-[90px]" title={data.email}>
              {data.email.split('@')[0]}
            </div>
          )}

          {/* Compact Relationship Badge */}
          {data.relationship && !data.isRoot && !isCurrentUser && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0.5 h-auto">
              {data.relationship.charAt(0).toUpperCase() + data.relationship.slice(1)}
            </Badge>
          )}
          
          {(data.isRoot || isCurrentUser) && (
            <div className="inline-flex items-center text-[9px] font-semibold text-white px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-sm">
              <Crown className="w-2 h-2 mr-0.5" />
              {isCurrentUser ? 'You' : 'Root'}
            </div>
          )}
        </div>
      </div>

      {/* Compact Generation Indicator */}
      <div className="absolute top-1 left-1 text-[9px] font-bold text-slate-400 bg-slate-100/80 px-1 py-0.5 rounded-full">
        G{data.generation || 0}
      </div>
    </div>
  );
};

const CoupleNode = ({ data, id, selected }: { data: any; id: string; selected?: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);

  const member1 = data.member1;
  const member2 = data.member2;

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

  const getRelationshipIcon = (member: any) => {
    const relationship = member.relationship;
    const isRoot = member.isRoot;
    const isCurrentUser = member.userId === data.loginUserId;
    if (isCurrentUser) return <Crown className="w-3 h-3 text-yellow-200" />;
    if (isRoot) return <Crown className="w-3 h-3 text-yellow-200" />;
    switch (relationship) {
      case 'father':
      case 'mother':
        return <Users className="w-3 h-3 text-white" />;
      case 'husband':
      case 'wife':
        return <Heart className="w-3 h-3 text-white" />;
      default:
        return <UserIcon className="w-3 h-3 text-white" />;
    }
  };

  const getBorderStyle = () => {
    if (data.isSelected) return 'border-4 border-blue-500 shadow-2xl shadow-blue-300/60 ring-2 ring-blue-200';
    if (selected) return 'border-3 border-blue-400 shadow-xl shadow-blue-200/50';
    if (isHovered) return 'border-2 border-purple-300 shadow-lg shadow-purple-100/50';
    return 'border border-slate-200/60 shadow-md';
  };

  const getStatusBadge = (member: any) => {
    if (member.status === 'invited') {
      return (
        <div className="absolute -top-1 bg-yellow-500 text-white text-[10px] px-1 py-0.5 rounded-full font-semibold shadow-sm animate-pulse">
          !
        </div>
      );
    }
    return null;
  };

  const isRoot = member1.isRoot || member2.isRoot;
  const isCurrentUser1 = member1.userId === data.loginUserId;
  const isCurrentUser2 = member2.userId === data.loginUserId;

  return (
    <div 
      className={`group relative bg-white ${getBorderStyle()} rounded-xl p-2 w-[200px] h-[140px] flex flex-row items-center justify-between transition-all duration-300 hover:scale-110 cursor-pointer backdrop-blur-sm animate-fadeIn ${
        data.isSelected ? 'animate-pulse z-10' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${member1.name} & ${member2.name}`}
    >
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="left"
        className="left-[25%] w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-purple-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id="right"
        className="left-[75%] w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-purple-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="children"
        className="left-[50%] w-1.5 h-1.5 bg-gradient-to-r from-green-400 to-blue-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-1.5 h-1.5 bg-gradient-to-r from-red-400 to-pink-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-1.5 h-1.5 bg-gradient-to-r from-red-400 to-pink-400 border border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" 
      />

      {/* Left Member */}
      <div className="flex flex-col items-center w-[45%] space-y-1 relative">
        {getStatusBadge(member1)}
        <div className={`w-10 h-10 bg-gradient-to-br ${getNodeColor(member1)} rounded-full flex items-center justify-center shadow-lg ring-1 ring-white/80 animate-spinSlow`}>
          {member1.profilePicture ? (
            <Avatar className="w-10 h-10">
              <AvatarImage src={member1.profilePicture} />
              <AvatarFallback className="text-[10px] font-semibold text-white">
                {member1.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            getRelationshipIcon(member1)
          )}
        </div>
        <div className="text-center space-y-0.5">
          <div className="font-semibold text-slate-800 text-[10px] leading-tight truncate max-w-[80px]">{member1.name}</div>
          {member1.email && (
            <div className="text-[9px] text-slate-500 truncate max-w-[80px]" title={member1.email}>
              {member1.email.split('@')[0]}
            </div>
          )}
          {isCurrentUser1 && (
            <div className="inline-flex items-center text-[9px] font-semibold text-white px-1 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-sm">
              <Crown className="w-2 h-2 mr-0.5" />
              You
            </div>
          )}
        </div>
      </div>

      {/* Heart Icon with animation */}
      <Heart className="absolute top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-pink-500 z-10 animate-heartBeat" fill="currentColor" />

      {/* Right Member */}
      <div className="flex flex-col items-center w-[45%] space-y-1 relative">
        {getStatusBadge(member2)}
        <div className={`w-10 h-10 bg-gradient-to-br ${getNodeColor(member2)} rounded-full flex items-center justify-center shadow-lg ring-1 ring-white/80 animate-spinSlow`}>
          {member2.profilePicture ? (
            <Avatar className="w-10 h-10">
              <AvatarImage src={member2.profilePicture} />
              <AvatarFallback className="text-[10px] font-semibold text-white">
                {member2.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            getRelationshipIcon(member2)
          )}
        </div>
        <div className="text-center space-y-0.5">
          <div className="font-semibold text-slate-800 text-[10px] leading-tight truncate max-w-[80px]">{member2.name}</div>
          {member2.email && (
            <div className="text-[9px] text-slate-500 truncate max-w-[80px]" title={member2.email}>
              {member2.email.split('@')[0]}
            </div>
          )}
          {isCurrentUser2 && (
            <div className="inline-flex items-center text-[9px] font-semibold text-white px-1 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-sm">
              <Crown className="w-2 h-2 mr-0.5" />
              You
            </div>
          )}
        </div>
      </div>

      {/* Compact Generation Indicator */}
      <div className="absolute top-1 left-1 text-[9px] font-bold text-slate-400 bg-slate-100/80 px-1 py-0.5 rounded-full">
        G{data.generation || 0}
      </div>
    </div>
  );
};

// Enhanced Parent-Child Edge Component with increased curvature and more animation
const ParentChildEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {}, source, target, data }: any) => {
  // Increased curve offset for more distinct connections
  const deltaX = targetX - sourceX;
  const deltaY = targetY - sourceY;
  const controlPoint1X = sourceX + deltaX * 0.1;
  const controlPoint1Y = sourceY + deltaY * 0.9;
  const controlPoint2X = sourceX + deltaX * 0.9;
  const controlPoint2Y = sourceY + deltaY * 0.1;
  
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
        className="react-flow__edge-path animate-dash"
        d={edgePath}
        markerEnd={`url(#parent-arrow-${id})`}
      >
        <animate attributeName="stroke-dashoffset" values="0;-18;0" dur="4s" repeatCount="indefinite" />
      </path>
    </>
  );
};

// Enhanced Sibling Edge Component with more animations
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

const edgeTypes = {
  parentChild: ParentChildEdge,
  sibling: SiblingEdge,
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
      member1: familyMembers.find(m => (m as any).userId === (node.data.member1 as any).userId),
      member2: familyMembers.find(m => (m as any).userId === (node.data.member2 as any).userId)
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
          variant={"cross" as any}
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