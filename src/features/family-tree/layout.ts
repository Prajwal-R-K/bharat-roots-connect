// Layout and positioning helpers for the family tree
import { Edge, Node } from '@xyflow/react';

// Compute generation number for a relationship
export const calculateGeneration = (
	relationship: string,
	rootGeneration: number,
	referenceGeneration: number
): number => {
	const relationshipHierarchy: Record<string, number> = {
		father: referenceGeneration - 1,
		mother: referenceGeneration - 1,
		grandfather: referenceGeneration - 2,
		grandmother: referenceGeneration - 2,
		son: referenceGeneration + 1,
		daughter: referenceGeneration + 1,
		grandson: referenceGeneration + 2,
		granddaughter: referenceGeneration + 2,
		husband: referenceGeneration,
		wife: referenceGeneration,
		brother: referenceGeneration,
		sister: referenceGeneration,
		cousin: referenceGeneration,
		uncle: referenceGeneration - 1,
		aunt: referenceGeneration - 1,
		nephew: referenceGeneration + 1,
		niece: referenceGeneration + 1,
	};
	return relationshipHierarchy[relationship] ?? referenceGeneration;
};

// Find the visual center between married spouses to attach children
export const findMarriageCenter = (nodeId: string, edges: Edge[], nodes: Node[]): { x: number; y: number } | null => {
	const marriageEdge = edges.find(e => (e.source === nodeId || e.target === nodeId) && e.type === 'marriage');
	if (!marriageEdge) return null;
	const sourceNode = nodes.find(n => n.id === marriageEdge.source);
	const targetNode = nodes.find(n => n.id === marriageEdge.target);
	if (!sourceNode || !targetNode) return null;
	const nodeWidth = 240;
	const nodeHeight = 320;
	const centerX = (sourceNode.position.x + targetNode.position.x) / 2 + nodeWidth / 2;
	const centerY = (sourceNode.position.y + targetNode.position.y) / 2 + nodeHeight / 2;
	return { x: centerX, y: centerY };
};

// Compute a good position for a new node given relationship and existing layout
export const calculateOptimalPosition = (
	parentNode: Node,
	relationship: string,
	existingNodes: Node[],
	edges: Edge[]
): { x: number; y: number } => {
	const parentPos = parentNode.position;
	const parentGeneration = Number(parentNode.data?.generation) || 0;
	const newGeneration = calculateGeneration(relationship, 0, parentGeneration);
	const GENERATION_SPACING = 400;
	const SIBLING_SPACING = 350;
	const MARRIAGE_SPACING = 280;
	const PARENT_SPACING = 400;
	const MIN_NODE_SPACING = 300;
	const COLLISION_PADDING = 80;
	const baseY = parentPos.y + (newGeneration - parentGeneration) * GENERATION_SPACING;

	const findFreePosition = (preferredX: number, preferredY: number): { x: number; y: number } => {
		let testX = preferredX;
		let testY = preferredY;
		let attempts = 0;
		const maxAttempts = 20;
		while (attempts < maxAttempts) {
			const hasCollision = existingNodes.some(node => {
				const distance = Math.hypot(node.position.x - testX, node.position.y - testY);
				return distance < MIN_NODE_SPACING;
			});
			if (!hasCollision) return { x: testX, y: testY };
			const angle = (attempts * 60) * (Math.PI / 180);
			const radius = COLLISION_PADDING * (1 + Math.floor(attempts / 6));
			testX = preferredX + Math.cos(angle) * radius;
			testY = preferredY + Math.sin(angle) * radius;
			attempts++;
		}
		return { x: testX, y: testY };
	};

	switch (relationship) {
		case 'husband':
		case 'wife': {
			// Position spouse next to selected node with proper spacing
			const spouseOffset = relationship === 'husband' ? -MARRIAGE_SPACING : MARRIAGE_SPACING;
			const preferredX = parentPos.x + spouseOffset;
			// Ensure spouse is at exact same Y position for perfect alignment
			return { x: preferredX, y: parentPos.y };
		}
		case 'father':
		case 'mother': {
			// Position parents symmetrically above the child
			const existingParents = existingNodes.filter(node => 
				Number(node.data?.generation) === newGeneration && 
				['father', 'mother'].includes(node.data?.relationship as string)
			);
			let parentOffset;
			if (existingParents.length === 0) {
				// First parent - position to the left for father, right for mother
				parentOffset = relationship === 'father' ? -PARENT_SPACING / 2 : PARENT_SPACING / 2;
			} else {
				// Second parent - position on opposite side with proper spacing
				const existingParent = existingParents[0];
				const existingOffset = existingParent.position.x - parentPos.x;
				parentOffset = existingOffset > 0 ? -PARENT_SPACING : PARENT_SPACING;
			}
			const preferredX = parentPos.x + parentOffset;
			return { x: preferredX, y: baseY };
		}
		case 'son':
		case 'daughter': {
			// Position children centered below parents or marriage center
			const marriageCenter = findMarriageCenter(parentNode.id, edges, existingNodes);
			const baseX = marriageCenter ? marriageCenter.x : parentPos.x;
			const existingChildren = existingNodes.filter(node => 
				node.data?.generation === newGeneration && 
				['son', 'daughter'].includes(node.data?.relationship as string)
			);
			const childrenCount = existingChildren.length;
			let childOffset = 0;
			
			if (childrenCount === 0) {
				// First child - center below parents
				childOffset = 0;
			} else {
				// Additional children - distribute evenly
				const totalWidth = (childrenCount + 1) * SIBLING_SPACING;
				const startOffset = -totalWidth / 2 + SIBLING_SPACING / 2;
				childOffset = startOffset + childrenCount * SIBLING_SPACING;
			}
			const preferredX = baseX + childOffset;
			return findFreePosition(preferredX, baseY);
		}
		case 'brother':
		case 'sister': {
			const existingSiblings = existingNodes.filter(node => node.data?.generation === newGeneration && ['brother', 'sister', 'husband', 'wife'].includes(node.data?.relationship as string) && node.id !== parentNode.id);
			let siblingOffset = SIBLING_SPACING;
			let attempts = 0;
			while (attempts < 10) {
				const testX = parentPos.x + (attempts % 2 === 0 ? siblingOffset : -siblingOffset);
				const hasConflict = existingSiblings.some(node => Math.abs(node.position.x - testX) < MIN_NODE_SPACING / 2);
				if (!hasConflict) return findFreePosition(testX, parentPos.y);
				siblingOffset += SIBLING_SPACING / 2;
				attempts++;
			}
			return findFreePosition(parentPos.x + SIBLING_SPACING, parentPos.y);
		}
		default: {
			const sameGenerationNodes = existingNodes.filter(node => node.data?.generation === newGeneration);
			const offset = sameGenerationNodes.length * SIBLING_SPACING;
			const preferredX = parentPos.x + offset;
			return findFreePosition(preferredX, baseY);
		}
	}
};

