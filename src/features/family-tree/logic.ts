// Family tree domain logic: adding members, relationship handling, import/export, layout helpers
// Moved from `src/components/FamilyTreeLogic.ts` for better structure and readability

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
} from '@/features/family-tree/store';
import {
  findMarriageCenter,
  removeConflictingEdges,
  calculateOptimalPosition,
  calculateGeneration,
  createMarriageEdge,
  createParentChildEdge,
  createSiblingEdge,
  validateRelationship,
  autoLayoutFamilyTree
} from '@/features/family-tree';
import type { FamilyMemberNode } from '@/features/family-tree';

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
  // Find the selected node - could be individual or within a couple node
  let selectedNodeData = nodes.find(n => n.id === selectedNodeId);
  
  // If not found as individual node, check if it's within a couple node
  if (!selectedNodeData) {
    // Check if selectedNode was passed and has coupleNodeId
    if (selectedNode?.data?.coupleNodeId) {
      // Find the couple node
      const coupleNode = nodes.find(n => n.id === selectedNode.data.coupleNodeId);
      if (coupleNode) {
        // Use the couple node but with the specific person's data
        selectedNodeData = {
          ...coupleNode,
          id: selectedNodeId,
          data: selectedNode.data
        };
      }
    }
  }
  
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
    userId: newMember.hasEmail ? generateId('U') : newMember.userId,
    name: newMember.name,
    email: newMember.hasEmail ? newMember.email : '',
    phone: newMember.phone,
    status: newMember.hasEmail ? 'invited' as const : 'active' as const,
    familyTreeId,
    createdBy: rootUser.userId,
    createdAt: getCurrentDateTime(),
    myRelationship: newMember.relationship,
    gender: newMember.gender || 'other',
    dateOfBirth: newMember.dateOfBirth,
    isAlive: newMember.isAlive,
    dateOfDeath: newMember.isAlive ? '' : newMember.dateOfDeath,
    password: newMember.hasEmail ? undefined : newMember.password,
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
      status: newMember.hasEmail ? 'invited' : 'active',
      isAlive: newMember.isAlive,
      dateOfDeath: newMember.isAlive ? '' : newMember.dateOfDeath
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

        // Create a combined couple node for parents
        setTimeout(() => {
          setNodes((nds: Node[]) => {
            // Find both parent nodes
            const parentNode1 = nds.find(n => n.id === existingParentNode.id);
            const parentNode2 = nds.find(n => n.id === newNodeId);
            
            if (!parentNode1 || !parentNode2) return nds;
            
            // Create couple node ID
            const coupleNodeId = `couple-${existingParentNode.id}-${newNodeId}`;
            
            // Create the combined couple node for parents
            const coupleNode: Node = {
              id: coupleNodeId,
              type: 'couple',
              position: {
                x: marriageCenter.x - 270, // Center the wider couple node
                y: newNodePosition.y
              },
              data: {
                person1: {
                  id: existingParentNode.id,
                  name: parentNode1.data.name,
                  email: parentNode1.data.email,
                  gender: parentNode1.data.gender,
                  relationship: parentNode1.data.relationship,
                  userId: parentNode1.data.userId,
                  onAddRelation: parentNode1.data.onAddRelation
                },
                person2: {
                  id: newNodeId,
                  name: parentNode2.data.name,
                  email: parentNode2.data.email,
                  gender: parentNode2.data.gender,
                  relationship: parentNode2.data.relationship,
                  userId: parentNode2.data.userId,
                  onAddRelation: parentNode2.data.onAddRelation
                },
                generation: parentNode1.data.generation,
                marriageDate: '',
                onAddRelation: parentNode1.data.onAddRelation
              },
              style: { transition: 'all 0.5s ease-in-out' }
            };
            
            // Remove individual parent nodes and add couple node
            return nds
              .filter(n => n.id !== existingParentNode.id && n.id !== newNodeId)
              .concat(coupleNode);
          });
          
          // Update edges to point to couple node
          setEdges((eds: Edge[]) => {
            const coupleNodeId = `couple-${existingParentNode.id}-${newNodeId}`;
            return eds.map(edge => {
              // Update edges that connected to either parent node
              if (edge.source === existingParentNode.id || edge.source === newNodeId) {
                return { ...edge, source: coupleNodeId };
              }
              if (edge.target === existingParentNode.id || edge.target === newNodeId) {
                return { ...edge, target: coupleNodeId };
              }
              return edge;
            });
          });
        }, 100);
      }
    }
  } else {
    // Single parent - create direct parent-child edge
    // If the selected child is part of a couple node, attach to the correct spouse-side handle
    let targetId = selectedNodeId;
    let targetHandle: string | undefined = undefined;

    const coupleNode = nodes.find(
      (n) => n.type === 'couple' && (n.data?.person1?.id === selectedNodeId || n.data?.person2?.id === selectedNodeId)
    );

    if (coupleNode) {
      targetId = coupleNode.id;
      targetHandle = coupleNode.data?.person1?.id === selectedNodeId ? 'spouse-left' : 'spouse-right';
    }

    const parentChildEdge = createParentChildEdge(
      newNodeId,
      targetId,
      false,
      targetHandle ? { targetHandle } : undefined
    );
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

  // Calculate optimal marriage center for perfect couple alignment - CLOSER SPACING
  const nodeWidth = 240;
  const coupleSpacing = 260; // Reduced from 280 to make couples closer
  const marriageCenter = {
    x: (selectedNodeData.position.x + position.x) / 2,
    y: selectedNodeData.position.y
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
      ).filter(Boolean) as Node[];
      
      if (childNodes.length > 0) {
        const startX = marriageCenter.x - ((childNodes.length - 1) * 350 / 2);
        
        setNodes((nds: Node[]) => nds.map(node => {
          const childIndex = childNodes.findIndex(cn => cn.id === node.id);
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

  // Create a combined couple node instead of two separate nodes
  setTimeout(() => {
    setNodes((nds: Node[]) => {
      // Find both nodes
      const node1 = nds.find(n => n.id === selectedNodeId);
      const node2 = nds.find(n => n.id === newNodeId);
      
      if (!node1 || !node2) return nds;
      
      // Create couple node ID
      const coupleNodeId = `couple-${selectedNodeId}-${newNodeId}`;
      
      // Create the combined couple node
      const coupleNode: Node = {
        id: coupleNodeId,
        type: 'couple',
        position: {
          x: marriageCenter.x - 270, // Center the wider couple node
          y: selectedNodeData.position.y
        },
        data: {
          person1: {
            id: selectedNodeId,
            name: node1.data.name,
            email: node1.data.email,
            gender: node1.data.gender,
            relationship: node1.data.relationship,
            userId: node1.data.userId,
            onAddRelation: node1.data.onAddRelation
          },
          person2: {
            id: newNodeId,
            name: node2.data.name,
            email: node2.data.email,
            gender: node2.data.gender,
            relationship: node2.data.relationship,
            userId: node2.data.userId,
            onAddRelation: node2.data.onAddRelation
          },
          generation: node1.data.generation,
          marriageDate: newMember.marriageDate,
          onAddRelation: node1.data.onAddRelation
        },
        style: { transition: 'all 0.5s ease-in-out' }
      };
      
      // Remove individual nodes and add couple node
      return nds
        .filter(n => n.id !== selectedNodeId && n.id !== newNodeId)
        .concat(coupleNode);
    });
    
    // Update edges to point to couple node
    setEdges((eds: Edge[]) => {
      const coupleNodeId = `couple-${selectedNodeId}-${newNodeId}`;
      return eds.map(edge => {
        // Update edges that connected to either individual node
        if (edge.source === selectedNodeId || edge.source === newNodeId) {
          return { ...edge, source: coupleNodeId };
        }
        if (edge.target === selectedNodeId || edge.target === newNodeId) {
          return { ...edge, target: coupleNodeId };
        }
        return edge;
      });
    });
  }, 100);

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
  
  // Determine if selected node is inside a couple container
  const coupleNode = nodes.find(
    (n) => n.type === 'couple' && (n.data?.person1?.id === selectedNodeId || n.data?.person2?.id === selectedNodeId)
  );

  if (marriageCenter && spouses.length > 0) {
    // Parents are married - if selected is from a couple, route from couple bottom handle
    const sourceId = coupleNode ? coupleNode.id : selectedNodeId;
    const childEdge = createParentChildEdge(
      sourceId,
      newNodeId,
      true,
      coupleNode ? { sourceHandle: 'couple-bottom' } : undefined
    );
    additionalUiEdges.push(childEdge);
  } else {
    // Single parent - if selected is inside a couple, use bottom handle; else connect directly
    const sourceId = coupleNode ? coupleNode.id : selectedNodeId;
    const parentChildEdge = createParentChildEdge(
      sourceId,
      newNodeId,
      false,
      coupleNode ? { sourceHandle: 'couple-bottom' } : undefined
    );
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
          const childEdge = createParentChildEdge(
            parent1NodeId,
            newNodeId,
            true
          );
          additionalUiEdges.push(childEdge);
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
    if (response) return { shouldAddParent: true };
    const proceedConfirm = window.confirm(
      `Proceed with direct sibling connection?\n\n` +
      `This will create a sibling relationship without shared parents, which may make the family tree less organized.`
    );
    if (!proceedConfirm) return { shouldCancel: true };
  }
  return { shouldProceed: true };
};

// Reorganize tree layout with configurable options
export const reorganizeFamilyTreeLayout = (
  nodes: Node[],
  edges: Edge[],
  setNodes: any,
  setEdges: any,
  options: { algorithm?: 'hierarchical' | 'force' | 'circular'; spacing?: 'compact' | 'normal' | 'spacious'; centerOnRoot?: boolean } = {}
) => {
  const { algorithm = 'hierarchical', spacing = 'normal', centerOnRoot = true } = options;
  const { nodes: layoutNodes, edges: layoutEdges } = autoLayoutFamilyTree(nodes, edges);
  const spacingMultiplier = spacing === 'compact' ? 0.8 : spacing === 'spacious' ? 1.3 : 1.0;
  const adjustedNodes = layoutNodes.map(node => ({ ...node, position: { x: node.position.x * spacingMultiplier, y: node.position.y * spacingMultiplier } }));
  if (centerOnRoot) {
    const rootNode = adjustedNodes.find(node => node.data?.isRoot);
    if (rootNode) {
      const offsetX = 0 - rootNode.position.x;
      const offsetY = 0 - rootNode.position.y;
      adjustedNodes.forEach(node => { node.position.x += offsetX; node.position.y += offsetY; });
    }
  }
  setNodes(adjustedNodes);
  setEdges(layoutEdges);
};

// Family members by generation with simple stats
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

// Find the root node with fallbacks
export const findRootNode = (nodes: Node[]): Node | null => {
  let root = nodes.find(node => node.data?.isRoot);
  if (!root) root = nodes.find(node => node.data?.status === 'active');
  if (!root) {
    const minGeneration = Math.min(...nodes.map(n => Number(n.data?.generation) || 0));
    root = nodes.find(node => Number(node.data?.generation || 0) === minGeneration) || undefined as any;
  }
  if (!root) root = nodes[0];
  return root || null;
};

// Detect common layout conflicts
export const detectLayoutConflicts = (nodes: Node[]) => {
  const conflicts: Array<{ nodeIds: string[]; issue: string; severity: 'low' | 'medium' | 'high'; suggestion: string; }> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];
      const distance = Math.hypot(node1.position.x - node2.position.x, node1.position.y - node2.position.y);
      if (distance < 250) {
        conflicts.push({ nodeIds: [node1.id, node2.id], issue: `Nodes are too close together (${Math.round(distance)}px apart)`, severity: distance < 150 ? 'high' : 'medium', suggestion: 'Use auto-layout to reorganize or manually adjust positions' });
      }
    }
  }
  const generationGroups = new Map<number, Node[]>();
  nodes.forEach(node => {
    const gen = Number(node.data?.generation) || 0;
    if (!generationGroups.has(gen)) generationGroups.set(gen, []);
    generationGroups.get(gen)!.push(node);
  });
  generationGroups.forEach((nodesInGen, generation) => {
    const yPositions = nodesInGen.map(n => Number(n.position.y));
    const yVariance = Math.max(...yPositions) - Math.min(...yPositions);
    if (yVariance > 100) {
      conflicts.push({ nodeIds: nodesInGen.map(n => n.id), issue: `Generation ${generation} nodes are not properly aligned vertically`, severity: 'low', suggestion: 'Use auto-layout to align nodes by generation' });
    }
  });
  const isolatedNodes = nodes.filter(node => {
    const hasConnections = nodes.some(otherNode => {
      const distance = Math.hypot(node.position.x - otherNode.position.x, node.position.y - otherNode.position.y);
      return otherNode.id !== node.id && distance < 400;
    });
    return !hasConnections;
  });
  if (isolatedNodes.length > 0) {
    conflicts.push({ nodeIds: isolatedNodes.map(n => n.id), issue: `${isolatedNodes.length} node(s) appear isolated from the main family tree`, severity: 'medium', suggestion: 'Connect these nodes to the main family or use auto-layout' });
  }
  return conflicts;
};

// Attempt automated conflict resolution for common cases
export const autoResolveLayoutConflicts = (
  nodes: Node[],
  edges: Edge[],
  setNodes: any,
  setEdges: any
) => {
  const conflicts = detectLayoutConflicts(nodes);
  let resolved = 0;
  const overlapConflicts = conflicts.filter(c => c.issue.includes('too close together'));
  overlapConflicts.forEach(conflict => {
    const [nodeId1, nodeId2] = conflict.nodeIds;
    const node1 = nodes.find(n => n.id === nodeId1);
    const node2 = nodes.find(n => n.id === nodeId2);
    if (node1 && node2) {
      const centerX = (node1.position.x + node2.position.x) / 2;
      const centerY = (node1.position.y + node2.position.y) / 2;
      setNodes((nds: Node[]) => nds.map(node => {
        if (node.id === nodeId1) return { ...node, position: { x: centerX - 150, y: centerY } };
        if (node.id === nodeId2) return { ...node, position: { x: centerX + 150, y: centerY } };
        return node;
      }));
      resolved++;
    }
  });
  const alignmentConflicts = conflicts.filter(c => c.issue.includes('not properly aligned'));
  alignmentConflicts.forEach(conflict => {
    const conflictNodes = conflict.nodeIds.map(id => nodes.find(n => n.id === id)).filter(Boolean) as Node[];
    if (conflictNodes.length > 1) {
      const avgY = conflictNodes.reduce((sum, node) => sum + node.position.y, 0) / conflictNodes.length;
      setNodes((nds: Node[]) => nds.map(node => conflict.nodeIds.includes(node.id) ? { ...node, position: { ...node.position, y: avgY } } : node));
      resolved++;
    }
  });
  return { totalConflicts: conflicts.length, resolved, remaining: conflicts.length - resolved };
};

// Export family tree data suitable for persistence or download
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
    edges: edges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target, type: edge.type, data: edge.data })),
    relationships: {
      marriages: edges.filter(e => e.type === 'marriage').length,
      parentChild: edges.filter(e => e.type === 'parentChild').length,
      siblings: edges.filter(e => e.type === 'sibling').length
    }
  };
  return exportData;
};

