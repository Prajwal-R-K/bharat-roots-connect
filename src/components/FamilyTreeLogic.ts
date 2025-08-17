// src/components/FamilyTreeLogic.ts
import { Edge, Node } from '@xyflow/react';
import { generateId, getCurrentDateTime } from '@/lib/utils';
import {
  createParentsOf,
  createMarriedTo,
  createSibling,
  edgeExists,
  getParents,
  getSpouses,
  getChildren,
  createFamilyTreeUser,
  getNodeIdByUserId
} from './FamilyTreeStore';
import { 
  findMarriageCenter, 
  removeConflictingEdges,
  FamilyMemberNode,
  calculateOptimalPosition,
  calculateGeneration,
  createMarriageEdge,
  createParentChildEdge,
  createSiblingEdge,
  validateRelationship,
  autoLayoutFamilyTree
} from './FamilyTreeVisualization';

export const relationshipCategories = {
  parent: ['father', 'mother'],
  child: ['son', 'daughter'],
  spouse: ['husband', 'wife'],
  sibling: ['brother', 'sister']
};

// Main function to add family member with enhanced positioning and validation
export const addFamilyMemberWithRelationships = async (
  newMember: any,
  selectedNodeId: string,
  selectedRelationshipCategory: string,
  familyTreeId: string,
  rootUser: any,
  nodes: Node[],
  edges: Edge[],
  setNodes: any,
  setEdges: any,
  selectedNode: any,
  handleAddRelation: (nodeId: string) => void
) => {
  const selectedNodeData = nodes.find(n => n.id === selectedNodeId);
  if (!selectedNodeData) {
    throw new Error("Selected node not found.");
  }

  // Enhanced validation with better error messages
  const validationResult = validateRelationship(newMember.relationship, selectedNodeData, nodes);
  if (!validationResult.isValid) {
    throw new Error(validationResult.message || "Invalid relationship");
  }

  const selectedUserId = selectedNodeData.data.userId;

  // Create new user with enhanced data structure
  const memberData: any = {
    userId: generateId('U'),
    name: newMember.name,
    email: newMember.email,
    phone: newMember.phone,
    status: 'invited' as const,
    familyTreeId,
    createdBy: rootUser.userId,
    createdAt: getCurrentDateTime(),
    myRelationship: newMember.relationship,
    gender: newMember.gender || 'other',
    dateOfBirth: newMember.dateOfBirth,
  };

  if (selectedRelationshipCategory === 'spouse') {
    memberData.marriageStatus = newMember.marriageStatus || 'married';
    memberData.marriageDate = newMember.marriageDate;
  }

  const createdMember = await createFamilyTreeUser(memberData);
  const newUserId = createdMember.userId;

  const newNodeId = `node-${Date.now()}-${newUserId}`;
  const selectedGeneration = typeof selectedNodeData.data?.generation === 'number' ? selectedNodeData.data.generation : 0;
  
  // Calculate position with enhanced collision detection
  const generation = calculateGeneration(newMember.relationship, 0, selectedGeneration);
  let position = calculateOptimalPosition(selectedNodeData, newMember.relationship, nodes, edges);
  
  // Create enhanced node with better visual properties
  let newNode: FamilyMemberNode = {
    id: newNodeId,
    type: 'familyMember',
    position,
    data: {
      label: newMember.name,
      name: newMember.name,
      email: newMember.email,
      phone: newMember.phone,
      relationship: newMember.relationship,
      generation,
      onAddRelation: handleAddRelation,
      gender: newMember.gender,
      dateOfBirth: newMember.dateOfBirth,
      marriageDate: newMember.marriageDate,
      marriageStatus: newMember.marriageStatus,
      userId: newUserId,
      status: 'invited'
    }
  };

  let additionalUiEdges: Edge[] = [];

  // Handle relationship creation with enhanced logic
  switch (selectedRelationshipCategory) {
    case 'parent':
      additionalUiEdges = await handleParentRelationship(
        familyTreeId, selectedUserId as string, newUserId as string, newNodeId, selectedNodeId, 
        nodes, edges, setNodes, setEdges, position
      );
      break;
    
    case 'spouse':
      additionalUiEdges = await handleSpouseRelationship(
        familyTreeId, selectedUserId as string, newUserId as string, newNodeId, selectedNodeId,
        selectedNodeData, position, newMember, nodes, setNodes, setEdges
      );
      break;
    
    case 'child':
      additionalUiEdges = await handleChildRelationship(
        familyTreeId, selectedUserId as string, newUserId as string, newNodeId, selectedNodeId,
        nodes, edges
      );
      break;
    
    case 'sibling':
      additionalUiEdges = await handleSiblingRelationship(
        familyTreeId, selectedUserId as string, newUserId as string, newNodeId, selectedNodeId,
        nodes, edges
      );
      break;
  }

  // Add new node with enhanced callback system
  const nodeWithCallback = {
    ...newNode,
    data: {
      ...newNode.data,
      onAddRelation: handleAddRelation
    }
  };
  
  setNodes((nds: Node[]) => [...nds.map(node => ({
    ...node,
    data: {
      ...node.data,
      onAddRelation: handleAddRelation
    }
  })), nodeWithCallback]);

  // Add edges with animation support
  setEdges((eds: Edge[]) => [...eds, ...additionalUiEdges]);

  // Auto-organize layout if too many nodes are clustered
  const clusteredNodes = nodes.filter(node => {
    const distance = Math.sqrt(
      Math.pow(node.position.x - position.x, 2) + 
      Math.pow(node.position.y - position.y, 2)
    );
    return distance < 200;
  });

  if (clusteredNodes.length > 3) {
    console.log('Auto-organizing clustered area...');
    const { nodes: layoutNodes, edges: layoutEdges } = autoLayoutFamilyTree(
      [...nodes, newNode], 
      [...edges, ...additionalUiEdges]
    );
    
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }

  return newNode;
};

