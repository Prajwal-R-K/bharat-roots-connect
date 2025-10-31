// src/components/FamilyTreeVisualization1.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { User } from "@/types";
import { getProfilePhotoUrl } from "@/lib/profile-api";
import { getDefaultAvatar, getAvatarForMember } from "@/lib/avatar-utils";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getFamilyRelationships } from "@/lib/neo4j/family-tree";
import { getUserPersonalizedFamilyTree } from "@/lib/neo4j/relationships";
import { Mail, ZoomIn, ZoomOut, Maximize, RotateCcw, Info, Search, X, Maximize2, ArrowLeft } from "lucide-react";

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

interface PersonalizedRelationship {
  source: string;
  target: string;
  type?: string;
  sourceName?: string;
  targetName?: string;
}

interface FamilyTreeVisualizationProps {
  user: User;
  familyMembers: FamilyMember[];
  viewMode?: "personal" | "all";
  minHeight?: string;
  showControls?: boolean;
  relationships?: CoreRelationship[];
}

const getCytoscapeStyles = () => [
  {
    selector: 'node[type="individual"]',
    style: {
      width: 100,
      height: 100,
      shape: "ellipse",
      "background-image": "data(profileImage)",
      "background-fit": "cover cover",
      "background-opacity": 1,
      "border-width": 4,
      "border-color": "data(borderColor)",
      "border-opacity": 1,
      label: "data(displayName)",
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 12,
      "font-size": "14px",
      "font-weight": "bold",
      color: "#1f2937",
      "text-wrap": "wrap",
      "text-max-width": "120px",
      "overlay-opacity": 0,
      "transition-property": "border-width, background-color, width, height, border-color",
      "transition-duration": "0.3s",
      "transition-timing-function": "ease-in-out",
      "background-color": "linear-gradient(135deg, #fff, #fff)",
      "box-shadow": "0 0 10px rgba(0, 0, 0, 0.1)",
    }
  },
  {
    selector: 'node.hover',
    style: {
      'border-width': 6,
      'border-color': '#3b82f6',
      'border-opacity': 1,
      'box-shadow': '0 0 20px rgba(59, 130, 246, 0.6)',
      'width': 110,
      'height': 110,
      'z-index': 999
    }
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-width': 6,
      'border-color': '#ef4444',
      'border-opacity': 1,
      'box-shadow': '0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.4)',
      'width': 115,
      'height': 115,
      'z-index': 1000
    }
  },
  {
    selector: 'node[type="couple"]',
    style: {
      width: 240,
      height: 130,
      shape: "roundrectangle",
      "background-color": "#fef3f2",
      "background-opacity": 0.95,
      "border-width": 2,
      "border-color": "#fca5a5",
      "border-opacity": 0.6,
      label: "",
      "overlay-opacity": 0,
      "box-shadow": "0 4px 12px rgba(252, 165, 165, 0.15)"
    }
  },
  {
    selector: 'node[type="coupleMember"]',
    style: {
      width: 90,
      height: 90,
      shape: "ellipse",
      "background-image": "data(profileImage)",
      "background-fit": "cover cover",
      "background-opacity": 1,
      "border-width": 3,
      "border-color": "data(borderColor)",
      "border-opacity": 1,
      label: "data(displayName)",
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 8,
      "font-size": "12px",
      "font-weight": "bold",
      color: "#1f2937",
      "text-wrap": "wrap",
      "text-max-width": "100px",
      "overlay-opacity": 0,
      "transition-property": "border-width, background-color, width, height, border-color",
      "transition-duration": "0.3s",
      "transition-timing-function": "ease-in-out",
      "box-shadow": "0 2px 8px rgba(0, 0, 0, 0.1)"
    }
  },
  {
    selector: "node.selected",
    style: {
      "border-width": 6,
      "border-color": "#3b82f6",
      "background-opacity": 1,
    }
  },
  // MARRIAGE EDGES - Straight horizontal red lines
  {
    selector: 'edge[type="marriage"]',
    style: {
      width: 4,
      "line-color": "#dc2626",
      "curve-style": "straight",
      "line-style": "solid",
      // Hide marriage edges to match cards-with-heart visual in nodes
      opacity: 0
    }
  },
  {
    selector: 'edge[type="divorced"]',
    style: {
      width: 4,
      "line-color": "#6b7280",
      "curve-style": "straight",
      "line-style": "dashed",
      opacity: 0.9,
      "line-cap": "round",
      label: "Divorced",
      color: "#374151",
      'text-background-color': '#ffffff',
      'text-background-opacity': 0.95,
      'text-background-padding': 4,
      'text-background-shape': 'roundrectangle',
      'font-size': 11,
      'font-weight': 'bold'
    }
  },
  // PARENT-CHILD EDGES - Hidden, will use custom SVG overlay
  {
    selector: 'edge[type="parentChild"]',
    style: {
      opacity: 0, // Hide cytoscape edges, use custom SVG overlay
    }
  },
  // SIBLING EDGES - Blue horizontal lines (bidirectional)
  {
    selector: 'edge[type="sibling"]',
    style: {
      width: 3,
      "line-color": "#2563eb",
      "curve-style": "straight",
      "line-style": "solid",
      opacity: 1,
      "target-arrow-shape": "triangle",
      "target-arrow-color": "#2563eb",
      "source-arrow-shape": "triangle",
      "source-arrow-color": "#2563eb",
      "arrow-scale": 1,
      label: "SIBLING",
      "font-size": 10,
      "font-weight": "bold",
      color: "#1e40af",
      "text-background-color": "#ffffff",
      "text-background-opacity": 0.9,
      "text-background-padding": 4,
      "text-background-shape": "roundrectangle",
      "text-border-width": 1,
      "text-border-color": "#dbeafe",
      "text-border-opacity": 1
    }
  },
  {
    selector: 'edge[type="adopted"]',
    style: {
      width: 4,
      "line-color": "#0ea5e9",
      "curve-style": "unbundled-bezier",
      "control-point-distances": "data(curveDistances)",
      "control-point-weights": "data(curveWeights)",
      "line-style": "dotted",
      opacity: 1,
      "line-cap": "round",
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#1e40af',
      'arrow-scale': 1.2
    }
  },
  {
    selector: 'edge.showLabel',
    style: {
      label: 'data(relationship)',
      color: '#1f2937',
      'font-size': 11,
      'font-weight': 'bold',
      'text-background-color': '#ffffff',
      'text-background-opacity': 0.95,
      'text-background-padding': 6,
      'text-background-shape': 'roundrectangle',
      'text-border-color': '#d1d5db',
      'text-border-width': 1,
      'text-border-opacity': 1,
      'text-outline-color': '#ffffff',
      'text-outline-width': 2,
      'text-margin-y': -8
    }
  }
];

