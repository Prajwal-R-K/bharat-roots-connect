// Edge factories and helpers
import { Edge, Node } from '@xyflow/react';

export const createMarriageEdge = (node1Id: string, node2Id: string): Edge => ({
	id: `marriage-${node1Id}-${node2Id}`,
	source: node1Id,
	target: node2Id,
	type: 'marriage',
	style: { strokeWidth: 6 },
	data: { isMarriage: true },
	animated: true,
});

export const createParentChildEdge = (parentId: string, childId: string, isFromMarriage: boolean = false): Edge => ({
	id: `parent-child-${parentId}-${childId}`,
	source: parentId,
	target: childId,
	type: 'parentChild',
	data: { isFromMarriage },
});

export const createSiblingEdge = (node1Id: string, node2Id: string): Edge => ({
	id: `sibling-${node1Id}-${node2Id}`,
	source: node1Id,
	target: node2Id,
	type: 'sibling',
	style: { strokeWidth: 3 },
	data: { isSibling: true },
});

export const removeConflictingEdges = (childNodeId: string, setEdges: any) => {
	setEdges((edges: Edge[]) => edges.filter(edge => {
		if (edge.type === 'marriage') return true;
		if (edge.target === childNodeId && edge.type === 'parentChild') return false;
		return true;
	}));
};