// Enhanced parent relationship handling with better marriage logic
const handleParentRelationship = async (
  familyTreeId: string, selectedUserId: string, newUserId: string, 
  newNodeId: string, selectedNodeId: string, nodes: Node[], edges: Edge[], 
  setNodes: any, setEdges: any, newNodePosition: { x: number; y: number }
): Promise<Edge[]> => {
  let additionalUiEdges: Edge[] = [];
  
  // Create parent-child relationship in database
  if (!await edgeExists(familyTreeId, newUserId, selectedUserId, 'PARENTS_OF')) {
    await createParentsOf(familyTreeId, newUserId, selectedUserId);
  }
  
  const existingParents = await getParents(selectedUserId, familyTreeId);
  
  // Enhanced marriage handling for second parent
  if (existingParents.length === 2) {
    const existingParentId = existingParents.find(p => p.userId !== newUserId)?.userId;
    if (existingParentId) {
      const existingParentNode = nodes.find(n => n.data.userId === existingParentId);
      
      if (existingParentNode) {
        // Create marriage relationship in database
        if (!await edgeExists(familyTreeId, existingParentId, newUserId, 'MARRIED_TO')) {
          await createMarriedTo(familyTreeId, existingParentId, newUserId);
        }
        
        // Create enhanced marriage edge
        const marriageEdge = createMarriageEdge(existingParentNode.id, newNodeId);
        additionalUiEdges.push(marriageEdge);

        // Calculate marriage center with better positioning
        const marriageCenter = {
          x: (existingParentNode.position.x + newNodePosition.x) / 2 + 120,
          y: (existingParentNode.position.y + newNodePosition.y) / 2 + 75
        };
        
        // Update all children to connect from marriage center
        const children = await getChildren(existingParentId, familyTreeId);
        
        for (const child of children) {
          const childNodeId = getNodeIdByUserId(child.userId, nodes);
          if (childNodeId) {
            // Remove existing parent-child edges
            removeConflictingEdges(childNodeId, setEdges);
            
            // Create new marriage-based child edge with enhanced routing
            const childEdge = createParentChildEdge(
              newNodeId, 
              childNodeId, 
              true
            );
            additionalUiEdges.push(childEdge);
          }
        }

        // Update node positions for better visual hierarchy
        setNodes((nds: Node[]) => nds.map(node => {
          if (node.id === existingParentNode.id) {
            return {
              ...node,
              position: {
                ...node.position,
                x: marriageCenter.x - 200
              }
            };
          }
          if (node.id === newNodeId) {
            return {
              ...node,
              position: {
                ...node.position,
                x: marriageCenter.x + 200
              }
            };
          }
          return node;
        }));
      }
    }
  } else {
    // Single parent - create direct parent-child edge with enhanced styling
    const parentChildEdge = createParentChildEdge(newNodeId, selectedNodeId);
    additionalUiEdges.push(parentChildEdge);
  }

  return additionalUiEdges;
};

// Enhanced spouse relationship handling with better positioning and child integration
const handleSpouseRelationship = async (
  familyTreeId: string, selectedUserId: string, newUserId: string,
  newNodeId: string, selectedNodeId: string, selectedNodeData: Node,
  position: { x: number; y: number }, newMember: any, nodes: Node[],
  setNodes: any, setEdges: any
): Promise<Edge[]> => {
  let additionalUiEdges: Edge[] = [];
  
  // Create marriage relationship with validation
  const marriageCreated = await createMarriedTo(familyTreeId, selectedUserId, newUserId);
  if (!marriageCreated) {
    console.error('Failed to create MARRIED_TO edge');
    return additionalUiEdges;
  }

  // Create enhanced marriage edge with animation
  const marriageEdge = createMarriageEdge(selectedNodeId, newNodeId);
  marriageEdge.animated = true;
  additionalUiEdges.push(marriageEdge);

  // Calculate optimal marriage center
  const marriageCenter = {
    x: (selectedNodeData.position.x + position.x) / 2 + 120,
    y: (selectedNodeData.position.y + position.y) / 2 + 75
  };

  // Enhanced child relationship handling
  const children = await getChildren(selectedUserId, familyTreeId);
  if (children.length > 0) {
    const userResponse = window.confirm(
      `Connect ${newMember.name} as a parent to ${selectedNodeData.data.name}'s ${children.length} existing ${children.length === 1 ? 'child' : 'children'}?\n\nThis will create a blended family structure.`
    );
    
    if (userResponse) {
      for (const child of children) {
        // Create parent relationship in database
        if (!await edgeExists(familyTreeId, newUserId, child.userId, 'PARENTS_OF')) {
          await createParentsOf(familyTreeId, newUserId, child.userId);
        }
        
        const childNodeId = getNodeIdByUserId(child.userId, nodes);
        if (childNodeId) {
          // Remove old single parent edges
          removeConflictingEdges(childNodeId, setEdges);
          
          // Create new marriage-based child edge with enhanced routing
          const childEdge = createParentChildEdge(
            selectedNodeId,
            childNodeId,
            true
          );
          additionalUiEdges.push(childEdge);
        }
      }
      
      // Reorganize child positions for better visual hierarchy
      const childNodes = children.map(child => 
        nodes.find(n => n.data.userId === child.userId)
      ).filter(Boolean);
      
      if (childNodes.length > 0) {
        const startX = marriageCenter.x - ((childNodes.length - 1) * 350 / 2);
        
        setNodes((nds: Node[]) => nds.map(node => {
          const childIndex = childNodes.findIndex(cn => cn?.id === node.id);
          if (childIndex >= 0) {
            return {
              ...node,
              position: {
                x: startX + (childIndex * 350),
                y: marriageCenter.y + 300
              }
            };
          }
          return node;
        }));
      }
    }
  }

  // Adjust spouse positions for better visual alignment
  setNodes((nds: Node[]) => nds.map(node => {
    if (node.id === selectedNodeId) {
      return {
        ...node,
        position: {
          ...node.position,
          x: marriageCenter.x - 200
        }
      };
    }
    if (node.id === newNodeId) {
      return {
        ...node,
        position: {
          x: marriageCenter.x + 200,
          y: selectedNodeData.position.y
        }
      };
    }
    return node;
  }));

  return additionalUiEdges;
};

// Enhanced child relationship handling with better marriage detection and positioning
const handleChildRelationship = async (
  familyTreeId: string, selectedUserId: string, newUserId: string,
  newNodeId: string, selectedNodeId: string, nodes: Node[], edges: Edge[]
): Promise<Edge[]> => {
  let additionalUiEdges: Edge[] = [];
  
  // Create parent-child relationship in database
  if (!await edgeExists(familyTreeId, selectedUserId, newUserId, 'PARENTS_OF')) {
    await createParentsOf(familyTreeId, selectedUserId, newUserId);
  }
  
  // Enhanced spouse detection and relationship creation
  const spouses = await getSpouses(selectedUserId, familyTreeId);
  for (const spouse of spouses) {
    if (!await edgeExists(familyTreeId, spouse.userId, newUserId, 'PARENTS_OF')) {
      await createParentsOf(familyTreeId, spouse.userId, newUserId);
    }
  }

  // Enhanced marriage center detection with better positioning
  const marriageCenter = findMarriageCenter(selectedNodeId, edges, nodes);
  
  if (marriageCenter && spouses.length > 0) {
    // Create marriage-based child edge with enhanced routing
    const childEdge = createParentChildEdge(
      selectedNodeId,
      newNodeId,
      true
    );
    additionalUiEdges.push(childEdge);
  } else {
    // Create direct parent-child edge with enhanced styling
    const parentChildEdge = createParentChildEdge(selectedNodeId, newNodeId);
    additionalUiEdges.push(parentChildEdge);
  }

  return additionalUiEdges;
};