const createCytoscapeElements = (
  members: FamilyMember[],
  relationships: CoreRelationship[],
  createdByUserId: string,
  loggedInUserId: string
) => {
  const elements: cytoscape.ElementDefinition[] = [];
  const nodeMap = new Map<string, FamilyMember>();
  members.forEach((m) => nodeMap.set(m.userId, m));

  const spouseMap = new Map<string, string[]>();
  const parentMap = new Map<string, string[]>();  // child -> parents
  const childMap = new Map<string, string[]>();   // parent -> children
  const siblingMap = new Map<string, Set<string>>();  // userId -> siblings
  
  relationships.forEach((r) => {
    if (r.type === "MARRIED_TO") {
      if (!spouseMap.has(r.source)) spouseMap.set(r.source, []);
      spouseMap.get(r.source)!.push(r.target);
      if (!spouseMap.has(r.target)) spouseMap.set(r.target, []);
      spouseMap.get(r.target)!.push(r.source);
    } else if (r.type === "PARENTS_OF") {
      if (!parentMap.has(r.target)) parentMap.set(r.target, []);
      parentMap.get(r.target)!.push(r.source);
      if (!childMap.has(r.source)) childMap.set(r.source, []);
      childMap.get(r.source)!.push(r.target);
    } else if (r.type === "SIBLING") {
      if (!siblingMap.has(r.source)) siblingMap.set(r.source, new Set());
      siblingMap.get(r.source)!.add(r.target);
      if (!siblingMap.has(r.target)) siblingMap.set(r.target, new Set());
      siblingMap.get(r.target)!.add(r.source);
    }
  });

  // COMPREHENSIVE LAYER ASSIGNMENT: Ensures all children of same parents are at same layer
  const layerMap = new Map<string, number>();
  const rootNodes = members.filter(m => !parentMap.has(m.userId));
  
  // Step 1: Group children by their parent set
  const childrenByParentSet = new Map<string, Set<string>>();
  members.forEach(m => {
    const parents = parentMap.get(m.userId) || [];
    if (parents.length > 0) {
      const parentKey = parents.sort().join('-');
      if (!childrenByParentSet.has(parentKey)) {
        childrenByParentSet.set(parentKey, new Set());
      }
      childrenByParentSet.get(parentKey)!.add(m.userId);
    }
  });
  
  // Step 2: Assign layers starting from root nodes
  const queue: Array<{userId: string, layer: number}> = rootNodes.map(m => ({userId: m.userId, layer: 0}));
  const visited = new Set<string>();
  const pendingSiblings = new Map<string, number>(); // Track layer for siblings
  
  // First pass: assign layers to all nodes
  while (queue.length > 0) {
    const {userId, layer} = queue.shift()!;
    if (visited.has(userId)) continue;
    visited.add(userId);
    layerMap.set(userId, layer);
    
    // Spouses must be at the same layer (process immediately)
    const spouses = spouseMap.get(userId) || [];
    spouses.forEach(spouseId => {
      if (!visited.has(spouseId)) {
        visited.add(spouseId);
        layerMap.set(spouseId, layer);
        queue.push({userId: spouseId, layer}); // Add to queue to process their children
      }
    });
    
    // Find ALL children of this person (and their spouse if any)
    const allParents = [userId, ...spouses];
    const allChildrenSets: Set<string>[] = [];
    
    // Collect all children from this person and their spouses
    allParents.forEach(parentId => {
      const directChildren = childMap.get(parentId) || [];
      directChildren.forEach(childId => {
        // Find the parent set for this child
        const childParents = parentMap.get(childId) || [];
        const parentKey = childParents.sort().join('-');
        
        // Get all siblings (children of same parent set)
        const siblings = childrenByParentSet.get(parentKey);
        if (siblings) {
          allChildrenSets.push(siblings);
        }
      });
    });
    
    // Merge all sibling sets and assign them to the SAME layer
    const allChildrenOfThisGeneration = new Set<string>();
    allChildrenSets.forEach(siblingSet => {
      siblingSet.forEach(childId => allChildrenOfThisGeneration.add(childId));
    });
    
    // Assign all children to the next layer
    const childLayer = layer + 1;
    allChildrenOfThisGeneration.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({userId: childId, layer: childLayer});
      }
    });
  }
  
  // Step 3: Verify and synchronize siblings one more time
  childrenByParentSet.forEach((siblings, parentKey) => {
    // Find the minimum layer among siblings (in case of conflicts)
    let minLayer = Infinity;
    siblings.forEach(siblingId => {
      const siblingLayer = layerMap.get(siblingId);
      if (siblingLayer !== undefined && siblingLayer < minLayer) {
        minLayer = siblingLayer;
      }
    });
    
    // Assign all siblings to the same layer
    if (minLayer !== Infinity) {
      siblings.forEach(siblingId => {
        layerMap.set(siblingId, minLayer);
        
        // Also sync their spouses to the same layer
        const spouses = spouseMap.get(siblingId) || [];
        spouses.forEach(spouseId => {
          layerMap.set(spouseId, minLayer);
        });
      });
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

  // Enhanced color scheme with better contrast and visual hierarchy - MOVED UP
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

  couples.forEach((couple, coupleId) => {
    const m1 = nodeMap.get(couple.member1);
    const m2 = nodeMap.get(couple.member2);
    if (!m1 || !m2) return;

    // Use the layer from the first member (spouses should be at same layer)
    const layer = layerMap.get(m1.userId) || 0;

    elements.push({
      data: { 
        id: coupleId, 
        type: "couple", 
        bgColor: "#ffffff", 
        gradientColors: "#ffffff #f8fafc", 
        borderColor: "#e2e8f0",
        'elk.layered.layerConstraint': layer  // Force this couple to specific layer
      }
    });

    [m1, m2].forEach((m) => {
      const isRoot = m.userId === createdByUserId;
      const isCurrent = m.userId === loggedInUserId;
      const colors = getSafeColor(m, isRoot, isCurrent);
      const safeName = m.name || '';
      const displayName = safeName.length > 12 ? safeName.substring(0, 12) + "..." : safeName;
      const memberLayer = layerMap.get(m.userId) || 0;
      elements.push({
        data: {
          id: `${coupleId}_${m.userId}`,
          parent: coupleId,
          type: "coupleMember",
          originalId: m.userId,
          displayName,
          fullName: safeName,
          email: m.email || "",
          status: m.status || "",
          relationship: m.relationship || "",
          gender: m.gender || "",
          isRoot,
          isCurrent,
          ...colors,
          profileImage: getAvatarForMember(m, m.profilePicture),
          'elk.layered.layerConstraint': memberLayer  // Force to specific layer
        }
      });
      processed.add(m.userId);
    });
  });

  // Group siblings by their shared parents for in-layer positioning
  const siblingGroupsMap = new Map<string, string[]>();
  members.forEach(m => {
    const parents = parentMap.get(m.userId) || [];
    if (parents.length > 0) {
      const parentKey = parents.sort().join('-');
      if (!siblingGroupsMap.has(parentKey)) {
        siblingGroupsMap.set(parentKey, []);
      }
      siblingGroupsMap.get(parentKey)!.push(m.userId);
    }
  });

  members.forEach((m) => {
    if (processed.has(m.userId)) return;
    const isRoot = m.userId === createdByUserId;
    const isCurrent = m.userId === loggedInUserId;
    const colors = getSafeColor(m, isRoot, isCurrent);
    const safeName = m.name || '';
    const displayName = safeName.length > 15 ? safeName.substring(0, 15) + "..." : safeName;
    const layer = layerMap.get(m.userId) || 0;
    
    // Find siblings for in-layer successor constraint
    const siblings = siblingMap.get(m.userId);
    const nodeData: any = {
      id: m.userId,
      type: "individual",
      displayName,
      fullName: safeName,
      email: m.email || "",
      status: m.status || "",
      relationship: m.relationship || "",
      gender: m.gender || "",
      isRoot,
      isCurrent,
      ...colors,
      profileImage: getAvatarForMember(m, m.profilePicture),
      'elk.layered.layerConstraint': layer  // Force to specific layer
    };
    
    // Add in-layer successor for siblings (pick first sibling as successor)
    if (siblings && siblings.size > 0) {
      const siblingArray = Array.from(siblings);
      nodeData['elk.layered.inLayerSuccessorConstraint'] = siblingArray;
    }
    
    // Current user is already highlighted with golden color, no need for crown emoji
    elements.push({ data: nodeData });
  });

  const parentEdgeSet = new Set<string>();

  relationships.forEach((rel) => {
    let sourceGroup = coupleMap.get(rel.source) || rel.source;
    const targetGroup = coupleMap.get(rel.target) || rel.target;
    if (sourceGroup === targetGroup && rel.type === "MARRIED_TO") return;
    
    const raw = String(rel.type || '').toUpperCase();
    let type: 'marriage' | 'divorced' | 'parentChild' | 'adopted' | 'sibling' = 'sibling';
    
    if (raw === 'MARRIED_TO' || raw === 'MARRIAGE') type = 'marriage';
    else if (raw === 'DIVORCED' || raw === 'DIVORCED_FROM' || raw === 'DIVORCED_TO') type = 'divorced';
    else if (raw === 'PARENTS_OF') type = 'parentChild';
    else if (raw === 'ADOPTED_PARENTS_OF' || raw === 'ADOPTED_OF' || raw === 'ADOPTED') type = 'adopted';

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

    let sourceName = rel.sourceName || "";
    if (type === "parentChild" && sourceGroup !== rel.source) {
      const parts = String(sourceGroup).split("-");
      if (parts.length === 2) {
        const p1 = nodeMap.get(parts[0]);
        const p2 = nodeMap.get(parts[1]);
        const n1 = p1?.name || parts[0];
        const n2 = p2?.name || parts[1];
        sourceName = `${n1} & ${n2}`;
      }
    }

    // CRITICAL FIX: Only create edge if both source and target nodes exist
    const sourceExists = elements.some(el => el.data.id === sourceGroup);
    const targetExists = elements.some(el => el.data.id === targetGroup);
    
    if (!sourceExists || !targetExists) {
      console.warn(`Skipping edge creation - missing nodes: source=${sourceExists}, target=${targetExists}, sourceGroup=${sourceGroup}, targetGroup=${targetGroup}`);
      return;
    }

    // Add ELK layout constraints for sibling edges to keep them at same level
    const edgeData: any = {
      id: `${type}_${sourceGroup}_${targetGroup}`,
      source: sourceGroup,
      target: targetGroup,
      type,
      relationship: rel.type,
      sourceName,
      targetName: rel.targetName || "",
      sourceUserId: rel.source,  // Store original user ID for reliable matching
      targetUserId: rel.target,  // Store original user ID for reliable matching
      curveDistances: [0, 0, 0],
      curveWeights: [0.1, 0.65, 0.95],
      edgeDash: [0, 0],
      lineStyle: "solid",
      edgeWidth: type === 'parentChild' ? 4 : 3,
      edgeColor: type === 'parentChild' ? '#00bfff' : (type === 'adopted' ? '#0ea5e9' : (type === 'marriage' ? '#dc2626' : '#2563eb'))
    };

    // CRITICAL: Completely exclude sibling edges from layout computation
    if (type === 'sibling') {
      edgeData['elk.priority'] = 0;
      edgeData['elk.layered.priority.direction'] = 0;
      edgeData['elk.edgeRouting'] = 'ORTHOGONAL';
      edgeData['elk.layered.edgeType'] = 'ASSOCIATION';
      edgeData['elk.no.layout'] = true;  // Don't use for layout calculation
      edgeData['elk.edge.thickness'] = 0;  // Zero thickness for layout
    } else {
      edgeData['elk.layered.edgeType'] = 'DIRECTED';
    }

    elements.push({ data: edgeData });
  });

  return elements;
};

// Enhanced layout options - use only parent-child edges for layering
const elkOptions: Record<string, unknown> = {
  name: "elk",
  elk: {
    "algorithm": "layered",
    "elk.direction": "DOWN",
    "elk.spacing.nodeNode": 150,  // Increased horizontal spacing between siblings
    "elk.layered.spacing.nodeNodeBetweenLayers": 150,  // Vertical spacing between generations
    "elk.spacing.edgeNode": 50,
    "elk.spacing.edgeEdge": 30,
    "elk.alignment": "CENTER",
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",  // Better for siblings at same level
    "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.layered.thoroughness": 10,
    "elk.separateConnectedComponents": false,
    "elk.spacing.componentComponent": 80,
    "elk.layered.priority.direction": 0,  // Don't prioritize any direction
    "elk.layered.layering.strategy": "INTERACTIVE",  // Respect layer constraints strictly
    "elk.layered.cycleBreaking.strategy": "GREEDY",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",  // Balance siblings
    "elk.hierarchyHandling": "INCLUDE_CHILDREN"
  }
};

const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({
  user,
  familyMembers,
  viewMode = "personal",
  minHeight = "600px",
  showControls = true,
  relationships,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const layoutRef = useRef<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const userInteractedRef = useRef(false);
  const [nodePopup, setNodePopup] = useState<{
    id: string;
    x: number;
    y: number;
    data: FamilyMember | null;
    isCoupleMember?: boolean;
  } | null>(null);

  const [coreRelationships, setCoreRelationships] = useState<CoreRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
  const [relationshipAnalysisOpen, setRelationshipAnalysisOpen] = useState(false);
  const [calculatedRelationship, setCalculatedRelationship] = useState<string>("");
  const [selectedEdge, setSelectedEdge] = useState<cytoscape.EdgeSingular | null>(null);
  const [relationshipDetailsOpen, setRelationshipDetailsOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"single" | "pair">("pair");
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FamilyMember[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Enhanced edge styling with better defaults
  const [edgeCurvature, setEdgeCurvature] = useState<number>(60);
  const [parentChildColor, setParentChildColor] = useState<string>("#20b2aa"); // Teal color like reference
  const [marriageColor, setMarriageColor] = useState<string>("#dc2626");
  const [siblingColor, setSiblingColor] = useState<string>("#2563eb");

  // Custom SVG edge rendering for perfect curved dotted lines with flowing animation
  const renderCustomEdges = useCallback(() => {
    if (!cyRef.current || !svgRef.current) return;
    
    const svg = svgRef.current;
    // Clear existing custom edges
    svg.innerHTML = '';
    
    // Add enhanced CSS for beautiful animated edges
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      .reference-edge {
        stroke-dasharray: 8 4;
        stroke-linecap: round;
        stroke-linejoin: round;
        transition: all 0.3s ease;
      }
      .reference-edge:hover {
        stroke-width: 3.5 !important;
        filter: drop-shadow(0 0 8px currentColor);
      }
      .edge-flow {
        stroke-dasharray: 8 4;
        animation: edge-flow 2s linear infinite;
      }
      @keyframes edge-flow {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: 12; }
      }
      .edge-glow {
        filter: drop-shadow(0 0 4px rgba(32, 178, 170, 0.6));
      }
    `;
    svg.appendChild(style);
    
    // Add gradient definitions for beautiful edge coloring
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Parent-child gradient (teal to blue)
    const parentGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    parentGradient.setAttribute('id', 'parentChildGradient');
    parentGradient.setAttribute('x1', '0%');
    parentGradient.setAttribute('y1', '0%');
    parentGradient.setAttribute('x2', '0%');
    parentGradient.setAttribute('y2', '100%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', parentChildColor);
    stop1.setAttribute('stop-opacity', '0.95');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '50%');
    stop2.setAttribute('stop-color', '#3b82f6');
    stop2.setAttribute('stop-opacity', '0.9');
    
    const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('stop-color', parentChildColor);
    stop3.setAttribute('stop-opacity', '0.95');
    
    parentGradient.appendChild(stop1);
    parentGradient.appendChild(stop2);
    parentGradient.appendChild(stop3);
    
    // Glow filter for edges
    const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    glowFilter.setAttribute('id', 'edgeGlow');
    glowFilter.setAttribute('x', '-50%');
    glowFilter.setAttribute('y', '-50%');
    glowFilter.setAttribute('width', '200%');
    glowFilter.setAttribute('height', '200%');
    
    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('in', 'SourceGraphic');
    blur.setAttribute('stdDeviation', '2');
    blur.setAttribute('result', 'blur');
    
    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode1.setAttribute('in', 'blur');
    const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mergeNode1);
    merge.appendChild(mergeNode2);
    
    glowFilter.appendChild(blur);
    glowFilter.appendChild(merge);
    
    defs.appendChild(parentGradient);
    defs.appendChild(glowFilter);
    svg.appendChild(defs);
    
    const edges = cyRef.current.edges('[type="parentChild"]');
    console.log('Rendering custom edges. Total parent-child edges:', edges.length);
    
    edges.forEach((edge) => {
      const edgeId = edge.id();
      const sourceId = edge.data('source');
      const targetId = edge.data('target');
      console.log('Processing edge:', edgeId, 'from', sourceId, 'to', targetId);
      
      // Get the actual target node - this could be individual or couple container
      const actualTargetNode = cyRef.current.$id(targetId);
      if (actualTargetNode.empty()) return;
      
      // For source, handle both individual nodes and couple containers
      const sourceNode = cyRef.current.$id(sourceId);
      let startX, startY;
      
      if (sourceNode.data('type') === 'couple') {
        // Source is couple container - connect from CENTER of couple node
        const sourcePos = sourceNode.renderedPosition();
        const sourceBox = sourceNode.renderedBoundingBox();
        startX = sourcePos.x; // Center X of couple container
        startY = sourceBox.y2 + 8; // Start clearly below the couple container for visibility
        console.log('Couple source:', sourceId, 'Start point:', startX, startY);
      } else {
        // Source is individual node
        const sourcePos = sourceNode.renderedPosition();
        const sourceBox = sourceNode.renderedBoundingBox();
        startX = sourcePos.x;
        startY = sourceBox.y2; // Bottom of individual node
      }
      
      // For target, always connect to the specific individual node
      let endX, endY;
      
      if (actualTargetNode.data('type') === 'couple') {
        // Target is couple container - connect to specific connection points
        const coupleMembers = actualTargetNode.children('[type="coupleMember"]');
        const containerPos = actualTargetNode.renderedPosition();
        const containerBox = actualTargetNode.renderedBoundingBox();
        
        if (coupleMembers.length >= 2) {
          // Determine which member based on target user ID and name
          const targetUserId = edge.data('targetUserId');
          const targetName = edge.data('targetName');
          let targetMember = null;
          
          // Try to match by originalId (most reliable) or fullName
          coupleMembers.forEach(member => {
            const memberOriginalId = member.data('originalId');
            const memberFullName = member.data('fullName');
            // First try to match by original user ID (most reliable)
            if (memberOriginalId === targetUserId) {
              targetMember = member;
            }
            // Fallback to name matching if ID doesn't match
            else if (!targetMember && (memberOriginalId === targetName || memberFullName === targetName)) {
              targetMember = member;
            }
          });
          
          if (targetMember) {
            // Connect to the top of the specific member within the container
            const memberPos = targetMember.renderedPosition();
            const memberBox = targetMember.renderedBoundingBox();
            endX = memberPos.x;
            endY = memberBox.y1; // Top edge of the specific member
          } else {
            // If no specific match, try to match by checking the originalId against the edge target
            const edgeTargetId = edge.data('target');
            coupleMembers.forEach(member => {
              const parentId = member.data('parent');
              const originalId = member.data('originalId');
              // Check if this couple member's parent matches the edge target
              if (parentId === edgeTargetId) {
                // Also check if the originalId is part of the coupleId
                if (!targetMember) {
                  targetMember = member;
                }
              }
            });
            
            if (targetMember) {
              const memberPos = targetMember.renderedPosition();
              const memberBox = targetMember.renderedBoundingBox();
              endX = memberPos.x;
              endY = memberBox.y1;
            } else {
              // Final fallback: use container center
              endX = containerPos.x;
              endY = containerBox.y1;
            }
          }
        } else {
          // Single member or fallback
          endX = containerPos.x;
          endY = containerBox.y1;
        }
      } else {
        // Target is individual node
        const targetPos = actualTargetNode.renderedPosition();
        const targetBox = actualTargetNode.renderedBoundingBox();
        endX = targetPos.x;
        endY = targetBox.y1; // Top of individual node
      }
      
      // Create smooth curved path with improved control for better visual appearance
      const verticalDistance = endY - startY;
      const horizontalDistance = Math.abs(endX - startX);
      
      // Adjust control points based on distance for natural curves
      const controlY1 = startY + verticalDistance * 0.3; // Gentler initial curve
      const controlY2 = endY - verticalDistance * 0.3;   // Gentler ending curve
      
      // Add slight horizontal offset for more natural S-curve when nodes are far apart
      const horizontalOffset = Math.min(horizontalDistance * 0.2, 50);
      const controlX1 = startX + (endX > startX ? horizontalOffset : -horizontalOffset) * 0.3;
      const controlX2 = endX - (endX > startX ? horizontalOffset : -horizontalOffset) * 0.3;
      
      // SVG path for smooth bezier curve with natural flow
      const pathData = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
      
      // Create a group for the edge with all its elements
      const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      edgeGroup.setAttribute('class', 'edge-group');
      edgeGroup.setAttribute('data-edge-id', edgeId);
      
      // Background glow path for depth effect
      const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      glowPath.setAttribute('d', pathData);
      glowPath.setAttribute('stroke', parentChildColor);
      glowPath.setAttribute('stroke-width', '8');
      glowPath.setAttribute('fill', 'none');
      glowPath.setAttribute('opacity', '0.25');
      glowPath.setAttribute('filter', 'url(#edgeGlow)');
      
      // Main path with solid color and flowing animation (more visible)
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', parentChildColor); // Use solid color instead of gradient for better visibility
      path.setAttribute('stroke-width', '3.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('class', 'reference-edge edge-flow');
      path.setAttribute('opacity', '1');
      
      // Invisible wider path for easier hover interaction
      const hoverPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hoverPath.setAttribute('d', pathData);
      hoverPath.setAttribute('stroke', 'transparent');
      hoverPath.setAttribute('stroke-width', '20');
      hoverPath.setAttribute('fill', 'none');
      hoverPath.style.cursor = 'pointer';
      hoverPath.style.pointerEvents = 'auto';
      
      // Get relationship info for tooltip
      const sourceNodeData = cyRef.current.$id(sourceId);
      const targetNodeData = cyRef.current.$id(targetId);
      const sourceName = edge.data('sourceName') || 'Parent';
      const targetName = edge.data('targetName') || 'Child';
      
      // Add hover effects and tooltip
      hoverPath.addEventListener('mouseenter', (e) => {
        path.setAttribute('stroke-width', '5');
        path.setAttribute('opacity', '1');
        glowPath.setAttribute('opacity', '0.5');
        
        // Highlight connected nodes
        sourceNodeData.addClass('highlighted');
        targetNodeData.addClass('highlighted');
        
        // Show tooltip
        const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tooltip.setAttribute('class', 'edge-tooltip');
        tooltip.setAttribute('id', `tooltip-${edgeId}`);
        
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2 - 20;
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(midX - 60));
        rect.setAttribute('y', String(midY - 15));
        rect.setAttribute('width', '120');
        rect.setAttribute('height', '30');
        rect.setAttribute('fill', 'white');
        rect.setAttribute('stroke', parentChildColor);
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('rx', '6');
        rect.setAttribute('opacity', '0.95');
        rect.setAttribute('filter', 'url(#edgeGlow)');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(midX));
        text.setAttribute('y', String(midY + 5));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#1f2937');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.textContent = '👨‍👩‍👧 Parent → Child';
        
        tooltip.appendChild(rect);
        tooltip.appendChild(text);
        svg.appendChild(tooltip);
      });
      
      hoverPath.addEventListener('mouseleave', () => {
        path.setAttribute('stroke-width', '3.5');
        path.setAttribute('opacity', '1');
        glowPath.setAttribute('opacity', '0.25');
        
        // Remove highlight from nodes
        sourceNodeData.removeClass('highlighted');
        targetNodeData.removeClass('highlighted');
        
        // Remove tooltip
        const tooltip = svg.querySelector(`#tooltip-${edgeId}`);
        if (tooltip) tooltip.remove();
      });
      
      // Create small triangle arrowhead with gradient
      const arrowSize = 8;
      const angle = Math.atan2(endY - controlY2, endX - controlX2);
      const arrowX1 = endX - arrowSize * Math.cos(angle - Math.PI / 6.5);
      const arrowY1 = endY - arrowSize * Math.sin(angle - Math.PI / 6.5);
      const arrowX2 = endX - arrowSize * Math.cos(angle + Math.PI / 6.5);
      const arrowY2 = endY - arrowSize * Math.sin(angle + Math.PI / 6.5);
      
      const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arrowPath.setAttribute('d', `M ${endX} ${endY} L ${arrowX1} ${arrowY1} L ${arrowX2} ${arrowY2} Z`);
      arrowPath.setAttribute('fill', parentChildColor);
      arrowPath.setAttribute('stroke', 'white');
      arrowPath.setAttribute('stroke-width', '0.5');
      arrowPath.setAttribute('opacity', '0.95');
      arrowPath.setAttribute('filter', 'url(#edgeGlow)');
      
      // Assemble edge group
      edgeGroup.appendChild(glowPath);
      edgeGroup.appendChild(path);
      edgeGroup.appendChild(arrowPath);
      edgeGroup.appendChild(hoverPath);
      
      svg.appendChild(edgeGroup);
    });
    
    // Add decorative elements for couple nodes (hearts and connection indicators)
    const coupleNodes = cyRef.current.nodes('[type="couple"]');
    coupleNodes.forEach((coupleNode) => {
      const couplePos = coupleNode.renderedPosition();
      const coupleBox = coupleNode.renderedBoundingBox();
      const coupleMembers = coupleNode.children('[type="coupleMember"]');
      
      if (coupleMembers.length >= 2) {
        // Draw a small heart icon between the couple members
        const member1Pos = coupleMembers[0].renderedPosition();
        const member2Pos = coupleMembers[1].renderedPosition();
        const heartX = (member1Pos.x + member2Pos.x) / 2;
        const heartY = couplePos.y;
        
        // Create heart group
        const heartGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        heartGroup.setAttribute('class', 'couple-heart');
        
        // Background circle for heart
        const heartBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        heartBg.setAttribute('cx', String(heartX));
        heartBg.setAttribute('cy', String(heartY));
        heartBg.setAttribute('r', '12');
        heartBg.setAttribute('fill', '#fef2f2');
        heartBg.setAttribute('stroke', '#fca5a5');
        heartBg.setAttribute('stroke-width', '1.5');
        heartBg.setAttribute('opacity', '0.95');
        
        // Heart emoji as text
        const heartText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        heartText.setAttribute('x', String(heartX));
        heartText.setAttribute('y', String(heartY + 5));
        heartText.setAttribute('text-anchor', 'middle');
        heartText.setAttribute('font-size', '14');
        heartText.textContent = '💕';
        
        heartGroup.appendChild(heartBg);
        heartGroup.appendChild(heartText);
        svg.appendChild(heartGroup);
      }
      
      // Add connection point indicator at bottom center of couple node
      const bottomCenterX = couplePos.x;
      const bottomCenterY = coupleBox.y2;
      
      // Check if this couple has any children (outgoing parent-child edges)
      const hasChildren = cyRef.current.edges('[type="parentChild"]').some(e => 
        e.data('source') === coupleNode.id()
      );
      
      if (hasChildren) {
        // Draw a short vertical line from couple bottom to where edges start
        const connectorLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        connectorLine.setAttribute('x1', String(bottomCenterX));
        connectorLine.setAttribute('y1', String(bottomCenterY));
        connectorLine.setAttribute('x2', String(bottomCenterX));
        connectorLine.setAttribute('y2', String(bottomCenterY + 8)); // Match the +8 offset from edge start
        connectorLine.setAttribute('stroke', parentChildColor);
        connectorLine.setAttribute('stroke-width', '3');
        connectorLine.setAttribute('opacity', '1');
        svg.appendChild(connectorLine);
        
        // Draw a decorative connection point at the bottom of couple
        const connectorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        connectorGroup.setAttribute('class', 'couple-connector');
        
        // Outer circle
        const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        outerCircle.setAttribute('cx', String(bottomCenterX));
        outerCircle.setAttribute('cy', String(bottomCenterY));
        outerCircle.setAttribute('r', '10');
        outerCircle.setAttribute('fill', parentChildColor);
        outerCircle.setAttribute('opacity', '0.35');
        
        // Inner circle
        const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        innerCircle.setAttribute('cx', String(bottomCenterX));
        innerCircle.setAttribute('cy', String(bottomCenterY));
        innerCircle.setAttribute('r', '6');
        innerCircle.setAttribute('fill', 'white');
        innerCircle.setAttribute('stroke', parentChildColor);
        innerCircle.setAttribute('stroke-width', '2.5');
        innerCircle.setAttribute('opacity', '1');
        
        connectorGroup.appendChild(outerCircle);
        connectorGroup.appendChild(innerCircle);
        svg.appendChild(connectorGroup);
      }
    });
  }, [parentChildColor]);

  useEffect(() => {
    if (Array.isArray(relationships)) {
      setCoreRelationships(relationships || []);
      setIsLoading(false);
      return;
    }
    const fetch = async () => {
      setIsLoading(true);
      try {
        let rels: CoreRelationship[] = [];
        if (viewMode === "personal") {
          const personal = (await getUserPersonalizedFamilyTree(user.userId, user.familyTreeId)) as PersonalizedRelationship[];
          const mapped = personal.map((r): CoreRelationship | null => {
            const t = String(r.type || "").toLowerCase();
            let core: CoreRelationship["type"] | null = null;
            if (["father", "mother", "son", "daughter", "grandfather", "grandmother", "grandson", "granddaughter"].includes(t)) core = "PARENTS_OF";
            else if (["husband", "wife", "spouse"].includes(t)) core = "MARRIED_TO";
            else if (["brother", "sister", "sibling"].includes(t)) core = "SIBLING";
            if (!core) return null;
            return { source: r.source, target: r.target, type: core, sourceName: r.sourceName, targetName: r.targetName };
          });
          const isCore = (x: CoreRelationship | null): x is CoreRelationship => x !== null;
          rels = mapped.filter(isCore);
        } else {
          rels = await getFamilyRelationships(user.familyTreeId);
        }
        setCoreRelationships(rels);
      } catch (e) {
        console.error("fetch relationships error", e);
        setCoreRelationships([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [user.userId, user.familyTreeId, viewMode, relationships]);

  // Force loading to false if we have members (even with no relationships)
  useEffect(() => {
    if (familyMembers.length > 0) {
      setIsLoading(false);
    }
  }, [familyMembers]);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements = createCytoscapeElements(
      familyMembers || [],
      coreRelationships || [],
      user.createdBy === "self" ? user.userId : (user.createdBy || user.userId),
      user.userId
    );

    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      // @ts-expect-error cytoscape's StylesheetJson typing is stricter than the runtime accepts
      style: getCytoscapeStyles(),
      zoomingEnabled: true,
      panningEnabled: true,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autounselectify: false,
      autoungrabify: true,
      minZoom: 0.2,
      maxZoom: 4,
      wheelSensitivity: 0.2
    });

    // Enhanced hover effects
    cyRef.current.on("mouseover", "node", (evt: cytoscape.EventObject) => {
      (evt.target as cytoscape.NodeSingular).addClass("hover");
    });
    cyRef.current.on("mouseout", "node", (evt: cytoscape.EventObject) => {
      (evt.target as cytoscape.NodeSingular).removeClass("hover");
    });

    cyRef.current.on("tap", "node", (evt: cytoscape.EventObject) => {
      userInteractedRef.current = true;
      const node = evt.target as cytoscape.NodeSingular;
      const nodeId: string = (node.data("originalId") as string) || node.id();
      setSelectedNodes((prev) => {
        let next = prev;
        if (prev.includes(nodeId)) {
          next = prev.filter((s) => s !== nodeId);
          node.removeClass("selected");
          setRelationshipAnalysisOpen(false);
          setNodeDetailsOpen(next.length === 1);
        } else if ((selectionMode === "pair" && prev.length < 2) || (selectionMode === "single" && prev.length < 1)) {
          next = [...prev, nodeId];
          node.addClass("selected");
          if (selectionMode === "single" && next.length === 1) {
            setActiveMemberId(nodeId);
            setNodeDetailsOpen(true);
            setTimeout(() => {
              setSelectedNodes([]);
              if (cyRef.current) {
                cyRef.current.nodes().removeClass("selected");
              }
            }, 0);
          } else if (next.length === 1) {
            setNodeDetailsOpen(true);
          }
          if (selectionMode === "pair" && next.length === 2) {
            const rel = calculateRelationship(next[0], next[1], coreRelationships, familyMembers);
            setCalculatedRelationship(rel);
            setRelationshipAnalysisOpen(true);
            setNodeDetailsOpen(false);
            setTimeout(() => {
              setSelectedNodes([]);
              if (cyRef.current) {
                cyRef.current.nodes().removeClass("selected");
              }
            }, 0);
          }
        }
        return next;
      });

      const rawId: string = node.data("originalId") || node.id();
      const member = familyMembers.find((m) => m.userId === rawId) || null;
      const bb = node.renderedBoundingBox();
      const x = bb.x2 + 15;
      const y = bb.y1;
      setNodePopup({ id: node.id(), x, y, data: member, isCoupleMember: node.data("type") === "coupleMember" });
    });

    cyRef.current.on("tap", "edge", (evt: cytoscape.EventObject) => {
      const edge = evt.target as cytoscape.EdgeSingular;
      if (edge.hasClass("showLabel")) {
        edge.removeClass("showLabel");
      } else {
        if (cyRef.current) {
          cyRef.current.edges().removeClass("showLabel");
        }
        edge.addClass("showLabel");
      }
      setSelectedEdge(edge);
      setRelationshipDetailsOpen(true);
    });

    cyRef.current.on("tap", (evt: cytoscape.EventObject) => {
      if (evt.target === cyRef.current) {
        setSelectedNodes([]);
        cyRef.current.nodes().removeClass("selected");
        setNodeDetailsOpen(false);
        setRelationshipAnalysisOpen(false);
        setNodePopup(null);
      }
    });

    // Choose layout engine with fallback
    const elementCount = cyRef.current.elements().length;
    const edgeCount = cyRef.current.edges().length;
    const preferGrid = elementCount < 3 || edgeCount === 0;
    
    // CRITICAL FIX: Temporarily hide sibling edges during layout to prevent vertical stacking
    const siblingEdges = cyRef.current.edges('[type = "sibling"]');
    const hiddenSiblingEdges = siblingEdges.style('display', 'none');
    
    // Run layout WITHOUT sibling edges
    let layout = cyRef.current.layout(preferGrid ? { name: 'grid', fit: true, padding: 50 } : elkOptions);
    layoutRef.current = layout;
    
    // Enhanced edge shaping with perfect centering for children
    const shapeParentChildEdges = () => {
      if (!cyRef.current) return;
      const edges = cyRef.current.edges('[type = "parentChild"]');
      
      // Group edges by source (parent/couple)
      const groups = new Map<string, cytoscape.EdgeSingular[]>();
      edges.forEach((e) => {
        const sid = e.source().id();
        const arr = groups.get(sid) || [];
        arr.push(e as cytoscape.EdgeSingular);
        groups.set(sid, arr);
      });

      groups.forEach((childEdges) => {
        const count = childEdges.length;
        
        if (count === 1) {
          // Single child: slight straight start then a gentle curve into the node
          childEdges[0].data({ 
            curveDistances: [0, Math.min(edgeCurvature, 80) * 0.6, 0], 
            curveWeights: [0.1, 0.65, 0.95],
            lineStyle: 'dotted', 
            edgeWidth: 2, 
            edgeColor: parentChildColor 
          });
          return;
        }

        // Multiple children: center them symmetrically
        const spacing = Math.min(edgeCurvature, 80); // Max spacing to prevent overcrowding
        const totalWidth = (count - 1) * spacing;
        const startOffset = -totalWidth / 2;

        childEdges.forEach((edge, index) => {
          const horizontalOffset = startOffset + (index * spacing);
          // Straight near source (0), then bulge, then 0 near target
          const distances = [0, horizontalOffset, 0];
          const weights = [0.1, 0.65, 0.95];
          edge.data({ 
            curveDistances: distances, 
            curveWeights: weights,
            lineStyle: 'dotted', 
            edgeWidth: 2, 
            edgeColor: parentChildColor 
          });
        });
      });

      // Update other edge colors
      cyRef.current.edges('[type = "marriage"]').data('line-color', marriageColor);
      cyRef.current.edges('[type = "sibling"]').data('line-color', siblingColor);
    };

    // Perfect centering and fitting on layout completion
    cyRef.current.one('layoutstop', () => {
      if (!cyRef.current) return;
      
      // First shape the edges for proper hierarchy
      shapeParentChildEdges();
      
      // Then fit and center the entire tree
      setTimeout(() => {
        if (!cyRef.current) return;
        if (!userInteractedRef.current) {
          cyRef.current.fit(undefined, 80);
          cyRef.current.center();
        }
        // Update popup position if open
        setNodePopup((prev) => {
          if (!prev) return prev;
          const n = cyRef.current!.$id(prev.id);
          if (!n.empty()) {
            const bb = n.renderedBoundingBox();
            return { ...prev, x: bb.x2 + 15, y: bb.y1 };
          }
          return prev;
        });
      }, 100);
    });

    // Listen for layout completion to restore sibling edges
    layout.on('layoutstop', () => {
      // Restore sibling edges after layout is complete
      if (siblingEdges && cyRef.current) {
        siblingEdges.style('display', 'element');
      }
    });

    try {
      if (cyRef.current && !cyRef.current.destroyed() && cyRef.current.elements().length > 0) {
        layout.run();
      }
    } catch (err) {
      // Fallback to grid layout to avoid crashes if ELK fails
      try {
        if (cyRef.current && !cyRef.current.destroyed()) {
          // Restore sibling edges before fallback layout
          if (siblingEdges) {
            siblingEdges.style('display', 'element');
          }
          layout = cyRef.current.layout({ name: 'grid', fit: true, padding: 50 });
          layoutRef.current = layout;
          layout.run();
        }
      } catch (e2) {
        console.error('Cytoscape layout failed', e2);
        // Ensure sibling edges are visible even on error
        if (siblingEdges && cyRef.current && !cyRef.current.destroyed()) {
          siblingEdges.style('display', 'element');
        }
      }
    }

    // Enhanced resize handling for consistent centering
    let ro: ResizeObserver | null = null;
    const containerEl = containerRef.current;
    if (containerEl) {
      ro = new ResizeObserver(() => {
        if (!cyRef.current || cyRef.current.destroyed()) return;
        cyRef.current.resize();
        // Do NOT auto-fit/center here, to preserve user zoom/pan
        renderCustomEdges();
        setNodePopup((prev) => {
          if (!prev) return prev;
          const n = cyRef.current!.$id(prev.id);
          if (!n.empty()) {
            const bb = n.renderedBoundingBox();
            return { ...prev, x: bb.x2 + 15, y: bb.y1 };
          }
          return prev;
        });
      });
      ro.observe(containerEl);
    }

    const updatePopupPosition = () => {
      if (!cyRef.current) return;
      setNodePopup((prev) => {
        if (!prev) return prev;
        const n = cyRef.current!.$id(prev.id);
        if (!n.empty()) {
          const bb = n.renderedBoundingBox();
          return { ...prev, x: bb.x2 + 15, y: bb.y1 };
        }
        return prev;
      });
    };
    cyRef.current.on('pan zoom', () => { userInteractedRef.current = true; updatePopupPosition(); });
    cyRef.current.on('pan zoom', renderCustomEdges);
    
    // Add dynamic edge updates for node movement
    cyRef.current.on('drag', 'node', renderCustomEdges);
    cyRef.current.on('position', 'node', renderCustomEdges);
    cyRef.current.on('move', 'node', renderCustomEdges);
    cyRef.current.on('grab', 'node', renderCustomEdges);
    cyRef.current.on('free', 'node', renderCustomEdges);

    // Initial render of custom edges
    setTimeout(renderCustomEdges, 100);

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      if (ro && containerEl) {
        ro.unobserve(containerEl);
        ro.disconnect();
      }
      cyRef.current?.off('pan', updatePopupPosition);
      cyRef.current?.off('zoom', updatePopupPosition);
    };
  }, [coreRelationships, familyMembers, user, selectionMode, parentChildColor, marriageColor, siblingColor, edgeCurvature, renderCustomEdges]);

  // Update edge styling when colors change
  useEffect(() => {
    if (!cyRef.current) return;
    
    const updateEdgeColors = () => {
      cyRef.current!.edges('[type = "parentChild"]').data('edgeColor', parentChildColor);
      cyRef.current!.edges('[type = "marriage"]').data('line-color', marriageColor);
      cyRef.current!.edges('[type = "sibling"]').data('line-color', siblingColor);
      
      // Re-shape parent-child edges with new curvature
      const edges = cyRef.current!.edges('[type = "parentChild"]');
      const groups = new Map<string, cytoscape.EdgeSingular[]>();
      edges.forEach((e) => {
        const sid = e.source().id();
        const arr = groups.get(sid) || [];
        arr.push(e as cytoscape.EdgeSingular);
        groups.set(sid, arr);
      });

      groups.forEach((childEdges) => {
        const count = childEdges.length;
        
        if (count === 1) {
          childEdges[0].data({ 
            curveDistances: [0, Math.min(edgeCurvature, 80) * 0.6, 0], 
            curveWeights: [0.1, 0.65, 0.95],
            edgeColor: parentChildColor 
          });
          return;
        }

        const spacing = Math.min(edgeCurvature, 80);
        const totalWidth = (count - 1) * spacing;
        const startOffset = -totalWidth / 2;

        childEdges.forEach((edge, index) => {
          const horizontalOffset = startOffset + (index * spacing);
          const distances = [0, horizontalOffset, 0];
          const weights = [0.1, 0.65, 0.95];
          edge.data({ 
            curveDistances: distances, 
            curveWeights: weights,
            edgeColor: parentChildColor 
          });
        });
      });
    };

    updateEdgeColors();
    renderCustomEdges(); // Re-render edges when colors or curvature change
  }, [edgeCurvature, parentChildColor, marriageColor, siblingColor, renderCustomEdges]);


  const calculateRelationship = (
    person1Id: string,
    person2Id: string,
    coreRels: CoreRelationship[],
    members: FamilyMember[]
  ): string => {
    const p1 = members.find((m) => m.userId === person1Id);
    const p2 = members.find((m) => m.userId === person2Id);
    if (!p1 || !p2) return "Unknown relationship";
    
    const parentMap = new Map<string, string[]>();
    const childMap = new Map<string, string[]>();
    const spouseMap = new Map<string, string[]>();
    const siblingMap = new Map<string, string[]>();
    
    coreRels.forEach((r) => {
      if (r.type === "PARENTS_OF") {
        if (!parentMap.has(r.source)) parentMap.set(r.source, []);
        parentMap.get(r.source)!.push(r.target);
        if (!childMap.has(r.target)) childMap.set(r.target, []);
        childMap.get(r.target)!.push(r.source);
      } else if (r.type === "MARRIED_TO") {
        if (!spouseMap.has(r.source)) spouseMap.set(r.source, []);
        spouseMap.get(r.source)!.push(r.target);
        if (!spouseMap.has(r.target)) spouseMap.set(r.target, []);
        spouseMap.get(r.target)!.push(r.source);
      } else if (r.type === "SIBLING") {
        if (!siblingMap.has(r.source)) siblingMap.set(r.source, []);
        siblingMap.get(r.source)!.push(r.target);
        if (!siblingMap.has(r.target)) siblingMap.set(r.target, []);
        siblingMap.get(r.target)!.push(r.source);
      }
    });
    
    if (spouseMap.get(person1Id)?.includes(person2Id)) return `${p1.name} and ${p2.name} are married to each other`;
    if (parentMap.get(person1Id)?.includes(person2Id)) return `${p1.name} is the parent of ${p2.name}`;
    if (childMap.get(person1Id)?.includes(person2Id)) return `${p1.name} is the child of ${p2.name}`;
    if (siblingMap.get(person1Id)?.includes(person2Id)) return `${p1.name} and ${p2.name} are siblings`;
    return `${p1.name} and ${p2.name} appear to be distantly related or not directly connected`;
  };

  // Enhanced UI controls
  const handleZoomIn = () => {
    if (!cyRef.current) return;
    cyRef.current.zoom({ level: cyRef.current.zoom() * 1.25, renderedPosition: { x: 0, y: 0 } });
  };
  
  const handleZoomOut = () => {
    if (!cyRef.current) return;
    cyRef.current.zoom({ level: cyRef.current.zoom() / 1.25, renderedPosition: { x: 0, y: 0 } });
  };
  
  const handleFit = () => {
    if (!cyRef.current) return;
    cyRef.current.fit(undefined, 60);
    cyRef.current.center();
  };
  
  const handleRelayout = () => {
    if (!cyRef.current) return;
    
    // Hide sibling edges during relayout
    const siblingEdges = cyRef.current.edges('[type = "sibling"]');
    siblingEdges.style('display', 'none');
    
    const layout = cyRef.current.layout(elkOptions);
    
    // Restore sibling edges after layout
    layout.on('layoutstop', () => {
      if (siblingEdges && cyRef.current) {
        siblingEdges.style('display', 'element');
      }
    });
    
    layout.run();
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.fit(undefined, 60);
        cyRef.current.center();
        renderCustomEdges();
      }
    }, 800);
  };

  const enterFullscreen = () => {
    setIsFullscreen(true);
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit(undefined, 60);
        cyRef.current.center();
        renderCustomEdges();
      }
    }, 50);
  };

  const exitFullscreen = () => {
    setIsFullscreen(false);
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit(undefined, 60);
        cyRef.current.center();
        renderCustomEdges();
      }
    }, 50);
  };

  const selectedMember = (() => {
    if (activeMemberId) return familyMembers.find((m) => m.userId === activeMemberId) || null;
    if (selectedNodes.length === 1) return familyMembers.find((m) => m.userId === selectedNodes[0]) || null;
    return null;
  })();

  return (
    <div className="w-full relative" style={{ minHeight }}>
      {showControls && (
        <div className="flex items-center gap-1 mb-4">
          <button
            type="button"
            onClick={enterFullscreen}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            title="Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleFit}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            title="Fit to View"
          >
            <Maximize className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            title="Search Member"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      )}

      {isFullscreen && (
        <div className="fixed top-4 left-4 z-[1000] flex items-center gap-2">
          <button
            type="button"
            onClick={exitFullscreen}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Back</span>
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleFit}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            title="Fit to View"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      )}
      {/* Search Panel */}
      {showSearch && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search family member by name..."
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                if (query.trim()) {
                  const results = familyMembers.filter(member => 
                    member.name.toLowerCase().includes(query.toLowerCase())
                  );
                  setSearchResults(results);
                } else {
                  setSearchResults([]);
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {searchResults.map(member => (
                <button
                  key={member.userId}
                  onClick={() => {
                    if (cyRef.current) {
                      console.log('Searching for member:', member.name, 'ID:', member.userId);
                      
                      // Remove previous highlights
                      cyRef.current.nodes().removeClass('highlighted');
                      
                      const node = cyRef.current.getElementById(member.userId);
                      console.log('Found node:', node.length > 0);
                      
                      if (node.length > 0) {
                        // Stop any ongoing animations
                        cyRef.current.stop();
                        
                        // Smoothly center to the node while preserving current zoom
                        cyRef.current.animate({
                          center: { eles: node }
                        }, {
                          duration: 800,
                          easing: 'ease-in-out',
                          complete: () => {
                            node.addClass('highlighted');
                            setTimeout(() => node.removeClass('highlighted'), 4000);
                          }
                        });
                      } else {
                        console.warn('Node not found for member:', member.userId);
                      }
                    }
                    // Keep search open for multiple searches
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded-md border border-gray-200 transition-colors"
                >
                  <div className="font-medium text-gray-900">{member.name}</div>
                  <div className="text-sm text-gray-500">{member.relationship || 'Family Member'}</div>
                </button>
              ))}
            </div>
          )}
          
          {searchQuery && searchResults.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-2">
              No members found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}

      <div className={isFullscreen ? "fixed inset-0 z-[900] bg-white" : "relative"}>
        <div
          ref={containerRef}
          className={isFullscreen ? "absolute inset-0 bg-white" : "w-full rounded-xl shadow-lg ring-1 ring-gray-200 bg-white/60 backdrop-blur-sm"}
          style={{ minHeight: isFullscreen ? undefined : minHeight }}
        />
        
        {/* Custom SVG overlay for perfect curved dotted edges */}
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%', zIndex: 10 }}
        />


        {/* Enhanced Popup Card */}
        {nodePopup && nodePopup.data && (
          <div 
            className="absolute z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border-2 border-blue-200 p-3 min-w-[200px] transform transition-all duration-200"
            style={{ 
              left: `${nodePopup.x}px`, 
              top: `${nodePopup.y}px`,
              maxWidth: '250px'
            }}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                <img 
                  src={nodePopup.data.profilePicture || "/placeholder.svg"} 
                  alt={nodePopup.data.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const defaultColors = { bgColor: "#8b5cf6", borderColor: "#7c3aed" };
                    const initials = nodePopup.data!.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    const svg = `data:image/svg+xml;base64,${btoa(`
                      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="24" cy="24" r="22" fill="${defaultColors.bgColor}" stroke="${defaultColors.borderColor}" stroke-width="2"/>
                        <text x="24" y="30" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">${initials}</text>
                      </svg>
                    `)}`;
                    target.src = svg;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{nodePopup.data.name}</h3>
                {nodePopup.data.email && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{nodePopup.data.email}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {nodePopup.data.gender && (
                    <Badge variant="secondary" className="text-xs">{nodePopup.data.gender}</Badge>
                  )}
                  {nodePopup.data.status && (
                    <Badge variant="outline" className="text-xs">{nodePopup.data.status}</Badge>
                  )}
                  {nodePopup.data.relationship && (
                    <Badge className="text-xs">{nodePopup.data.relationship}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay with better styling */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-white/50 backdrop-blur-sm rounded-xl">
          <div className="rounded-lg bg-white shadow-lg px-6 py-4 text-sm font-medium text-gray-700 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Loading family tree...
          </div>
        </div>
      )}

      {/* Enhanced Node Details Dialog */}
      <Dialog
        open={nodeDetailsOpen}
        onOpenChange={(open) => {
          setNodeDetailsOpen(open);
          if (!open) setActiveMemberId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              Member Details
            </DialogTitle>
            <DialogDescription>Complete information about the selected family member</DialogDescription>
          </DialogHeader>
          {selectedMember ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-gray-200">
                  <img 
                    src={selectedMember.profilePicture || "/placeholder.svg"} 
                    alt={selectedMember.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedMember.name}</h3>
                  {selectedMember.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Mail className="w-4 h-4" /> 
                      <span>{selectedMember.email}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {selectedMember.gender && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gender</label>
                    <Badge variant="secondary" className="mt-1">{selectedMember.gender}</Badge>
                  </div>
                )}
                {selectedMember.status && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                    <Badge variant="outline" className="mt-1">{selectedMember.status}</Badge>
                  </div>
                )}
                {selectedMember.relationship && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Relationship</label>
                    <Badge className="mt-1">{selectedMember.relationship}</Badge>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              Select a single node to view details.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Relationship Analysis Dialog */}
      <Dialog open={relationshipAnalysisOpen} onOpenChange={setRelationshipAnalysisOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold">↔</span>
              </div>
              Relationship Analysis
            </DialogTitle>
            <DialogDescription>Understanding the connection between selected family members</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border-l-4 border-blue-500">
              <p className="text-gray-800 font-medium">{calculatedRelationship}</p>
            </div>
            {selectedNodes.length === 2 && (
              <div className="grid grid-cols-2 gap-4">
                {selectedNodes.map((nodeId, index) => {
                  const member = familyMembers.find(m => m.userId === nodeId);
                  if (!member) return null;
                  return (
                    <div key={nodeId} className="text-center">
                      <div className="w-12 h-12 mx-auto rounded-full overflow-hidden border-2 border-gray-200 mb-2">
                        <img 
                          src={member.profilePicture || "/placeholder.svg"} 
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="font-medium text-sm">{member.name}</p>
                      {member.relationship && (
                        <p className="text-xs text-gray-600">{member.relationship}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Edge Details Dialog */}
      <Dialog open={relationshipDetailsOpen} onOpenChange={setRelationshipDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 font-bold">—</span>
              </div>
              Connection Details
            </DialogTitle>
            <DialogDescription>Information about the selected relationship</DialogDescription>
          </DialogHeader>
          {selectedEdge ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Relationship Type:</span>
                  <Badge variant={
                    selectedEdge.data("type") === "marriage" ? "default" :
                    selectedEdge.data("type") === "parentChild" ? "secondary" : "outline"
                  }>
                    {selectedEdge.data("relationship")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">From:</span>
                  <span className="text-sm">{selectedEdge.data("sourceName") || selectedEdge.data("source")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">To:</span>
                  <span className="text-sm">{selectedEdge.data("targetName") || selectedEdge.data("target")}</span>
                </div>
              </div>
              
              {/* Visual representation of the edge */}
              <div className="flex items-center justify-center p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                  <div className={`h-0.5 w-12 ${
                    selectedEdge.data("type") === "marriage" ? "bg-red-600" :
                    selectedEdge.data("type") === "parentChild" ? "bg-green-500" :
                    selectedEdge.data("type") === "sibling" ? "bg-blue-600" : "bg-gray-400"
                  }`}></div>
                  <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              Select an edge to view connection details.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeVisualization;