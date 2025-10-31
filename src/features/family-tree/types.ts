// Family tree shared types
// This file centralizes TypeScript interfaces used across the family-tree feature

import { Node } from '@xyflow/react';

// Represents a node in the family tree graph with rich metadata
export interface FamilyMemberNode extends Node {
	data: {
		label: string;
		name: string;
		email: string;
		phone?: string;
		relationship?: string;
		generation: number;
		isRoot?: boolean;
		onAddRelation?: (nodeId: string) => void;
		gender?: string;
		dateOfBirth?: string;
		marriageDate?: string;
		marriageStatus?: string;
		userId?: string;
		spouseId?: string;
		parentIds?: string[];
		childIds?: string[];
		status?: string;
		isHighlighted?: boolean;
		isSelected?: boolean;
		isAlive?: boolean;
		dateOfDeath?: string;
	};
}


