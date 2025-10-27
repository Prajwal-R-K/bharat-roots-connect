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
			className={`relative bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 ${getBorderStyle()} rounded-xl p-4 w-[200px] h-[260px] flex flex-col justify-between transition-all duration-500 hover:scale-[1.04] hover:-translate-y-1.5 cursor-pointer backdrop-blur-sm shadow-lg hover:shadow-xl animate-fadeIn`}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}
		>
			{/* Connection Handles */}
			<Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-500 border-2 border-white shadow-md opacity-0 hover:opacity-100 transition-all duration-300" />
			<Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-gradient-to-r from-green-500 to-blue-500 border-2 border-white shadow-md opacity-0 hover:opacity-100 transition-all duration-300" />
			<Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-gradient-to-r from-red-500 to-pink-500 border-2 border-white shadow-md opacity-0 hover:opacity-100 transition-all duration-300" />
			<Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-gradient-to-r from-red-500 to-pink-500 border-2 border-white shadow-md opacity-0 hover:opacity-100 transition-all duration-300" />

			{getStatusBadge()}

			<div className="flex flex-col items-center space-y-3">
				{/* Avatar */}
				<div className={`w-16 h-16 bg-gradient-to-br ${getNodeColor(data.relationship, data.isRoot, data.gender)} rounded-full flex items-center justify-center shadow-xl ring-3 ring-white transform transition-all duration-500 ${isHovered ? 'scale-110 rotate-3' : 'scale-100'}`}>
					{getRelationshipIcon(data.relationship, data.isRoot)}
				</div>

				{/* Main Info */}
				<div className="text-center space-y-2 w-full">
					<div className="font-semibold text-slate-800 text-sm leading-snug px-1.5">{data.name}</div>
					{/* Contact Info */}
					<div className="space-y-1 px-2">
						{data.email && (
							<div className="flex items-center justify-center text-[11px] text-slate-500 space-x-1 bg-slate-50 rounded-full px-2 py-0.5">
								<Mail className="w-3 h-3 flex-shrink-0" />
								<span className="truncate max-w-[120px]">{data.email}</span>
							</div>
						)}
						{data.phone && (
							<div className="flex items-center justify-center text-xs text-slate-500 space-x-1 bg-slate-50 rounded-full px-2 py-1">
								<Phone className="w-3 h-3 flex-shrink-0" />
								<span>{data.phone}</span>
							</div>
						)}
						{data.dateOfBirth && (
							<div className="flex items-center justify-center text-xs text-slate-500 space-x-1 bg-slate-50 rounded-full px-2 py-1">
								<Calendar className="w-3 h-3 flex-shrink-0" />
								<span>{data.dateOfBirth}</span>
							</div>
						)}
					</div>

					{/* Relationship Badge */}
					{data.relationship && !data.isRoot && (
						<div className="inline-flex items-center text-[11px] font-semibold text-white px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-md">
							{data.relationship.charAt(0).toUpperCase() + data.relationship.slice(1)}
						</div>
					)}

					{data.isRoot && (
						<div className="inline-flex items-center text-[11px] font-semibold text-white px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-md">
							<Crown className="w-3 h-3 mr-1" />
							Root
						</div>
					)}

					{/* Marriage Info */}
					{data.marriageStatus && data.marriageDate && (
						<div className="text-[11px] text-slate-500 bg-pink-50 px-2 py-0.5 rounded-full">
							💍 {data.marriageStatus} {data.marriageDate && `on ${data.marriageDate}`}
						</div>
					)}
				</div>
			</div>

			{/* Add Relation Button */}
			<Button
				size="sm"
				variant="outline"
				className="w-9 h-9 rounded-full p-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-125 hover:rotate-90 self-center"
				onClick={() => {
					data.onAddRelation && data.onAddRelation(id);
				}}
			>
				<Plus className="w-4 h-4" />
			</Button>

			{/* Generation Indicator */}
			<div className="absolute top-1.5 left-1.5 text-[10px] font-bold text-slate-600 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full shadow-md border border-slate-300 transition-all duration-300 hover:scale-110">
				Gen {data.generation}
			</div>
		</div>
	);
};

// Couple Container Node: displays married couples as one elegant unit with individual controls
export const CoupleNode: React.FC<FamilyNodeProps> = ({ data, id, selected }) => {
	const [isHovered, setIsHovered] = useState(false);
	const [hoveredPerson, setHoveredPerson] = useState<number | null>(null);

	const person1 = data.person1 || {};
	const person2 = data.person2 || {};

	const getAvatarColor = (gender?: string) => {
		return gender === 'male' 
			? 'from-blue-500 via-blue-400 to-cyan-500' 
			: 'from-pink-500 via-pink-400 to-rose-500';
	};

	const getBorderStyle = () => {
		if (selected) return 'border-4 border-rose-400 shadow-2xl shadow-rose-200';
		if (isHovered) return 'border-3 border-pink-300 shadow-xl shadow-pink-100';
		return 'border-2 border-rose-200 shadow-lg';
	};

	return (
		<div
			className={`relative bg-white/80 ${getBorderStyle()} rounded-3xl p-5 w-[480px] min-h-[300px] flex flex-col transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 cursor-pointer backdrop-blur-md shadow-2xl hover:shadow-[0_25px_60px_-15px_rgba(244,63,94,0.35)] animate-fadeIn`}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			style={{ animationDelay: '0.12s', animationFillMode: 'backwards' }}
		>
			{/* subtle gradient ring */}
			<div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-rose-200/60" />
			{/* Connection Handles */}
			{/* Top handles for each spouse side */}
			<Handle id="spouse-left" type="target" position={Position.Top} className="w-4 h-4 bg-gradient-to-r from-rose-500 to-pink-500 border-2 border-white shadow-lg opacity-0 hover:opacity-100 transition-all duration-300" style={{ left: '33.3333%' }} />
			<Handle id="spouse-right" type="target" position={Position.Top} className="w-4 h-4 bg-gradient-to-r from-rose-500 to-pink-500 border-2 border-white shadow-lg opacity-0 hover:opacity-100 transition-all duration-300" style={{ left: '66.6667%' }} />
			{/* Bottom center source handle for children */}
			<Handle id="couple-bottom" type="source" position={Position.Bottom} className="w-4 h-4 bg-gradient-to-r from-rose-500 to-pink-500 border-2 border-white shadow-lg opacity-0 hover:opacity-100 transition-all duration-300" style={{ left: '50%', transform: 'translateX(-50%)' }} />
			<Handle type="target" position={Position.Left} className="w-4 h-4 bg-gradient-to-r from-rose-500 to-pink-500 border-2 border-white shadow-lg opacity-0 hover:opacity-100 transition-all duration-300" />
			<Handle type="source" position={Position.Right} className="w-4 h-4 bg-gradient-to-r from-rose-500 to-pink-500 border-2 border-white shadow-lg opacity-0 hover:opacity-100 transition-all duration-300" />

			{/* Marriage Badge at Top */}
			<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white text-[11px] px-3 py-1 rounded-full font-bold shadow-md border-2 border-white animate-bounce">
				💍 Married
			</div>

			{/* Generation Indicator */}
			<div className="absolute top-2 left-2 text-[10px] font-bold text-slate-600 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full shadow-md border border-slate-300 transition-all duration-300 hover:scale-110">
				Gen {data.generation}
			</div>

			{/* Couple Container - Equal halves with absolute centered divider */}
			<div className="relative flex items-stretch gap-6 flex-1 mt-3">
				{/* Center divider and hearts */}
				<div className="pointer-events-none absolute inset-y-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
					{/* Glow line */}
					<div className="w-px flex-1 bg-gradient-to-b from-rose-300 via-rose-400 to-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.35)]" />
				</div>
				<div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
					<span className="text-[18px] animate-pulse">💕</span>
					<span className="text-[14px] animate-pulse" style={{ animationDelay: '0.15s' }}>💗</span>
					<span className="text-[12px] animate-pulse" style={{ animationDelay: '0.3s' }}>💞</span>
				</div>

				{/* Person 1 - Left Half */}
				<div 
					className={`flex-1 flex flex-col items-center justify-between p-3 rounded-2xl transition-all duration-300 ${hoveredPerson === 1 ? 'bg-blue-50/50 scale-[1.02]' : 'bg-transparent'}`}
					onMouseEnter={() => setHoveredPerson(1)}
					onMouseLeave={() => setHoveredPerson(null)}
				>
					<div className="flex flex-col items-center space-y-2.5 flex-1">
						{/* Avatar */}
						<div className={`w-14 h-14 bg-gradient-to-br ${getAvatarColor(person1.gender)} rounded-full flex items-center justify-center shadow-xl ring-4 ring-white/90 transform transition-all duration-500 ${hoveredPerson === 1 ? 'scale-110 rotate-6' : 'scale-100'}`}>
							<User className="w-6 h-6 text-white" />
						</div>
						
						{/* Info */}
						<div className="text-center space-y-1.5 w-full">
							<div className="font-semibold text-slate-800 text-sm leading-snug">{person1.name}</div>
							{person1.email && (
								<div className="flex items-center justify-center text-[11px] text-slate-600 space-x-1 bg-white rounded-full px-2 py-0.5 shadow-sm border border-slate-200/70">
									<Mail className="w-3 h-3 flex-shrink-0" />
									<span className="truncate max-w-[120px]">{person1.email}</span>
								</div>
							)}
							<div className="inline-flex items-center text-[11px] font-bold text-white px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 shadow-md">
								{person1.relationship || 'Husband'}
							</div>
						</div>
					</div>

					{/* Individual Add Button for Person 1 */}
					<Button
						size="sm"
						variant="outline"
						className="w-9 h-9 rounded-full p-0 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-125 hover:rotate-90 mt-1"
						onClick={(e) => {
							e.stopPropagation();
							person1.onAddRelation && person1.onAddRelation(person1.id);
						}}
					>
						<Plus className="w-4 h-4" />
					</Button>
				</div>

				{/* Marriage date under hearts (centered) */}
				{data.marriageDate && (
					<div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[calc(50%+74px)] text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded-full shadow-sm border border-rose-200 whitespace-nowrap">
						{data.marriageDate}
					</div>
				)}

				{/* Person 2 - Right Half */}
				<div 
					className={`flex-1 flex flex-col items-center justify-between p-3 rounded-2xl transition-all duration-300 ${hoveredPerson === 2 ? 'bg-pink-50/60 scale-[1.02]' : 'bg-transparent'}`}
					onMouseEnter={() => setHoveredPerson(2)}
					onMouseLeave={() => setHoveredPerson(null)}
				>
					<div className="flex flex-col items-center space-y-2.5 flex-1">
						{/* Avatar */}
						<div className={`w-14 h-14 bg-gradient-to-br ${getAvatarColor(person2.gender)} rounded-full flex items-center justify-center shadow-xl ring-4 ring-white/90 transform transition-all duration-500 ${hoveredPerson === 2 ? 'scale-110 -rotate-6' : 'scale-100'}`}>
							<User className="w-6 h-6 text-white" />
						</div>
						
						{/* Info */}
						<div className="text-center space-y-1.5 w-full">
							<div className="font-semibold text-slate-800 text-sm leading-snug">{person2.name}</div>
							{person2.email && (
								<div className="flex items-center justify-center text-[11px] text-slate-600 space-x-1 bg-white rounded-full px-2 py-0.5 shadow-sm border border-slate-200/70">
									<Mail className="w-3 h-3 flex-shrink-0" />
									<span className="truncate max-w-[120px]">{person2.email}</span>
								</div>
							)}
							<div className="inline-flex items-center text-[11px] font-bold text-white px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 shadow-md">
								{person2.relationship || 'Wife'}
							</div>
						</div>
					</div>

					{/* Individual Add Button for Person 2 */}
					<Button
						size="sm"
						variant="outline"
						className="w-9 h-9 rounded-full p-0 bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 hover:from-pink-600 hover:to-rose-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-125 hover:rotate-90 mt-1"
						onClick={(e) => {
							e.stopPropagation();
							person2.onAddRelation && person2.onAddRelation(person2.id);
						}}
					>
						<Plus className="w-4 h-4" />
					</Button>
				</div>
			</div>
		</div>
	);
};

export const nodeTypes = {
	familyMember: FamilyNode,
	couple: CoupleNode,
};