// Enhanced sibling relationship handling with better parent detection and positioning
const handleSiblingRelationship = async (
  familyTreeId: string, selectedUserId: string, newUserId: string,
  newNodeId: string, selectedNodeId: string, nodes: Node[], edges: Edge[]
): Promise<Edge[]> => {
  let additionalUiEdges: Edge[] = [];
  
  const parents = await getParents(selectedUserId, familyTreeId);
  
  if (parents.length > 0) {
    // Connect new sibling to all existing parents
    for (const parent of parents) {
      if (!await edgeExists(familyTreeId, parent.userId, newUserId, 'PARENTS_OF')) {
        await createParentsOf(familyTreeId, parent.userId, newUserId);
      }
    }
    
    // Enhanced marriage detection for proper edge visualization
    if (parents.length === 2) {
      const parent1NodeId = getNodeIdByUserId(parents[0].userId, nodes);
      const parent2NodeId = getNodeIdByUserId(parents[1].userId, nodes);
      
      if (parent1NodeId && parent2NodeId) {
        const marriageEdge = edges.find(e => 
          ((e.source === parent1NodeId && e.target === parent2NodeId) ||
           (e.source === parent2NodeId && e.target === parent1NodeId)) &&
          e.type === 'marriage'
        );
        
        if (marriageEdge) {
          // Parents are married - create marriage-based child edge
          const parent1Node = nodes.find(n => n.id === parent1NodeId);
          const parent2Node = nodes.find(n => n.id === parent2NodeId);
          
          if (parent1Node && parent2Node) {
            const marriageCenter = {
              x: (parent1Node.position.x + parent2Node.position.x) / 2 + 120,
              y: (parent1Node.position.y + parent2Node.position.y) / 2 + 75
            };
            
            const childEdge = createParentChildEdge(
              parent1NodeId,
              newNodeId,
              true
            );
            additionalUiEdges.push(childEdge);
          }
        } else {
          // Parents not married - connect to primary parent
          const parentChildEdge = createParentChildEdge(parent1NodeId!, newNodeId);
          additionalUiEdges.push(parentChildEdge);
        }
      }
    } else {
      // Single parent - direct connection
      const parentNodeId = getNodeIdByUserId(parents[0].userId, nodes);
      if (parentNodeId) {
        const parentChildEdge = createParentChildEdge(parentNodeId, newNodeId);
        additionalUiEdges.push(parentChildEdge);
      }
    }
  } else {
    // No parents - create direct sibling relationship with enhanced visualization
    await createSibling(familyTreeId, selectedUserId, newUserId);
    
    // Create enhanced sibling edge
    const siblingEdge = createSiblingEdge(selectedNodeId, newNodeId);
    additionalUiEdges.push(siblingEdge);
  }

  return additionalUiEdges;
};

// Enhanced validation helper for sibling relationships with better UX
export const validateSiblingRelationship = async (selectedNode: any, familyTreeId: string) => {
  const parents = await getParents(selectedNode.data.userId, familyTreeId);
  
  if (parents.length === 0) {
    const response = window.confirm(
      `No parents found for ${selectedNode.data.name}.\n\n` +
      `For better family tree structure, consider adding parents first.\n\n` +
      `Click "OK" to add parents first, or "Cancel" to proceed with direct sibling connection.`
    );
    
    if (response) {
      return { shouldAddParent: true };
    }
    
    const proceedConfirm = window.confirm(
      `Proceed with direct sibling connection?\n\n` +
      `This will create a sibling relationship without shared parents, ` +
      `which may make the family tree less organized.`
    );
    
    if (!proceedConfirm) {
      return { shouldCancel: true };
    }
  }
  
  return { shouldProceed: true };
};

// Enhanced function to reorganize family tree layout with better algorithms
export const reorganizeFamilyTreeLayout = (
  nodes: Node[],
  edges: Edge[],
  setNodes: any,
  setEdges: any,
  options: {
    algorithm?: 'hierarchical' | 'force' | 'circular';
    spacing?: 'compact' | 'normal' | 'spacious';
    centerOnRoot?: boolean;
  } = {}
) => {
  const { algorithm = 'hierarchical', spacing = 'normal', centerOnRoot = true } = options;
  
  console.log(`Reorganizing family tree layout using ${algorithm} algorithm...`);
  
  // Apply the enhanced auto-layout function
  const { nodes: layoutNodes, edges: layoutEdges } = autoLayoutFamilyTree(nodes, edges);
  
  // Apply spacing adjustments
  const spacingMultiplier = spacing === 'compact' ? 0.8 : spacing === 'spacious' ? 1.3 : 1.0;
  const adjustedNodes = layoutNodes.map(node => ({
    ...node,
    position: {
      x: node.position.x * spacingMultiplier,
      y: node.position.y * spacingMultiplier
    }
  }));
  
  // Center on root if requested
  if (centerOnRoot) {
    const rootNode = adjustedNodes.find(node => node.data?.isRoot);
    if (rootNode) {
      const offsetX = 0 - rootNode.position.x;
      const offsetY = 0 - rootNode.position.y;
      
      adjustedNodes.forEach(node => {
        node.position.x += offsetX;
        node.position.y += offsetY;
      });
    }
  }
  
  setNodes(adjustedNodes);
  setEdges(layoutEdges);
  
  // Show success message
  console.log('Family tree layout reorganized successfully!');
};

// Enhanced utility function to get all family members at a specific generation with metadata
export const getFamilyMembersByGeneration = (nodes: Node[], generation: number) => {
  const members = nodes.filter(node => node.data?.generation === generation);
  const relations = members.map(m => m.data);
  
  return {
    members,
    count: members.length,
    stats: {
      relationships: relations.map((r: any) => r?.relationship as string).filter(Boolean),
      hasMarriedCouples: members.some((m: any) => ['husband', 'wife'].includes(m.data?.relationship))
    }
  };
};

// Enhanced utility function to find the root node with fallback logic
export const findRootNode = (nodes: Node[]): Node | null => {
  // Primary: Look for explicitly marked root
  let root = nodes.find(node => node.data?.isRoot);
  
  // Fallback 1: Look for node with status 'active' (tree creator)
  if (!root) {
    root = nodes.find(node => node.data?.status === 'active');
  }
  
  // Fallback 2: Look for oldest generation
  if (!root) {
    const minGeneration = Math.min(...nodes.map(n => Number(n.data?.generation) || 0));
    root = nodes.find(node => Number(node.data?.generation || 0) === minGeneration);
  }
  
  // Fallback 3: First node
  if (!root) {
    root = nodes[0];
  }
  
  return root || null;
};

// Utility function to detect and resolve layout conflicts
export const detectLayoutConflicts = (nodes: Node[]) => {
  const conflicts: Array<{
    nodeIds: string[];
    issue: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }> = [];
  
  // Check for overlapping nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];
      const distance = Math.sqrt(
        Math.pow(node1.position.x - node2.position.x, 2) +
        Math.pow(node1.position.y - node2.position.y, 2)
      );
      
      if (distance < 250) { // Minimum safe distance
        conflicts.push({
          nodeIds: [node1.id, node2.id],
          issue: `Nodes are too close together (${Math.round(distance)}px apart)`,
          severity: distance < 150 ? 'high' : 'medium',
          suggestion: 'Use auto-layout to reorganize or manually adjust positions'
        });
      }
    }
  }
  
  // Check for generation consistency
  const generationGroups = new Map<number, Node[]>();
  
  // Group nodes by generation first
  nodes.forEach(node => {
    const gen = Number(node.data?.generation) || 0;
    if (!generationGroups.has(gen)) {
      generationGroups.set(gen, []);
    }
    generationGroups.get(gen)!.push(node);
  });
  
  generationGroups.forEach((nodesInGen, generation) => {
    const yPositions = nodesInGen.map(n => Number(n.position.y));
    const yVariance = Math.max(...yPositions) - Math.min(...yPositions);
    
    if (yVariance > 100) { // Nodes in same generation should be roughly aligned
      conflicts.push({
        nodeIds: nodesInGen.map(n => n.id),
        issue: `Generation ${generation} nodes are not properly aligned vertically`,
        severity: 'low',
        suggestion: 'Use auto-layout to align nodes by generation'
      });
    }
  });
  
  // Check for isolated nodes
  const isolatedNodes = nodes.filter(node => {
    const hasConnections = nodes.some(otherNode => {
      const distance = Math.sqrt(
        Math.pow(node.position.x - otherNode.position.x, 2) +
        Math.pow(node.position.y - otherNode.position.y, 2)
      );
      return otherNode.id !== node.id && distance < 400;
    });
    return !hasConnections;
  });
  
  if (isolatedNodes.length > 0) {
    conflicts.push({
      nodeIds: isolatedNodes.map(n => n.id),
      issue: `${isolatedNodes.length} node(s) appear isolated from the main family tree`,
      severity: 'medium',
      suggestion: 'Connect these nodes to the main family or use auto-layout'
    });
  }
  
  return conflicts;
};

// Utility function to automatically resolve common layout conflicts
export const autoResolveLayoutConflicts = (
  nodes: Node[],
  edges: Edge[],
  setNodes: any,
  setEdges: any
) => {
  const conflicts = detectLayoutConflicts(nodes);
  let resolved = 0;
  
  // Resolve overlapping nodes by spreading them out
  const overlapConflicts = conflicts.filter(c => c.issue.includes('too close together'));
  overlapConflicts.forEach(conflict => {
    const [nodeId1, nodeId2] = conflict.nodeIds;
    const node1 = nodes.find(n => n.id === nodeId1);
    const node2 = nodes.find(n => n.id === nodeId2);
    
    if (node1 && node2) {
      const centerX = (node1.position.x + node2.position.x) / 2;
      const centerY = (node1.position.y + node2.position.y) / 2;
      
      setNodes((nds: Node[]) => nds.map(node => {
        if (node.id === nodeId1) {
          return {
            ...node,
            position: {
              x: centerX - 150,
              y: centerY
            }
          };
        }
        if (node.id === nodeId2) {
          return {
            ...node,
            position: {
              x: centerX + 150,
              y: centerY
            }
          };
        }
        return node;
      }));
      resolved++;
    }
  });
  
  // Resolve generation alignment issues
  const alignmentConflicts = conflicts.filter(c => c.issue.includes('not properly aligned'));
  alignmentConflicts.forEach(conflict => {
    const conflictNodes = conflict.nodeIds.map(id => nodes.find(n => n.id === id)).filter(Boolean);
    if (conflictNodes.length > 1) {
      const avgY = conflictNodes.reduce((sum, node) => sum + node!.position.y, 0) / conflictNodes.length;
      
      setNodes((nds: Node[]) => nds.map(node => {
        if (conflict.nodeIds.includes(node.id)) {
          return {
            ...node,
            position: {
              ...node.position,
              y: avgY
            }
          };
        }
        return node;
      }));
      resolved++;
    }
  });
  
  return {
    totalConflicts: conflicts.length,
    resolved,
    remaining: conflicts.length - resolved
  };
};

// Enhanced utility function to export family tree data
export const exportFamilyTreeData = (nodes: Node[], edges: Edge[]) => {
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      totalNodes: nodes.length,
      totalEdges: edges.length,
      generations: new Set(nodes.map(n => n.data?.generation || 0)).size
    },
    nodes: nodes.map(node => ({
      id: node.id,
      name: node.data?.name,
      email: node.data?.email,
      phone: node.data?.phone,
      relationship: node.data?.relationship,
      generation: node.data?.generation,
      gender: node.data?.gender,
      dateOfBirth: node.data?.dateOfBirth,
      marriageDate: node.data?.marriageDate,
      marriageStatus: node.data?.marriageStatus,
      status: node.data?.status,
      position: node.position,
      isRoot: node.data?.isRoot
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      data: edge.data
    })),
    relationships: {
      marriages: edges.filter(e => e.type === 'marriage').length,
      parentChild: edges.filter(e => e.type === 'parentChild').length,
      siblings: edges.filter(e => e.type === 'sibling').length
    }
  };
  
  return exportData;
};

