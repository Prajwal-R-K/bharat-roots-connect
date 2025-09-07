// Enhanced Cytoscape family tree visualization with ELK hierarchical layout
import React, { useEffect, useRef, useState, useCallback } from "react";
import { User } from "@/types";
import { getAvatarForMember } from "@/lib/avatar-utils";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getFamilyRelationships } from "@/lib/neo4j/family-tree";
import { getUserPersonalizedFamilyTree } from "@/lib/neo4j/relationships";
import { Mail, ZoomIn, ZoomOut, Maximize, RotateCcw, Info, Search, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import cytoscape from "cytoscape";
import elk from "cytoscape-elk";

cytoscape.use(elk);

interface FamilyMember {
  userId: string;
  name: string;
  email?: string;
  status?: string;
  relationship?: string;
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

// Enhanced Cytoscape styles with circular avatars and couple groupings
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
    selector: 'node.hover',
    style: {
      'border-width': 6,
      'border-color': '#3b82f6',
      'border-opacity': 0.8
    }
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-width': 6,
      'border-color': '#ef4444',
      'border-opacity': 1
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
      label: '',
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
    selector: 'node.selected',
    style: {
      'border-width': 6,
      'border-color': '#3b82f6',
      'background-opacity': 1
    }
  },
  {
    selector: 'edge[type="marriage"]',
    style: {
      width: 4,
      'line-color': '#dc2626',
      'curve-style': 'straight',
      'line-style': 'solid',
      opacity: 0
    }
  },
  {
    selector: 'edge[type="parentChild"]',
    style: {
      width: 4,
      'line-color': '#20b2aa',
      'curve-style': 'unbundled-bezier',
      'control-point-distances': [60, 60],
      'control-point-weights': [0.3, 0.7],
      'line-style': 'dotted',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#20b2aa',
      'arrow-scale': 1.2,
      opacity: 0.8
    }
  },
  {
    selector: 'edge[type="sibling"]',
    style: {
      width: 3,
      'line-color': '#2563eb',
      'curve-style': 'straight',
      'line-style': 'solid',
      opacity: 0
    }
  }
];

// Create Cytoscape elements with couple groupings and enhanced styling
const createCytoscapeElements = (
  members: FamilyMember[],
  relationships: CoreRelationship[],
  createdByUserId: string,
  loggedInUserId: string
) => {
  const elements: cytoscape.ElementDefinition[] = [];
  const nodeMap = new Map<string, FamilyMember>();
  members.forEach((m) => nodeMap.set(m.userId, m));

  // Group married couples
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
      gradientColors: "#fbbf24 #f59e0b", 
      borderColor: "#d97706" 
    };
    if (isRoot) return { 
      bgColor: "#f59e0b", 
      gradientColors: "#f59e0b #f97316", 
      borderColor: "#ea580c" 
    };
    if (!member) return { 
      bgColor: "#e5e7eb", 
      gradientColors: "#e5e7eb #d1d5db", 
      borderColor: "#9ca3af" 
    };
    if (member.gender === "male") return { 
      bgColor: "#3b82f6", 
      gradientColors: "#3b82f6 #1d4ed8", 
      borderColor: "#1e40af" 
    };
    if (member.gender === "female") return { 
      bgColor: "#ec4899", 
      gradientColors: "#ec4899 #be185d", 
      borderColor: "#be185d" 
    };
    return { 
      bgColor: "#8b5cf6", 
      gradientColors: "#8b5cf6 #7c3aed", 
      borderColor: "#6d28d9" 
    };
  };

  const processed = new Set<string>();

  // Create couple container nodes and couple members
  couples.forEach((couple, coupleId) => {
    const m1 = nodeMap.get(couple.member1);
    const m2 = nodeMap.get(couple.member2);
    if (!m1 || !m2) return;

    // Couple container
    elements.push({
      data: { 
        id: coupleId, 
        type: "couple", 
        bgColor: "#ffffff", 
        gradientColors: "#ffffff #f8fafc", 
        borderColor: "#e2e8f0" 
      }
    });

    // Couple members
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
          relationship: m.relationship || "",
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

  // Create individual nodes for non-married members
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
        relationship: m.relationship || "",
        gender: m.gender || "",
        isRoot,
        isCurrent,
        ...colors,
        profileImage: getAvatarForMember(m, m.profilePicture)
      }
    });
  });

  // Create edges with proper source/target mapping
  const parentEdgeSet = new Set<string>();
  relationships.forEach((rel) => {
    let sourceGroup = coupleMap.get(rel.source) || rel.source;
    const targetGroup = coupleMap.get(rel.target) || rel.target;
    if (sourceGroup === targetGroup && rel.type === "MARRIED_TO") return;
    
    let type: 'marriage' | 'parentChild' | 'sibling' = 'sibling';
    if (rel.type === 'MARRIED_TO') type = 'marriage';
    else if (rel.type === 'PARENTS_OF') type = 'parentChild';

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

    // Only create edge if both source and target nodes exist
    const sourceExists = elements.some(el => el.data.id === sourceGroup);
    const targetExists = elements.some(el => el.data.id === targetGroup);
    
    if (!sourceExists || !targetExists) {
      console.warn(`Skipping edge creation - missing nodes: sourceGroup=${sourceGroup}, targetGroup=${targetGroup}`);
      return;
    }

    elements.push({
      data: {
        id: `${type}_${sourceGroup}_${targetGroup}`,
        source: sourceGroup,
        target: targetGroup,
        type,
        relationship: rel.type,
        sourceName: rel.sourceName || "",
        targetName: rel.targetName || ""
      }
    });
  });

  return elements;
};

