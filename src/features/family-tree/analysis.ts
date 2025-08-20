// Analytics, validation, and export helpers for family tree
import { Edge, Node } from '@xyflow/react';

export const validateRelationship = (
	newRelationship: string,
	parentNode: Node,
	existingNodes: Node[]
): { isValid: boolean; message?: string } => {
	const parentData: any = parentNode.data;


	// if (['husband', 'wife'].includes(newRelationship)) {
	// 	const existingSpouses = existingNodes.filter(node => ['husband', 'wife'].includes(node.data?.relationship as string) && node.data?.generation === parentData.generation);
	// 	if (existingSpouses.length > 0) {
	// 		return { isValid: false, message: 'This person already has a spouse. Consider adding as divorced/separated spouse or remove existing marriage first.' };
	// 	}
	// }

	// Do not block adding 'father'/'mother' at the UI level by scanning all nodes at this generation.
	// Proper parent limits are validated against the database in validateRelationshipAddition.
	return { isValid: true };
};

export const getFamilyTreeStats = (nodes: Node[], edges: Edge[]) => ({
	totalMembers: nodes.length,
	generations: new Set(nodes.map(n => n.data?.generation || 0)).size,
	marriages: edges.filter(e => e.type === 'marriage').length,
	relationships: edges.filter(e => e.type === 'parentChild').length,
	pendingInvitations: nodes.filter(n => n.data?.status === 'invited').length,
});

export const highlightRelatedNodes = (selectedNodeId: string, nodes: Node[], edges: Edge[]) => {
	const relatedNodeIds = new Set<string>([selectedNodeId]);
	edges.forEach(edge => {
		if (edge.source === selectedNodeId) relatedNodeIds.add(edge.target);
		if (edge.target === selectedNodeId) relatedNodeIds.add(edge.source);
	});
	return nodes.map(node => ({
		...node,
		data: { ...node.data, isHighlighted: relatedNodeIds.has(node.id), isSelected: node.id === selectedNodeId },
	}));
};