// Utility function to import and validate family tree data
export const importFamilyTreeData = (
  importData: any,
  setNodes: any,
  setEdges: any,
  handleAddRelation: (nodeId: string) => void
) => {
  try {
    // Validate import data structure
    if (!importData.nodes || !importData.edges || !Array.isArray(importData.nodes) || !Array.isArray(importData.edges)) {
      throw new Error('Invalid import data structure');
    }
    
    // Reconstruct nodes with proper callbacks
    const reconstructedNodes: Node[] = importData.nodes.map((nodeData: any) => ({
      id: nodeData.id,
      type: 'familyMember',
      position: nodeData.position || { x: 0, y: 0 },
      data: {
        ...nodeData,
        onAddRelation: handleAddRelation
      }
    }));
    
    // Reconstruct edges
    const reconstructedEdges: Edge[] = importData.edges.map((edgeData: any) => ({
      id: edgeData.id,
      source: edgeData.source,
      target: edgeData.target,
      type: edgeData.type || 'parentChild',
      data: edgeData.data || {}
    }));
    
    // Apply to state
    setNodes(reconstructedNodes);
    setEdges(reconstructedEdges);
    
    return {
      success: true,
      nodesImported: reconstructedNodes.length,
      edgesImported: reconstructedEdges.length
    };
  } catch (error) {
    console.error('Error importing family tree data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Enhanced utility function to find relationship paths between nodes
export const findRelationshipPath = (
  sourceNodeId: string,
  targetNodeId: string,
  nodes: Node[],
  edges: Edge[],
  maxDepth: number = 5
): Array<{path: string[], relationships: string[], distance: number}> => {
  const visited = new Set<string>();
  const paths: Array<{path: string[], relationships: string[], distance: number}> = [];
  
  const dfs = (currentId: string, targetId: string, currentPath: string[], currentRelationships: string[], depth: number) => {
    if (depth > maxDepth || visited.has(currentId)) return;
    
    if (currentId === targetId && currentPath.length > 1) {
      paths.push({
        path: [...currentPath],
        relationships: [...currentRelationships],
        distance: currentPath.length - 1
      });
      return;
    }
    
    visited.add(currentId);
    
    // Find connected nodes
    edges.forEach(edge => {
      let nextNodeId: string | null = null;
      let relationship = '';
      
      if (edge.source === currentId) {
        nextNodeId = edge.target;
        relationship = edge.type === 'marriage' ? 'spouse' : 
                     edge.type === 'parentChild' ? 'child' : 'sibling';
      } else if (edge.target === currentId) {
        nextNodeId = edge.source;
        relationship = edge.type === 'marriage' ? 'spouse' : 
                     edge.type === 'parentChild' ? 'parent' : 'sibling';
      }
      
      if (nextNodeId && !visited.has(nextNodeId)) {
        dfs(
          nextNodeId, 
          targetId, 
          [...currentPath, nextNodeId], 
          [...currentRelationships, relationship],
          depth + 1
        );
      }
    });
    
    visited.delete(currentId);
  };
  
  dfs(sourceNodeId, targetNodeId, [sourceNodeId], [], 0);
  
  // Sort by shortest distance first
  return paths.sort((a, b) => a.distance - b.distance);
};

// Utility function to calculate family tree statistics
export const calculateFamilyTreeStatistics = (nodes: Node[], edges: Edge[]) => {
  const stats = {
    overview: {
      totalMembers: nodes.length,
      totalRelationships: edges.length,
      generations: new Set(nodes.map(n => n.data?.generation || 0)).size,
      pendingInvitations: nodes.filter(n => n.data?.status === 'invited').length
    },
    relationships: {
      marriages: edges.filter(e => e.type === 'marriage').length,
      parentChild: edges.filter(e => e.type === 'parentChild').length,
      siblings: edges.filter(e => e.type === 'sibling').length
    },
    demographics: {
      male: nodes.filter(n => n.data?.gender === 'male').length,
      female: nodes.filter(n => n.data?.gender === 'female').length,
      other: nodes.filter(n => !n.data?.gender || n.data.gender === 'other').length
    },
    generationBreakdown: {} as Record<number, number>
  };
  
  // Calculate generation breakdown
  nodes.forEach(node => {
    const gen = Number(node.data?.generation) || 0;
    stats.generationBreakdown[gen] = (stats.generationBreakdown[gen] || 0) + 1;
  });
  
  return stats;
};