// Import and reconstruct family tree data into state
export const importFamilyTreeData = (
  importData: any,
  setNodes: any,
  setEdges: any,
  handleAddRelation: (nodeId: string) => void
) => {
  try {
    if (!importData.nodes || !importData.edges || !Array.isArray(importData.nodes) || !Array.isArray(importData.edges)) {
      throw new Error('Invalid import data structure');
    }
    const reconstructedNodes: Node[] = importData.nodes.map((nodeData: any) => ({
      id: nodeData.id,
      type: 'familyMember',
      position: nodeData.position || { x: 0, y: 0 },
      data: { ...nodeData, onAddRelation: handleAddRelation }
    }));
    const reconstructedEdges: Edge[] = importData.edges.map((edgeData: any) => ({
      id: edgeData.id,
      source: edgeData.source,
      target: edgeData.target,
      type: edgeData.type || 'parentChild',
      data: edgeData.data || {}
    }));
    setNodes(reconstructedNodes);
    setEdges(reconstructedEdges);
    return { success: true, nodesImported: reconstructedNodes.length, edgesImported: reconstructedEdges.length };
  } catch (error: any) {
    console.error('Error importing family tree data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Shortest relationship paths using DFS with max depth
export const findRelationshipPath = (
  sourceNodeId: string,
  targetNodeId: string,
  nodes: Node[],
  edges: Edge[],
  maxDepth: number = 5
): Array<{ path: string[]; relationships: string[]; distance: number }> => {
  const visited = new Set<string>();
  const paths: Array<{ path: string[]; relationships: string[]; distance: number }> = [];
  const dfs = (currentId: string, targetId: string, currentPath: string[], currentRelationships: string[], depth: number) => {
    if (depth > maxDepth || visited.has(currentId)) return;
    if (currentId === targetId && currentPath.length > 1) {
      paths.push({ path: [...currentPath], relationships: [...currentRelationships], distance: currentPath.length - 1 });
      return;
    }
    visited.add(currentId);
    edges.forEach(edge => {
      let nextNodeId: string | null = null;
      let relationship = '';
      if (edge.source === currentId) {
        nextNodeId = edge.target;
        relationship = edge.type === 'marriage' ? 'spouse' : edge.type === 'parentChild' ? 'child' : 'sibling';
      } else if (edge.target === currentId) {
        nextNodeId = edge.source;
        relationship = edge.type === 'marriage' ? 'spouse' : edge.type === 'parentChild' ? 'parent' : 'sibling';
      }
      if (nextNodeId && !visited.has(nextNodeId)) {
        dfs(nextNodeId, targetId, [...currentPath, nextNodeId], [...currentRelationships, relationship], depth + 1);
      }
    });
    visited.delete(currentId);
  };
  dfs(sourceNodeId, targetNodeId, [sourceNodeId], [], 0);
  return paths.sort((a, b) => a.distance - b.distance);
};

// Family-level statistics
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
  nodes.forEach(node => {
    const gen = Number(node.data?.generation) || 0;
    stats.generationBreakdown[gen] = (stats.generationBreakdown[gen] || 0) + 1;
  });
  return stats;
};


