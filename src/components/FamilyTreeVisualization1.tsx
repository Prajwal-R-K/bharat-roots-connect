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
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getFamilyRelationships } from '@/lib/neo4j/family-tree';
import { getUserPersonalizedFamilyTree } from '@/lib/neo4j/relationships';
import { Heart, Crown, User as UserIcon } from "lucide-react";

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

interface Relationship {
  source: string;
  target: string;
  type: string;
  sourceName?: string;
  targetName?: string;
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

// Enhanced family member node component matching the working version
const FamilyMemberNode = ({ data, id, selected }: { data: any; id: string; selected?: boolean }) => {
  const [isHovered, setIsHovered] = React.useState(false);

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
        return <UserIcon className="w-6 h-6 text-white" />;
      case 'husband':
      case 'wife':
        return <Heart className="w-6 h-6 text-white" />;
      default:
        return <UserIcon className="w-6 h-6 text-white" />;
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
      className={`relative bg-white ${getBorderStyle()} rounded-2xl p-4 w-[200px] h-[240px] flex flex-col justify-between transition-all duration-300 hover:scale-105 cursor-pointer`}
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

      <div className="flex flex-col items-center space-y-3">
        {/* Avatar */}
        <div className={`w-16 h-16 bg-gradient-to-br ${getNodeColor(data.relationship, data.isRoot, data.gender)} rounded-full flex items-center justify-center shadow-xl ring-4 ring-white`}>
          {getRelationshipIcon(data.relationship, data.isRoot)}
        </div>

        {/* Main Info */}
        <div className="text-center space-y-2">
          <div className="font-bold text-slate-800 text-sm">{data.name}</div>
          
          {/* Relationship Badge */}
          {data.relationship && !data.isRoot && (
            <div className="inline-flex items-center text-xs font-semibold text-white px-2 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-md">
              {data.relationship.charAt(0).toUpperCase() + data.relationship.slice(1)}
            </div>
          )}
          
          {data.isRoot && (
            <div className="inline-flex items-center text-xs font-semibold text-white px-2 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-md">
              <Crown className="w-3 h-3 mr-1" />
              You
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Calculate positions based on heritage layout logic
// Added a new parameter: loggedInUserId
const calculateNodePositions = (
  members: FamilyMember[], 
  relationships: Relationship[], 
  createdByUserId: string,
  loggedInUserId: string
): { nodes: Node[]; edges: Edge[] } => {
  const nodeMap = new Map<string, FamilyMember>();
  members.forEach(member => nodeMap.set(member.userId, member));
  
  const positions = new Map<string, { x: number; y: number; generation: number }>();
  const processedNodes = new Set<string>();
  
  // Start with the createdBy node at center
  const rootPosition = { x: 0, y: 0, generation: 0 };
  positions.set(createdByUserId, rootPosition);
  
  const queue: Array<{ userId: string; fromUserId?: string }> = [{ userId: createdByUserId }];
  
  // Generation tracking for y-positioning
  const generationCounts = new Map<number, number>();
  generationCounts.set(0, 0);
  
  while (queue.length > 0) {
    const { userId, fromUserId } = queue.shift()!;
    
    if (processedNodes.has(userId)) continue;
    processedNodes.add(userId);
    
    const currentPos = positions.get(userId)!;
    
    // Find all relationships from this node
    const nodeRelationships = relationships.filter(rel => rel.source === userId);
    
    let ancestorCount = 0;
    let descendantCount = 0;
    let siblingCount = 0;
    
    nodeRelationships.forEach(rel => {
      if (processedNodes.has(rel.target)) return;
      
      const category = getRelationshipCategory(rel.type);
      const targetMember = nodeMap.get(rel.target);
      if (!targetMember) return;
      
      let targetGeneration: number;
      let xOffset: number;
      
      switch (category) {
        case 'ancestor':
          targetGeneration = currentPos.generation - 1;
          xOffset = ancestorCount * 200 - ((nodeRelationships.filter(r => getRelationshipCategory(r.type) === 'ancestor').length - 1) * 100);
          ancestorCount++;
          break;
        case 'descendant':
          targetGeneration = currentPos.generation + 1;
          xOffset = descendantCount * 200 - ((nodeRelationships.filter(r => getRelationshipCategory(r.type) === 'descendant').length - 1) * 100);
          descendantCount++;
          break;
        case 'sibling':
        default:
          targetGeneration = currentPos.generation;
          xOffset = currentPos.x + (siblingCount + 1) * 250;
          siblingCount++;
          break;
      }
      
      // Count nodes in generation for x-positioning
      const genCount = generationCounts.get(targetGeneration) || 0;
      generationCounts.set(targetGeneration, genCount + 1);
      
      const targetPosition = {
        x: category === 'sibling' ? xOffset : currentPos.x + xOffset,
        y: targetGeneration * 200,
        generation: targetGeneration
      };
      
      positions.set(rel.target, targetPosition);
      queue.push({ userId: rel.target, fromUserId: userId });
    });
  }
  
  // Convert to nodes and edges
  const nodes: Node[] = Array.from(positions.entries()).map(([userId, pos]) => {
    const member = nodeMap.get(userId)!;
    return {
      id: userId,
      type: 'familyMember',
      position: { x: pos.x + 1000, y: pos.y + 500 }, // Offset to center in viewport
      data: {
        name: member.name,
        email: member.email,
        relationship: member.relationship,
        profilePicture: member.profilePicture,
        gender: member.gender,
        userId: member.userId,
        // Pass loggedInUserId from auth (currently logged in user)
        loginUserId: loggedInUserId,
        isRoot: userId === loggedInUserId, // Show crown for logged-in user
        status: member.status
      }
    };
  });
  
  const edges: Edge[] = relationships.map(rel => {
    const sourcePos = positions.get(rel.source)?.y || 0;
    const targetPos = positions.get(rel.target)?.y || 0;
    const isTopToBottom = sourcePos < targetPos; // Ensure top-to-bottom direction
    const sourceId = isTopToBottom ? rel.source : rel.target;
    const targetId = isTopToBottom ? rel.target : rel.source;
    const sourceMember = nodeMap.get(rel.source); // Original source
    const targetMember = nodeMap.get(rel.target); // Original target
    
    // Skip edges where members are missing or don't have gender
    if (!sourceMember || !targetMember || !sourceMember.gender || !targetMember.gender) {
      console.warn(`Skipping edge for missing members or gender: ${rel.source} -> ${rel.target}`);
      return null;
    }

    // Determine the display labels based on edge direction
    const originalRel = rel.type.toLowerCase();
    let directRel: string;
    let reciprocalRel: string;

    if (isTopToBottom) {
      // From source → target (normal case)
      directRel = originalRel;
      reciprocalRel = getReciprocalRelationship(originalRel, targetMember.gender, sourceMember.gender);
      if (['father', 'mother'].includes(originalRel)) {
        // Source is parent, target is child
        directRel = targetMember.gender === 'male' ? 'son' : 'daughter';
      }
    } else {
      // From target → source (reversed edge)
      directRel = getReciprocalRelationship(originalRel, targetMember.gender, sourceMember.gender);
      reciprocalRel = originalRel;
      if (['father', 'mother'].includes(originalRel)) {
        // Target is parent, source is child
        directRel = sourceMember.gender === 'male' ? 'son' : 'daughter';
      } else if (['son', 'daughter'].includes(originalRel)) {
        // Target is child, source is parent
        directRel = targetMember.gender === 'male' ? 'son' : 'daughter';
      }
    }

    return {
      id: `${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#6366f1', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
      data: {
        relationship: directRel,
        reciprocalRelationship: reciprocalRel,
        sourceName: sourceMember.name,
        targetName: targetMember.name
      }
    };
  }).filter(edge => edge !== null) as Edge[];
  
  return { nodes, edges };
};

const nodeTypes = {
  familyMember: FamilyMemberNode,
};

const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({ 
  user, 
  familyMembers,
  viewMode = 'personal',
  minHeight = '600px',
  showControls = true
}) => {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [relationshipDetailsOpen, setRelationshipDetailsOpen] = useState(false);
  const [showReciprocalRelation, setShowReciprocalRelation] = useState(false);
  
  // Calculate nodes and edges
  const { nodes: calculatedNodes, edges: calculatedEdges } = React.useMemo(() => {
    if (!relationships.length || !familyMembers.length) {
      return { nodes: [], edges: [] };
    }
    // Determine rootUserId based on creator logic.
    const rootUserId = user.createdBy === 'self' ? user.userId : user.createdBy;
    // Pass loggedInUserId as user.userId for crown highlighting.
    return calculateNodePositions(familyMembers, relationships, rootUserId, user.userId);
  }, [familyMembers, relationships, user.createdBy, user.userId]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(calculatedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(calculatedEdges);
  
  // Update nodes and edges when calculated values change
  useEffect(() => {
    setNodes(calculatedNodes);
    setEdges(calculatedEdges);
  }, [calculatedNodes, calculatedEdges, setNodes, setEdges]);
  
  // Fetch relationships
  useEffect(() => {
    const fetchRelationships = async () => {
      setIsLoading(true);
      try {
        let relationshipData: Relationship[] = [];
        if (viewMode === 'personal') {
          relationshipData = await getUserPersonalizedFamilyTree(user.createdBy, user.familyTreeId);
        } else {
          relationshipData = await getFamilyRelationships(user.familyTreeId);
        }
        setRelationships(relationshipData);
      } catch (error) {
        console.error('Error fetching relationships:', error);
        setRelationships([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRelationships();
  }, [user.userId, user.familyTreeId, viewMode]);
  
  // Handle edge click to show relationship details
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setShowReciprocalRelation(false);
    setRelationshipDetailsOpen(true);
  }, []);
  
  const toggleReciprocalRelation = () => {
    setShowReciprocalRelation(!showReciprocalRelation);
  };
  
  const getDisplayedRelationship = () => {
    if (!selectedEdge) return '';
    
    const relationship = showReciprocalRelation
      ? selectedEdge.data?.reciprocalRelationship as string
      : selectedEdge.data?.relationship as string;
    
    return relationship;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight }}>
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading family tree...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border" style={{ height: minHeight }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
        className="bg-gradient-to-br from-blue-50 to-indigo-100"
      >
        <Background color="#e0e7ff" gap={20} />
        {showControls && <Controls />}
      </ReactFlow>
      
      {/* Relationship Details Dialog */}
      <Dialog open={relationshipDetailsOpen} onOpenChange={setRelationshipDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Relationship Details
            </DialogTitle>
            <DialogDescription>
              Click to view the reciprocal relationship
            </DialogDescription>
          </DialogHeader>
          
          {selectedEdge && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-800">
                  {getDisplayedRelationship()}
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  {showReciprocalRelation ? 'Reciprocal relationship' : 'Direct relationship'}
                </div>
              </div>
              
              <button
                onClick={toggleReciprocalRelation}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {showReciprocalRelation ? 'Show Direct' : 'Show Reciprocal'}
              </button>
              
              <div className="text-xs text-gray-500 text-center">
                From: {(selectedEdge.data?.sourceName as string) || 'Unknown'} → To: {(selectedEdge.data?.targetName as string) || 'Unknown'}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeVisualization;