// Edge components for family tree graph
// Split out from FamilyTreeVisualization for modularity

import React from 'react';
import { useEdges, useNodes, Edge, Node } from '@xyflow/react';

// Marriage edge with decorative hearts and glow
export const MarriageEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {} }: any) => {
	const centerX = (sourceX + targetX) / 2;
	const centerY = (sourceY + targetY) / 2;
	const distance = Math.abs(targetX - sourceX);
	const archHeight = Math.max(30, Math.min(60, distance / 4));
	const controlPointY = centerY - archHeight;
	const edgePath = `M ${sourceX},${centerY} Q ${centerX},${controlPointY} ${targetX},${centerY}`;

	return (
		<>
			<defs>
				<linearGradient id={`marriage-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stopColor="#ec4899" />
					<stop offset="50%" stopColor="#ef4444" />
					<stop offset="100%" stopColor="#ec4899" />
				</linearGradient>
				<filter id={`marriage-glow-${id}`}>
					<feGaussianBlur stdDeviation="5" result="coloredBlur" />
					<feMerge>
						<feMergeNode in="coloredBlur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>
			<path id={id} style={{ ...style, strokeWidth: 8, stroke: `url(#marriage-gradient-${id})`, filter: `url(#marriage-glow-${id})` }} className="react-flow__edge-path animate-pulse" d={edgePath} />
			<g>
				<text x={centerX - 20} y={controlPointY - 5} textAnchor="middle" style={{ fontSize: '18px', fill: '#ef4444', fontWeight: 'bold' }}>💕</text>
				<text x={centerX} y={controlPointY - 8} textAnchor="middle" style={{ fontSize: '24px', fill: '#ef4444', fontWeight: 'bold' }}>💍</text>
				<text x={centerX + 20} y={controlPointY - 5} textAnchor="middle" style={{ fontSize: '18px', fill: '#ef4444', fontWeight: 'bold' }}>💕</text>
			</g>
		</>
	);
};

// Parent-child edge. If from marriage, route from marriage center down to the child
export const ParentChildEdge = ({ id, sourceX, sourceY, targetX, targetY, data, style = {}, source, target }: any) => {
	let marriageCenterX: number | undefined;
	let marriageCenterY: number | undefined;

	if (data?.isFromMarriage) {
		const edges = useEdges();
		const marriageEdge = edges.find(e => (e.source === source || e.target === source) && e.type === 'marriage');
		if (marriageEdge) {
			const spouseId = marriageEdge.source === source ? marriageEdge.target : marriageEdge.source;
			const nodes = useNodes();
			const sourceNode = nodes.find(n => n.id === source);
			const spouseNode = nodes.find(n => n.id === spouseId);
			if (sourceNode && spouseNode) {
				const leftNode = sourceNode.position.x < spouseNode.position.x ? sourceNode : spouseNode;
				const rightNode = sourceNode.position.x < spouseNode.position.x ? spouseNode : sourceNode;
				const leftHandleX = leftNode.position.x + (leftNode.width || 240);
				const leftHandleY = leftNode.position.y + (leftNode.height || 320) / 2;
				const rightHandleX = rightNode.position.x;
				const rightHandleY = rightNode.position.y + (rightNode.height || 320) / 2;
				const centerX = (leftHandleX + rightHandleX) / 2;
				const centerY = (leftHandleY + rightHandleY) / 2;
				const distance = Math.abs(rightHandleX - leftHandleX);
				const archHeight = Math.max(30, Math.min(60, distance / 4));
				const controlPointY = centerY - archHeight;
				marriageCenterX = centerX;
				marriageCenterY = controlPointY - 8;
			}
		}
	}

	if (data?.isFromMarriage && marriageCenterX !== undefined && marriageCenterY !== undefined) {
		const dropDistance = 120;
		const horizontalDistance = 60;
		const intermediateY = marriageCenterY + dropDistance;
		const edgePath = `\n      M ${marriageCenterX},${marriageCenterY}\n      L ${marriageCenterX},${intermediateY - horizontalDistance}\n      Q ${marriageCenterX},${intermediateY} ${marriageCenterX + (targetX > marriageCenterX ? horizontalDistance : -horizontalDistance)},${intermediateY}\n      L ${targetX - (targetX > marriageCenterX ? horizontalDistance : -horizontalDistance)},${intermediateY}\n      Q ${targetX},${intermediateY} ${targetX},${intermediateY + horizontalDistance}\n      L ${targetX},${targetY}\n    `;

		return (
			<>
				<defs>
					<linearGradient id={`child-gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stopColor="#3b82f6" />
						<stop offset="50%" stopColor="#22c55e" />
						<stop offset="100%" stopColor="#10b981" />
					</linearGradient>
					<marker id={`child-arrow-${id}`} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
						<polygon points="0,0 0,12 12,6" fill="#22c55e" />
					</marker>
				</defs>
				<path id={id} style={{ ...style, strokeWidth: 4, stroke: `url(#child-gradient-${id})`, strokeLinecap: 'round', strokeLinejoin: 'round' }} className="react-flow__edge-path" d={edgePath} markerEnd={`url(#child-arrow-${id})`} />
				<circle cx={marriageCenterX} cy={marriageCenterY} r="5" fill="#22c55e" stroke="white" strokeWidth="2" className="drop-shadow-md" />
				<circle cx={targetX} cy={intermediateY} r="3" fill="#10b981" stroke="white" strokeWidth="1" />
			</>
		);
	}

	const deltaX = targetX - sourceX;
	const deltaY = targetY - sourceY;
	const c1x = sourceX + deltaX * 0.2;
	const c1y = sourceY + deltaY * 0.8;
	const c2x = sourceX + deltaX * 0.8;
	const c2y = sourceY + deltaY * 0.2;
	const edgePath = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;

	return (
		<>
			<defs>
				<linearGradient id={`parent-gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stopColor="#3b82f6" />
					<stop offset="100%" stopColor="#1d4ed8" />
				</linearGradient>
				<marker id={`parent-arrow-${id}`} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
					<polygon points="0,0 0,10 10,5" fill="#1d4ed8" />
				</marker>
			</defs>
			<path id={id} style={{ ...style, strokeWidth: 3, stroke: `url(#parent-gradient-${id})`, strokeLinecap: 'round' }} className="react-flow__edge-path" d={edgePath} markerEnd={`url(#parent-arrow-${id})`} />
		</>
	);
};

// Sibling edge with dashed styling and emoji marker
export const SiblingEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {} }: any) => {
	const centerX = (sourceX + targetX) / 2;
	const centerY = (sourceY + targetY) / 2 - 40;
	const edgePath = `M ${sourceX},${sourceY} Q ${centerX},${centerY} ${targetX},${targetY}`;
	return (
		<>
			<defs>
				<linearGradient id={`sibling-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stopColor="#8b5cf6" />
					<stop offset="50%" stopColor="#a855f7" />
					<stop offset="100%" stopColor="#8b5cf6" />
				</linearGradient>
			</defs>
			<path id={id} style={{ ...style, strokeWidth: 3, stroke: `url(#sibling-gradient-${id})`, strokeDasharray: '8,4', strokeLinecap: 'round' }} className="react-flow__edge-path" d={edgePath} />
			<text x={centerX} y={centerY - 5} textAnchor="middle" style={{ fontSize: '14px', fill: '#8b5cf6', fontWeight: 'bold' }}>👫</text>
		</>
	);
};

export const edgeTypes = {
	marriage: MarriageEdge,
	parentChild: ParentChildEdge,
	sibling: SiblingEdge,
};


