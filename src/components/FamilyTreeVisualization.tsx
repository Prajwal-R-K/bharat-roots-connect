// Compatibility shim: re-export split feature modules so existing imports continue to work.
// The actual implementation now lives in `src/features/family-tree/*`.

export type { FamilyMemberNode } from '@/features/family-tree/types';
export { FamilyNode, nodeTypes } from '@/features/family-tree/node-components';
export { MarriageEdge, ParentChildEdge, SiblingEdge, edgeTypes } from '@/features/family-tree/edge-components';
export { calculateGeneration, calculateOptimalPosition, findMarriageCenter, autoLayoutFamilyTree } from '@/features/family-tree/layout';
export { createMarriageEdge, createParentChildEdge, createSiblingEdge, removeConflictingEdges } from '@/features/family-tree/edges';
export { validateRelationship, getFamilyTreeStats, highlightRelatedNodes } from '@/features/family-tree/analysis';

export { FamilyNode as default } from '@/features/family-tree/node-components';