// ELK layout configuration for hierarchical family tree
const elkOptions: any = {
  name: "elk",
  elk: {
    "algorithm": "layered",
    "elk.direction": "DOWN",
    "elk.spacing.nodeNode": 120,
    "elk.layered.spacing.nodeNodeBetweenLayers": 180,
    "elk.spacing.edgeNode": 60,
    "elk.spacing.edgeEdge": 40,
    "elk.alignment": "CENTER"
  }
};

const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({
  user,
  familyMembers: propFamilyMembers,
  viewMode = "personal",
  minHeight = "600px",
  showControls = true,
  onAddRelation
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // State management with persistence
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(propFamilyMembers);
  const [coreRelationships, setCoreRelationships] = useState<CoreRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Update family members when props change
  useEffect(() => {
    if (JSON.stringify(propFamilyMembers) !== JSON.stringify(familyMembers)) {
      setFamilyMembers(propFamilyMembers);
      setLastUpdateTime(Date.now());
    }
  }, [propFamilyMembers]);

  // Load relationships data
  const loadRelationships = useCallback(async () => {
    try {
      setIsLoading(true);
      const relationships = await getFamilyRelationships(user.familyTreeId);
      setCoreRelationships(relationships);
    } catch (error) {
      console.error("Error loading relationships:", error);
      toast.error("Failed to load family relationships");
    } finally {
      setIsLoading(false);
    }
  }, [user.familyTreeId]);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  // Initialize and update Cytoscape visualization
  useEffect(() => {
    if (!containerRef.current || isLoading || familyMembers.length === 0) return;

    // Clean up existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: createCytoscapeElements(familyMembers, coreRelationships, user.createdBy || user.userId, user.userId),
      style: getCytoscapeStyles() as any,
      layout: elkOptions,
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3,
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: false
    });

    cyRef.current = cy;

    // Enhanced node interactions
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeData = node.data();
      
      // Handle couple member clicks
      if (nodeData.type === 'coupleMember') {
        setSelectedNodes([nodeData.originalId]);
      } else if (nodeData.type === 'individual') {
        setSelectedNodes([nodeData.id]);
      }
      
      // Remove previous selections
      cy.nodes().removeClass('selected');
      node.addClass('selected');
    });

    // Node hover effects
    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      if (node.data('type') !== 'couple') {
        node.addClass('hover');
      }
    });

    cy.on('mouseout', 'node', (event) => {
      const node = event.target;
      node.removeClass('hover');
    });

    // Custom SVG overlay for heart symbols on couples
    const renderHeartSymbols = () => {
      if (!svgRef.current) return;
      
      const svg = svgRef.current;
      svg.innerHTML = ''; // Clear previous hearts
      
      cy.nodes('[type="couple"]').forEach((coupleNode) => {
        const position = coupleNode.renderedPosition();
        const heartGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        const heart = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        heart.setAttribute('x', position.x.toString());
        heart.setAttribute('y', (position.y - 40).toString());
        heart.setAttribute('text-anchor', 'middle');
        heart.setAttribute('font-size', '24');
        heart.setAttribute('fill', '#dc2626');
        heart.textContent = '💕';
        
        heartGroup.appendChild(heart);
        svg.appendChild(heartGroup);
      });
    };

    cy.ready(() => {
      renderHeartSymbols();
      cy.fit(undefined, 50);
    });

    cy.on('zoom pan', renderHeartSymbols);

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [familyMembers, coreRelationships, isLoading, user.userId, user.createdBy, user.familyTreeId, lastUpdateTime]);

  // Control functions
  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 50);
  const handleReset = () => {
    if (cyRef.current) {
      cyRef.current.zoom(1);
      cyRef.current.center();
    }
  };

  // Add relation handler
  const handleAddRelation = (nodeId: string) => {
    if (onAddRelation) {
      onAddRelation(nodeId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading family tree...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ minHeight }}>
      {/* Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleFit}>
            <Maximize className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Add relation overlays */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {familyMembers.map((member) => {
          const nodeId = member.userId;
          return (
            <div
              key={`overlay-${nodeId}`}
              className="absolute pointer-events-auto"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                onClick={() => handleAddRelation(nodeId)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Cytoscape container */}
      <div 
        ref={containerRef} 
        className="w-full h-full bg-gradient-to-br from-background to-muted rounded-lg border"
        style={{ minHeight }}
      />

      {/* SVG overlay for custom graphics */}
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none z-10"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Node details dialog */}
      <Dialog open={nodeDetailsOpen} onOpenChange={setNodeDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              View detailed information about this family member.
            </DialogDescription>
          </DialogHeader>
          {selectedNodes.length > 0 && (
            <div className="space-y-4">
              {selectedNodes.map((nodeId) => {
                const member = familyMembers.find(m => m.userId === nodeId);
                if (!member) return null;
                return (
                  <div key={nodeId} className="flex items-center gap-4 p-4 border rounded-lg">
                    <img
                      src={getAvatarForMember(member, member.profilePicture)}
                      alt={member.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <Badge variant="secondary">{member.relationship || 'Family Member'}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeVisualization;