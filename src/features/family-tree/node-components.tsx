// Visual components for family tree nodes
// Split out from the monolithic FamilyTreeVisualization for clarity

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Plus, User, Crown, Heart, Calendar, Mail, Phone, Users } from 'lucide-react';

// Lightweight props type to avoid circular imports
interface FamilyNodeProps {
	data: any;
	id: string;
	selected?: boolean;
}

// Node component: renders a single family member card with handles
export const FamilyNode: React.FC<FamilyNodeProps> = ({ data, id, selected }) => {
	const [isHovered, setIsHovered] = useState(false);

	const getNodeColor = (relationship?: string, isRoot?: boolean, gender?: string) => {
		if (isRoot) return 'from-purple-600 via-purple-500 to-indigo-600';

		const baseColors = {
			parent: gender === 'male' ? 'from-blue-500 via-blue-400 to-cyan-500' : 'from-pink-500 via-pink-400 to-rose-500',
			child: gender === 'male' ? 'from-green-500 via-emerald-400 to-teal-500' : 'from-yellow-500 via-orange-400 to-red-500',
			spouse: 'from-red-500 via-pink-500 to-rose-600',
			sibling: gender === 'male' ? 'from-indigo-500 via-purple-400 to-violet-500' : 'from-purple-500 via-fuchsia-400 to-pink-500'
		};

		switch (relationship) {
			case 'father':
			case 'mother':
				return baseColors.parent;
			case 'son':
			case 'daughter':
				return baseColors.child;
			case 'husband':
			case 'wife':
				return baseColors.spouse;
			case 'brother':
			case 'sister':
				return baseColors.sibling;
			default:
				return 'from-gray-500 via-slate-400 to-gray-600';
		}
	};

	const getRelationshipIcon = (relationship?: string, isRoot?: boolean) => {
		if (isRoot) return <Crown className="w-6 h-6 text-yellow-300" />;

		switch (relationship) {
			case 'father':
			case 'mother':
				return <Users className="w-6 h-6 text-white" />;
			case 'husband':
			case 'wife':
				return <Heart className="w-6 h-6 text-white" />;
			default:
				return <User className="w-6 h-6 text-white" />;
		}
	};

	const getBorderStyle = () => {
		if (selected) return 'border-4 border-blue-400 shadow-2xl shadow-blue-200';
		if (isHovered) return 'border-3 border-purple-300 shadow-xl shadow-purple-100';
		return 'border-2 border-slate-200 shadow-lg';
	};

	const getStatusBadge = () => {
		if (data.status === 'invited') {
			return (
				<div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-md">
					Invited
				</div>
			);
		}
		return null;
	};

	return (
		<div
			className={`relative bg-white ${getBorderStyle()} rounded-2xl p-5 w-[240px] h-[320px] flex flex-col justify-between transition-all duration-300 hover:scale-105 cursor-pointer`}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{/* Connection Handles */}
			<Handle type="target" position={Position.Top} className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 border-3 border-white shadow-lg" />
			<Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-gradient-to-r from-green-500 to-blue-500 border-3 border-white shadow-lg" />
			<Handle type="target" position={Position.Left} className="w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 border-3 border-white shadow-lg" />
			<Handle type="source" position={Position.Right} className="w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 border-3 border-white shadow-lg" />

			{getStatusBadge()}

			<div className="flex flex-col items-center space-y-4">
				{/* Avatar */}
				<div className={`w-20 h-20 bg-gradient-to-br ${getNodeColor(data.relationship, data.isRoot, data.gender)} rounded-full flex items-center justify-center shadow-xl ring-4 ring-white`}>
					{getRelationshipIcon(data.relationship, data.isRoot)}
				</div>

				{/* Main Info */}
				<div className="text-center space-y-2">
					<div className="font-bold text-slate-800 text-lg">{data.name}</div>
					{/* Contact Info */}
					<div className="space-y-1">
						{data.email && (
							<div className="flex items-center justify-center text-xs text-slate-600 space-x-1">
								<Mail className="w-3 h-3" />
								<span className="truncate max-w-[160px]">{data.email}</span>
							</div>
						)}
						{data.phone && (
							<div className="flex items-center justify-center text-xs text-slate-600 space-x-1">
								<Phone className="w-3 h-3" />
								<span>{data.phone}</span>
							</div>
						)}
						{data.dateOfBirth && (
							<div className="flex items-center justify-center text-xs text-slate-600 space-x-1">
								<Calendar className="w-3 h-3" />
								<span>{data.dateOfBirth}</span>
							</div>
						)}
					</div>

					{/* Relationship Badge */}
					{data.relationship && !data.isRoot && (
						<div className="inline-flex items-center text-xs font-semibold text-white px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-md">
							{data.relationship.charAt(0).toUpperCase() + data.relationship.slice(1)}
						</div>
					)}

					{data.isRoot && (
						<div className="inline-flex items-center text-xs font-semibold text-white px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-md">
							<Crown className="w-3 h-3 mr-1" />
							Root
						</div>
					)}

					{/* Marriage Info */}
					{data.marriageStatus && data.marriageDate && (
						<div className="text-xs text-slate-500 bg-pink-50 px-2 py-1 rounded-full">
							💍 {data.marriageStatus} {data.marriageDate && `on ${data.marriageDate}`}
						</div>
					)}
				</div>
			</div>

			{/* Add Relation Button */}
			<Button
				size="sm"
				variant="outline"
				className="w-10 h-10 rounded-full p-0 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white border-2 border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg self-center"
				onClick={() => {
					data.onAddRelation && data.onAddRelation(id);
				}}
			>
				<Plus className="w-5 h-5" />
			</Button>

			{/* Generation Indicator */}
			<div className="absolute top-2 left-2 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
				G{data.generation}
			</div>
		</div>
	);
};

export const nodeTypes = {
	familyMember: FamilyNode,
};


