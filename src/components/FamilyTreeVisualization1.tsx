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
      "transition-property": "border-width, background-color, width, height",
      "transition-duration": 300,
    }
  },
  {
    selector: 'node.hover',
    style: {
      'border-width': 3,
      'border-color': '#3b82f6',
      'border-opacity': 0.8,
    }
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-width': 4,
      'border-color': '#ef4444',
      'border-opacity': 1,
      'box-shadow': '0 0 20px #ef4444'
    }
  },
  {
    selector: 'node[type="couple"]',
    style: {
      width: 240,
      height: 130,
      shape: "roundrectangle",
      "background-color": "#ffffff",
      "background-opacity": 0.9,
      "border-width": 2,
      "border-color": "#e5e7eb",
      "border-opacity": 0.8,
      label: "",
      "overlay-opacity": 0,
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
      "transition-property": "border-width, background-color, width, height",
      "transition-duration": 300
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
      label: "💔",
      color: "#374151",
      'text-background-color': '#ffffff',
      'text-background-opacity': 0.95,
      'text-background-padding': 4,
      'text-background-shape': 'roundrectangle',
      'font-size': 12
    }
  },
  // PARENT-CHILD EDGES - Hidden, will use custom SVG overlay
  {
    selector: 'edge[type="parentChild"]',
    style: {
      opacity: 0, // Hide cytoscape edges, use custom SVG overlay
    }
  },
  // SIBLING EDGES - Blue horizontal lines
  {
    selector: 'edge[type="sibling"]',
    style: {
      width: 3,
      "line-color": "#2563eb",
      "curve-style": "straight",
      "line-style": "solid",
      // Hide sibling connectors to match reference
      opacity: 0
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

    elements.push({
      data: { 
        id: coupleId, 
        type: "couple", 
        bgColor: "#ffffff", 
        gradientColors: "#ffffff #f8fafc", 
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

    elements.push({
      data: {
        id: `${type}_${sourceGroup}_${targetGroup}`,
        source: sourceGroup,
        target: targetGroup,
        type,
        relationship: rel.type,
        sourceName,
        targetName: rel.targetName || "",
        curveDistances: [0, 0, 0],
        curveWeights: [0.1, 0.65, 0.95],
        edgeDash: [0, 0],
        lineStyle: "solid",
        edgeWidth: type === 'parentChild' ? 4 : 3,
        edgeColor: type === 'parentChild' ? '#00bfff' : (type === 'adopted' ? '#0ea5e9' : (type === 'marriage' ? '#dc2626' : '#2563eb'))
      }
    });
  });

  return elements;
};

// Enhanced layout options for better hierarchy alignment
const elkOptions: Record<string, unknown> = {
  name: "elk",
  elk: {
    "algorithm": "layered",
    "elk.direction": "DOWN",
    "elk.spacing.nodeNode": 100,
    "elk.layered.spacing.nodeNodeBetweenLayers": 150,
    "elk.spacing.edgeNode": 50,
    "elk.spacing.edgeEdge": 30,
    "elk.alignment": "CENTER"
  }
};

const FamilyTreeVisualization: React.FC<FamilyTreeVisualizationProps> = ({
  user,
  familyMembers,
  viewMode = "personal",
  minHeight = "600px",
  showControls = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
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
  const [isLoading, setIsLoading] = useState(true);
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
    
    // Add CSS for static dashed lines like in reference image
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      .reference-edge {
        stroke-dasharray: 5 3;
        stroke-linecap: round;
      }
    `;
    svg.appendChild(style);
    
    const edges = cyRef.current.edges('[type="parentChild"]');
    
    edges.forEach((edge) => {
      const edgeId = edge.id();
      const sourceId = edge.data('source');
      const targetId = edge.data('target');
      
      // Get the actual target node - this could be individual or couple container
      const actualTargetNode = cyRef.current.$id(targetId);
      if (actualTargetNode.empty()) return;
      
      // For source, handle both individual nodes and couple containers
      const sourceNode = cyRef.current.$id(sourceId);
      let startX, startY;
      
      if (sourceNode.data('type') === 'couple') {
        // Source is couple container - determine which member is the actual parent
        const sourceMembers = sourceNode.children('[type="coupleMember"]');
        const sourceName = edge.data('sourceName');
        
        let sourceParent = null;
        // Find the specific parent within the couple
        sourceMembers.forEach(member => {
          if (member.data('name') === sourceName || member.data('userId') === sourceName) {
            sourceParent = member;
          }
        });
        
        if (sourceParent) {
          // Connect from the specific parent's position
          const parentPos = sourceParent.renderedPosition();
          const parentBox = sourceParent.renderedBoundingBox();
          startX = parentPos.x;
          startY = parentBox.y2; // Bottom of specific parent
        } else {
          // Fallback to container center
          const sourcePos = sourceNode.renderedPosition();
          const sourceBox = sourceNode.renderedBoundingBox();
          startX = sourcePos.x;
          startY = sourceBox.y2; // Bottom of couple container
        }
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
          // Determine which member based on target name
          const targetName = edge.data('targetName');
          let targetMember = null;
          
          // Try to match by name first
          coupleMembers.forEach(member => {
            if (member.data('name') === targetName || member.data('userId') === targetName) {
              targetMember = member;
            }
          });
          
          if (targetMember) {
            // Connect to the top of the specific member within the container
            const memberPos = targetMember.renderedPosition();
            endX = memberPos.x;
            endY = containerBox.y1; // Top edge of container at member's X position
          } else {
            // If no specific match, use left/right logic based on source position
            const leftMember = coupleMembers[0];
            const rightMember = coupleMembers[1];
            
            // Choose member based on which is closer to source X position
            const leftPos = leftMember.renderedPosition();
            const rightPos = rightMember.renderedPosition();
            const distanceToLeft = Math.abs(startX - leftPos.x);
            const distanceToRight = Math.abs(startX - rightPos.x);
            
            if (distanceToLeft < distanceToRight) {
              endX = leftPos.x;
            } else {
              endX = rightPos.x;
            }
            endY = containerBox.y1; // Top edge of container
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
      
      // Create smooth curved path with dramatic bending especially at target node
      const midY = startY + (endY - startY) * 0.5;
      const controlX1 = startX;
      const controlY1 = startY + (endY - startY) * 0.6; // Strong curve from source
      const controlX2 = endX;
      const controlY2 = endY - (endY - startY) * 0.8; // Much more dramatic bending to target node
      
      // SVG path for smooth bezier curve matching reference
      const pathData = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
      
      // Create path element with exact reference image styling
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', parentChildColor);
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('class', 'reference-edge'); // Static dashed lines like reference
      
      // Create small triangle arrowhead like in reference
      const arrowSize = 7; // Smaller like reference image
      const angle = Math.atan2(endY - controlY2, endX - controlX2);
      const arrowX1 = endX - arrowSize * Math.cos(angle - Math.PI / 7);
      const arrowY1 = endY - arrowSize * Math.sin(angle - Math.PI / 7);
      const arrowX2 = endX - arrowSize * Math.cos(angle + Math.PI / 7);
      const arrowY2 = endY - arrowSize * Math.sin(angle + Math.PI / 7);
      
      const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arrowPath.setAttribute('d', `M ${endX} ${endY} L ${arrowX1} ${arrowY1} L ${arrowX2} ${arrowY2} Z`);
      arrowPath.setAttribute('fill', parentChildColor);
      arrowPath.setAttribute('stroke', 'none'); // Solid fill like reference
      
      svg.appendChild(path);
      svg.appendChild(arrowPath);
    });
  }, [parentChildColor]);

  useEffect(() => {
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
  }, [user.userId, user.familyTreeId, viewMode]);

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

    const layout = cyRef.current.layout(elkOptions);
    
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

    layout.run();

    // Enhanced resize handling for consistent centering
    let ro: ResizeObserver | null = null;
    const containerEl = containerRef.current;
    if (containerEl) {
      ro = new ResizeObserver(() => {
        if (!cyRef.current) return;
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
      cyRef.current?.off('drag', renderCustomEdges);
      cyRef.current?.off('position', renderCustomEdges);
      cyRef.current?.off('move', renderCustomEdges);
      cyRef.current?.off('grab', renderCustomEdges);
      cyRef.current?.off('free', renderCustomEdges);
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
    const layout = cyRef.current.layout(elkOptions);
    layout.run();
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.fit(undefined, 60);
        cyRef.current.center();
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
          style={{ width: '100%', height: '100%' }}
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