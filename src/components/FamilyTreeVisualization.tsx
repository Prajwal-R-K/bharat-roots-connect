// Enhanced Family Tree Visualization with Cytoscape + ELK layout
// Replaces React Flow with sophisticated Cytoscape rendering while preserving all existing logic

import React, { useEffect, useRef, useState, useCallback } from "react";
import { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getFamilyRelationships } from "@/lib/neo4j/family-tree";
import { getUserPersonalizedFamilyTree } from "@/lib/neo4j/relationships";
import { getAvatarForMember } from "@/lib/avatar-utils";
import { Mail, ZoomIn, ZoomOut, Maximize, RotateCcw, Info, Search, X, Plus } from "lucide-react";
import { addFamilyMemberWithRelationships } from '@/features/family-tree/logic';
import { getFamilyTreeStats, highlightRelatedNodes } from '@/features/family-tree/analysis';

import cytoscape from "cytoscape";
import elk from "cytoscape-elk";

cytoscape.use(elk);

interface FamilyMember {
  userId: string;
  name: string;
  email?: string;
  status?: string;
  relationship?: string;
  myRelationship?: string;
  createdBy?: string;
  profilePicture?: string;
  gender?: string;
  age?: number;
  dateOfBirth?: string;
  married?: string;
  marriageStatus?: string;
}

interface CoreRelationship {
  source: string;
  target: string;
  type: "PARENTS_OF" | "SIBLING" | "MARRIED_TO";
  sourceName?: string;
  targetName?: string;
}

interface FamilyTreeVisualizationProps {
  user: User;
  familyMembers: FamilyMember[];
  viewMode?: "personal" | "all";
  minHeight?: string;
  showControls?: boolean;
  onAddRelation?: (nodeId: string) => void;
}

// Enhanced Cytoscape styles with visual elements from reference
const getCytoscapeStyles = () => [
  {
    selector: 'node[type="individual"]',
    style: {
      width: 100,
      height: 100,
      shape: 'ellipse',
      'background-image': 'data(profileImage)',
      'background-fit': 'cover',
      'background-opacity': 1,
      'border-width': 4,
      'border-color': 'data(borderColor)',
      'border-opacity': 1,
      label: 'data(displayName)',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 12,
      'font-size': '14px',
      'font-weight': 'bold',
      color: '#1f2937',
      'text-wrap': 'wrap',
      'text-max-width': '120px',
      'overlay-opacity': 0
    }
  },
  {
    selector: 'node[type="couple"]',
    style: {
      width: 240,
      height: 130,
      shape: 'roundrectangle',
      'background-color': '#ffffff',
      'background-opacity': 0.9,
      'border-width': 2,
      'border-color': '#e5e7eb',
      'border-opacity': 0.8,
      label: '💕',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '20px',
      'overlay-opacity': 0
    }
  },
  {
    selector: 'node[type="coupleMember"]',
    style: {
      width: 90,
      height: 90,
      shape: 'ellipse',
      'background-image': 'data(profileImage)',
      'background-fit': 'cover',
      'background-opacity': 1,
      'border-width': 3,
      'border-color': 'data(borderColor)',
      'border-opacity': 1,
      label: 'data(displayName)',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 8,
      'font-size': '12px',
      'font-weight': 'bold',
      color: '#1f2937',
      'text-wrap': 'wrap',
      'text-max-width': '100px',
      'overlay-opacity': 0
    }
  },
  {
    selector: 'node.hover',
    style: {
      'border-width': 3,
      'border-color': '#3b82f6',
      'border-opacity': 0.8
    }
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-width': 4,
      'border-color': '#ef4444',
      'border-opacity': 1
    }
  },
  {
    selector: 'node.selected',
    style: {
      'border-width': 6,
      'border-color': '#3b82f6',
      'background-opacity': 1
    }
  },
  // Marriage edges - hidden, heart symbol shows in couple node
  {
    selector: 'edge[type="marriage"]',
    style: {
      width: 4,
      'line-color': '#dc2626',
      'curve-style': 'straight',
      'line-style': 'solid',
      opacity: 0 // Hidden like reference
    }
  },
  // Parent-child edges - custom SVG overlay will handle these
  {
    selector: 'edge[type="parentChild"]',
    style: {
      opacity: 0 // Hidden, custom SVG will render
    }
  },
  // Sibling edges - subtle connections
  {
    selector: 'edge[type="sibling"]',
    style: {
      width: 3,
      'line-color': '#2563eb',
      'curve-style': 'straight',
      'line-style': 'solid',
      opacity: 0 // Hidden like reference
    }
  }
];

// Create Cytoscape elements from family data
const createCytoscapeElements = (
  members: FamilyMember[],
  relationships: CoreRelationship[],
  createdByUserId: string,
  loggedInUserId: string
) => {
  const elements: cytoscape.ElementDefinition[] = [];
  const nodeMap = new Map<string, FamilyMember>();
  members.forEach((m) => nodeMap.set(m.userId, m));

  // Identify couples for grouping
  const spouseMap = new Map<string, string[]>();
  relationships.forEach((r) => {
    if (r.type === "MARRIED_TO") {
      if (!spouseMap.has(r.source)) spouseMap.set(r.source, []);
      spouseMap.get(r.source)!.push(r.target);
      if (!spouseMap.has(r.target)) spouseMap.set(r.target, []);
      spouseMap.get(r.target)!.push(r.source);
    }
  });

  const couples = new Map<string, { member1: string; member2: string }>();
  spouseMap.forEach((arr, id) => {
    arr.forEach((s) => {
      const sorted = [id, s].sort();
      const key = sorted.join("-");
      if (!couples.has(key)) couples.set(key, { member1: sorted[0], member2: sorted[1] });
    });
  });

  const coupleMap = new Map<string, string>();
  couples.forEach((c, id) => {
    coupleMap.set(c.member1, id);
    coupleMap.set(c.member2, id);
  });

  // Enhanced color scheme with better visual hierarchy
  const getSafeColor = (member?: FamilyMember, isRoot = false, isCurrent = false) => {
    if (isCurrent) return { 
      bgColor: "#fbbf24", 
      borderColor: "#d97706" 
    };
    if (isRoot) return { 
      bgColor: "#f59e0b", 
      borderColor: "#ea580c" 
    };
    if (!member) return { 
      bgColor: "#e5e7eb", 
      borderColor: "#9ca3af" 
    };
    if (member.gender === "male") return { 
      bgColor: "#3b82f6", 
      borderColor: "#1e40af" 
    };
    if (member.gender === "female") return { 
      bgColor: "#ec4899", 
      borderColor: "#be185d" 
    };
    return { 
      bgColor: "#8b5cf6", 
      borderColor: "#6d28d9" 
    };
  };

  const processed = new Set<string>();

  // Create couple nodes and their member nodes
  couples.forEach((couple, coupleId) => {
    const m1 = nodeMap.get(couple.member1);
    const m2 = nodeMap.get(couple.member2);
    if (!m1 || !m2) return;

    elements.push({
      data: { 
        id: coupleId, 
        type: "couple", 
        bgColor: "#ffffff", 
        borderColor: "#e2e8f0" 
      }
    });

    [m1, m2].forEach((m) => {
      const isRoot = m.userId === createdByUserId;
      const isCurrent = m.userId === loggedInUserId;
      const colors = getSafeColor(m, isRoot, isCurrent);
      const displayName = m.name.length > 12 ? m.name.substring(0, 12) + "..." : m.name;
      elements.push({
        data: {
          id: `${coupleId}_${m.userId}`,
          parent: coupleId,
          type: "coupleMember",
          originalId: m.userId,
          displayName,
          fullName: m.name,
          email: m.email || "",
          status: m.status || "",
          relationship: m.relationship || m.myRelationship || "",
          gender: m.gender || "",
          isRoot,
          isCurrent,
          ...colors,
          profileImage: getAvatarForMember(m, m.profilePicture)
        }
      });
      processed.add(m.userId);
    });
  });

  // Create individual nodes for non-coupled members
  members.forEach((m) => {
    if (processed.has(m.userId)) return;
    const isRoot = m.userId === createdByUserId;
    const isCurrent = m.userId === loggedInUserId;
    const colors = getSafeColor(m, isRoot, isCurrent);
    let displayName = m.name.length > 15 ? m.name.substring(0, 15) + "..." : m.name;
    if (isCurrent) displayName = `👑 ${displayName}`;
    elements.push({
      data: {
        id: m.userId,
        type: "individual",
        displayName,
        fullName: m.name,
        email: m.email || "",
        status: m.status || "",
        relationship: m.relationship || m.myRelationship || "",
        gender: m.gender || "",
        isRoot,
        isCurrent,
        ...colors,
        profileImage: getAvatarForMember(m, m.profilePicture)
      }
    });
  });

  // Create edges for relationships
  const parentEdgeSet = new Set<string>();
  relationships.forEach((rel) => {
    let sourceGroup = coupleMap.get(rel.source) || rel.source;
    const targetGroup = coupleMap.get(rel.target) || rel.target;
    if (sourceGroup === targetGroup && rel.type === "MARRIED_TO") return;
    
    const raw = String(rel.type || '').toUpperCase();
    let type: 'marriage' | 'parentChild' | 'sibling' = 'sibling';
    
    if (raw === 'MARRIED_TO') type = 'marriage';
    else if (raw === 'PARENTS_OF') type = 'parentChild';

    if (rel.type === "PARENTS_OF") {
      const otherSpouses = spouseMap.get(rel.source) || [];
      if (otherSpouses.length > 0) {
        const coupleId = coupleMap.get(rel.source);
        if (coupleId) {
          sourceGroup = coupleId;
        }
      }
      const key = `${sourceGroup}->${targetGroup}`;
      if (parentEdgeSet.has(key)) return;
      parentEdgeSet.add(key);
    }

    elements.push({
      data: {
        id: `edge-${sourceGroup}-${targetGroup}-${type}`,
        source: sourceGroup,
        target: targetGroup,
        type,
        relationship: rel.type
      }
    });
  });

  return elements;
};