// Auto layout algorithm to space nodes by generation and pair spouses
export const autoLayoutFamilyTree = (nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } => {
	const layoutNodes = [...nodes];
	const layoutEdges = [...edges];
	const rootNode = nodes.find(node => node.data?.isRoot) || nodes[0];
	if (!rootNode) return { nodes: layoutNodes, edges: layoutEdges };
	const nodesByGeneration = new Map<number, Node[]>();
	nodes.forEach(node => {
		const generation = Number(node.data?.generation) || 0;
		if (!nodesByGeneration.has(generation)) nodesByGeneration.set(generation, []);
		nodesByGeneration.get(generation)!.push(node);
	});
	const GENERATION_Y_SPACING = 450;
	const BASE_X_SPACING = 350;
	const MARRIAGE_PAIR_SPACING = 600;
	const COUPLE_INTERNAL_SPACING = 280;
	const sortedGenerations = Array.from(nodesByGeneration.keys()).sort((a, b) => a - b);
	sortedGenerations.forEach(generation => {
		const generationNodes = nodesByGeneration.get(generation)!;
		const baseY = rootNode.position.y + generation * GENERATION_Y_SPACING;
		const marriedPairs: Node[][] = [];
		const singleNodes: Node[] = [];
		const processedNodes = new Set<string>();
		generationNodes.forEach(node => {
			if (processedNodes.has(node.id)) return;
			const marriageEdge = edges.find(e => (e.source === node.id || e.target === node.id) && e.type === 'marriage');
			if (marriageEdge) {
				const spouseId = marriageEdge.source === node.id ? marriageEdge.target : marriageEdge.source;
				const spouseNode = generationNodes.find(n => n.id === spouseId);
				if (spouseNode && !processedNodes.has(spouseNode.id)) {
					marriedPairs.push([node, spouseNode]);
					processedNodes.add(node.id);
					processedNodes.add(spouseNode.id);
				} else if (!processedNodes.has(node.id)) {
					singleNodes.push(node);
					processedNodes.add(node.id);
				}
			} else {
				singleNodes.push(node);
				processedNodes.add(node.id);
			}
		});
		const totalPairs = marriedPairs.length;
		const totalSingles = singleNodes.length;
		const totalWidth = totalPairs * MARRIAGE_PAIR_SPACING + totalSingles * BASE_X_SPACING;
		const startX = rootNode.position.x - totalWidth / 2;
		let currentX = startX;
		marriedPairs.forEach(([node1, node2]) => {
			const nodeInLayout1 = layoutNodes.find(n => n.id === node1.id);
			const nodeInLayout2 = layoutNodes.find(n => n.id === node2.id);
			if (nodeInLayout1 && nodeInLayout2) {
				// Determine left and right based on relationship or gender
				let leftNode, rightNode;
				if (node1.data?.relationship === 'husband' || node1.data?.gender === 'male') {
					leftNode = nodeInLayout1;
					rightNode = nodeInLayout2;
				} else {
					leftNode = nodeInLayout2;
					rightNode = nodeInLayout1;
				}
				// Position couple with proper spacing
				leftNode.position = { x: currentX, y: baseY };
				rightNode.position = { x: currentX + COUPLE_INTERNAL_SPACING, y: baseY };
				currentX += MARRIAGE_PAIR_SPACING;
			}
		});
		singleNodes.forEach(node => {
			const nodeInLayout = layoutNodes.find(n => n.id === node.id);
			if (nodeInLayout) {
				nodeInLayout.position = { x: currentX, y: baseY };
				currentX += BASE_X_SPACING;
			}
		});
	});
	return { nodes: layoutNodes, edges: layoutEdges };
};