// ELK layout configuration for hierarchical family tree
const elkOptions = {
  name: 'elk',
  elk: {
    algorithm: 'layered',
    'elk.direction': 'DOWN',
    'elk.layered.spacing.nodeNodeBetweenLayers': 150,
    'elk.spacing.nodeNode': 120,
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'SIMPLE',
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.padding': '[top=50,left=50,bottom=50,right=50]'
  }
};

export const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({
  user,
  familyMembers: propFamilyMembers = [],
  viewMode = "all",
  minHeight = "600px",
  showControls = true,
  onAddRelation
}) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(propFamilyMembers);
  const [relationships, setRelationships] = useState<CoreRelationship[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [relationshipDialogOpen, setRelationshipDialogOpen] = useState(false);
  const [relationship, setRelationship] = useState("");

  // Fetch family relationships based on view mode
  useEffect(() => {
    const fetchRelationships = async () => {
      if (!user?.familyTreeId) return;
      
      setLoading(true);
      try {
        if (viewMode === "personal") {
          const data = await getUserPersonalizedFamilyTree(user.familyTreeId, user.userId);
          if (Array.isArray(data)) {
            // Handle array response
            setRelationships(data);
            setFamilyMembers(propFamilyMembers);
          } else {
            // Handle object response  
            setFamilyMembers((data as any)?.members || []);
            setRelationships((data as any)?.relationships || []);
          }
        } else {
          const data = await getFamilyRelationships(user.familyTreeId);
          if (Array.isArray(data)) {
            // Handle array response
            setRelationships(data);
            setFamilyMembers(propFamilyMembers);
          } else {
            // Handle object response
            setFamilyMembers((data as any)?.members || []);
            setRelationships((data as any)?.relationships || []);
          }
        }
      } catch (error) {
        console.error("Error fetching family relationships:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelationships();
  }, [user?.familyTreeId, user?.userId, viewMode, propFamilyMembers]);

  // Initialize and update Cytoscape when data changes
  useEffect(() => {
    if (!cyRef.current || loading) return;

    const elements = createCytoscapeElements(
      familyMembers,
      relationships,
      user?.userId || "",
      user?.userId || ""
    );

    if (cyInstance.current) {
      cyInstance.current.destroy();
    }

    const cy = cytoscape({
      container: cyRef.current,
      elements,
      style: getCytoscapeStyles() as any,
      layout: elkOptions,
      wheelSensitivity: 0.2,
      maxZoom: 2,
      minZoom: 0.1,
    });

    cyInstance.current = cy;

    // Event handlers for interactions
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeId = node.data('originalId') || node.id();
      
      if (evt.originalEvent.shiftKey) {
        // Multi-select for relationship analysis
        setSelectedNodes(prev => {
          if (prev.includes(nodeId)) {
            return prev.filter(id => id !== nodeId);
          } else if (prev.length < 2) {
            return [...prev, nodeId];
          } else {
            return [nodeId];
          }
        });
      } else {
        // Single select for details
        const member = familyMembers.find(m => m.userId === nodeId);
        if (member) {
          setSelectedMember(member);
          setDialogOpen(true);
        }
        setSelectedNodes([nodeId]);
      }
    });

    cy.on('mouseover', 'node', (evt) => {
      evt.target.addClass('hover');
    });

    cy.on('mouseout', 'node', (evt) => {
      evt.target.removeClass('hover');
    });

    // Custom parent-child edge rendering using SVG overlay
    const renderCustomEdges = () => {
      if (!overlayRef.current) return;
      
      const svg = overlayRef.current.querySelector('svg') as SVGElement;
      if (svg) {
        // Clear existing edges
        svg.innerHTML = '';
        
        // Render parent-child connections with custom curved lines
        cy.edges('[type="parentChild"]').forEach((edge) => {
          const source = edge.source();
          const target = edge.target();
          
          const sourcePos = source.renderedPosition();
          const targetPos = target.renderedPosition();
          
          // Create curved path for parent-child connection
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const midY = sourcePos.y + (targetPos.y - sourcePos.y) * 0.6;
          
          const d = `M ${sourcePos.x} ${sourcePos.y + 50} 
                     Q ${sourcePos.x} ${midY} ${targetPos.x} ${targetPos.y - 50}`;
          
          path.setAttribute('d', d);
          path.setAttribute('stroke', '#6b7280');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke-dasharray', '5,5');
          path.setAttribute('marker-end', 'url(#arrowhead)');
          
          svg.appendChild(path);
        });
        
        // Add arrow marker definition
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#6b7280');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
      }
    };

    cy.ready(() => {
      cy.fit();
      renderCustomEdges();
    });

    cy.on('pan zoom', renderCustomEdges);

    return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy();
        cyInstance.current = null;
      }
    };
  }, [familyMembers, relationships, loading, user]);

  // Update node selection highlighting
  useEffect(() => {
    if (!cyInstance.current) return;
    
    cyInstance.current.nodes().removeClass('selected highlighted');
    
    selectedNodes.forEach(nodeId => {
      const node = cyInstance.current?.getElementById(nodeId);
      if (node) {
        node.addClass('selected');
      }
    });
    
    if (selectedNodes.length === 1) {
      // Highlight related nodes
      const relatedNodes = relationships
        .filter(r => r.source === selectedNodes[0] || r.target === selectedNodes[0])
        .flatMap(r => [r.source, r.target])
        .filter(id => id !== selectedNodes[0]);
      
      relatedNodes.forEach(nodeId => {
        const node = cyInstance.current?.getElementById(nodeId);
        if (node) {
          node.addClass('highlighted');
        }
      });
    }
  }, [selectedNodes, relationships]);

  // Control functions
  const zoomIn = () => cyInstance.current?.zoom(cyInstance.current.zoom() * 1.2);
  const zoomOut = () => cyInstance.current?.zoom(cyInstance.current.zoom() * 0.8);
  const fit = () => cyInstance.current?.fit();
  const resetLayout = () => {
    if (cyInstance.current) {
      cyInstance.current.layout(elkOptions).run();
    }
  };

  const calculateRelationship = (id1: string, id2: string): string => {
    const member1 = familyMembers.find(m => m.userId === id1);
    const member2 = familyMembers.find(m => m.userId === id2);
    
    if (!member1 || !member2) return "Unknown relationship";
    
    const rel = relationships.find(r => 
      (r.source === id1 && r.target === id2) || 
      (r.source === id2 && r.target === id1)
    );
    
    if (rel) {
      switch (rel.type) {
        case "MARRIED_TO": return "Married couple";
        case "PARENTS_OF": 
          return rel.source === id1 ? `${member1.name} is parent of ${member2.name}` : `${member2.name} is parent of ${member1.name}`;
        case "SIBLING": return "Siblings";
        default: return "Related";
      }
    }
    
    return "No direct relationship found";
  };

  // Handle add relation button click
  const handleAddRelation = useCallback((nodeId: string) => {
    if (onAddRelation) {
      onAddRelation(nodeId);
    }
  }, [onAddRelation]);

  // Render + button overlays on nodes
  const renderAddButtons = () => {
    if (!cyInstance.current || !overlayRef.current) return null;
    
    const buttons: JSX.Element[] = [];
    
    cyInstance.current.nodes('[type="individual"]').forEach((node, index) => {
      const pos = node.renderedPosition();
      const nodeId = node.data('originalId') || node.id();
      
      buttons.push(
        <button
          key={`add-${nodeId}-${index}`}
          className="absolute w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-all duration-200 hover:scale-110"
          style={{
            left: pos.x + 40,
            top: pos.y - 40,
            transform: 'translate(-50%, -50%)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleAddRelation(nodeId);
          }}
        >
          +
        </button>
      );
    });
    
    return buttons;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight }}>
        <div className="text-lg">Loading family tree...</div>
      </div>
    );
  }

  const stats = getFamilyTreeStats([], []);

  return (
    <div className="relative w-full" style={{ minHeight }}>
      {/* Controls */}
      {showControls && (
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <Button onClick={zoomIn} size="sm" variant="outline">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button onClick={zoomOut} size="sm" variant="outline">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button onClick={fit} size="sm" variant="outline">
            <Maximize className="w-4 h-4" />
          </Button>
          <Button onClick={resetLayout} size="sm" variant="outline">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="absolute top-4 right-4 z-20">
        <Badge variant="secondary">
          {familyMembers.length} members • {relationships.length} connections
        </Badge>
      </div>

      {/* Cytoscape container */}
      <div ref={cyRef} className="w-full h-full" style={{ minHeight }} />
      
      {/* SVG overlay for custom edges */}
      <div 
        ref={overlayRef} 
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <svg className="w-full h-full" />
        {/* Add buttons overlay */}
        <div className="relative w-full h-full pointer-events-auto">
          {renderAddButtons()}
        </div>
      </div>

      {/* Member Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMember?.name}</DialogTitle>
            <DialogDescription>
              Family member details and information
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img 
                  src={getAvatarForMember(selectedMember, selectedMember.profilePicture)} 
                  alt={selectedMember.name}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h3 className="font-semibold">{selectedMember.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedMember.relationship || selectedMember.myRelationship}</p>
                  {selectedMember.email && (
                    <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  )}
                </div>
              </div>
              <Badge variant={selectedMember.status === 'active' ? 'default' : 'secondary'}>
                {selectedMember.status || 'invited'}
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Relationship Analysis Dialog */}
      <Dialog open={relationshipDialogOpen} onOpenChange={setRelationshipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relationship Analysis</DialogTitle>
            <DialogDescription>
              Relationship between selected family members
            </DialogDescription>
          </DialogHeader>
          {selectedNodes.length === 2 && (
            <div className="space-y-4">
              <p className="text-sm">
                {calculateRelationship(selectedNodes[0], selectedNodes[1])}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeVisualization;