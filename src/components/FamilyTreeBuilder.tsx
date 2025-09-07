// src/components/FamilyTreeBuilder.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import elk from 'cytoscape-elk';

cytoscape.use(elk);
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, User, Save, ArrowLeft, Maximize } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { generateId, getCurrentDateTime } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Import the separated modules
import { 
  initializeFamilyTree, 
  validateRelationshipAddition, 
  checkEmailExists 
} from './FamilyTreeStore';
import { 
  relationshipCategories,
  addFamilyMemberWithRelationships,
  validateSiblingRelationship
} from './FamilyTreeLogic';
import { getAvatarForMember } from '@/lib/avatar-utils';

interface FamilyTreeBuilderProps {
  onComplete: (familyData: any) => void;
  onBack: () => void;
  registrationData: any;
}

const FamilyTreeBuilder: React.FC<FamilyTreeBuilderProps> = ({ onComplete, onBack, registrationData }) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [cytoscapeElements, setCytoscapeElements] = useState<cytoscape.ElementDefinition[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRelationshipChoice, setShowRelationshipChoice] = useState(false);
  const [selectedRelationshipCategory, setSelectedRelationshipCategory] = useState<string>('');
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: '',
    gender: '',
    dateOfBirth: '',
    marriageDate: '',
    marriageStatus: 'married'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [familyTreeId, setFamilyTreeId] = useState<string | null>(null);
  const [rootUser, setRootUser] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);

  const handleAddRelation = useCallback((nodeId: string) => {
    console.log('handleAddRelation called with nodeId:', nodeId);
    const member = familyMembers.find(m => m.userId === nodeId);
    console.log('Found member:', member);
    if (!member) {
      console.log('Member not found!');
      return;
    }
    
    setSelectedNodeId(nodeId);
    setSelectedNode(member);
    setShowRelationshipChoice(true);
    setNewMember({
      name: '',
      email: '',
      phone: '',
      relationship: '',
      gender: '',
      dateOfBirth: '',
      marriageDate: '',
      marriageStatus: 'married'
    });
  }, [familyMembers]);

  // Initialize family tree, root user, and root node
  useEffect(() => {
    const initialize = async () => {
      if (registrationData && !familyTreeId && familyMembers.length === 0) {
        const { familyTreeId: ftId, rootUser: ru } = await initializeFamilyTree(registrationData);
        setFamilyTreeId(ftId);
        setRootUser(ru);
        setFamilyMembers([ru]);
      }
    };
    initialize();
  }, [registrationData, familyTreeId, familyMembers.length]);

  // Cytoscape styles similar to FamilyTreeVisualization1
  const getCytoscapeStyles = useCallback((): any => [
    {
      selector: 'node[type="individual"]',
      style: {
        width: 100,
        height: 100,
        shape: "ellipse" as any,
        "background-image": "data(profileImage)" as any,
        "background-fit": "cover cover" as any,
        "background-opacity": 1,
        "border-width": 4,
        "border-color": "data(borderColor)" as any,
        "border-opacity": 1,
        label: "data(displayName)" as any,
        "text-valign": "bottom" as any,
        "text-halign": "center" as any,
        "text-margin-y": 12,
        "font-size": "14px" as any,
        "font-weight": "bold" as any,
        color: "#1f2937",
        "text-wrap": "wrap" as any,
        "text-max-width": "120px" as any,
        "overlay-opacity": 0,
      }
    },
    {
      selector: 'edge[type="marriage"]',
      style: {
        width: 4,
        "line-color": "#dc2626",
        "curve-style": "straight" as any,
        "line-style": "solid" as any,
        opacity: 0.8
      }
    },
    {
      selector: 'edge[type="parentChild"]',
      style: {
        width: 3,
        "line-color": "#20b2aa",
        "curve-style": "unbundled-bezier" as any,
        "target-arrow-shape": "triangle" as any,
        "target-arrow-color": "#20b2aa",
        opacity: 0.9
      }
    },
    {
      selector: 'edge[type="sibling"]',
      style: {
        width: 3,
        "line-color": "#2563eb",
        "curve-style": "straight" as any,
        "line-style": "dashed" as any,
        opacity: 0.7
      }
    }
  ], []);

  // Convert family members to Cytoscape elements
  const createCytoscapeElements = useCallback((members: any[], rels: any[]) => {
    const elements: cytoscape.ElementDefinition[] = [];
    
    // Add nodes
    members.forEach((member) => {
      const isRoot = member.userId === rootUser?.userId;
      const getSafeColor = (gender?: string, isRoot = false) => {
        if (isRoot) return { 
          bgColor: "#f59e0b", 
          borderColor: "#ea580c" 
        };
        if (gender === "male") return { 
          bgColor: "#3b82f6", 
          borderColor: "#1e40af" 
        };
        if (gender === "female") return { 
          bgColor: "#ec4899", 
          borderColor: "#be185d" 
        };
        return { 
          bgColor: "#8b5cf6", 
          borderColor: "#6d28d9" 
        };
      };

      const colors = getSafeColor(member.gender, isRoot);
      const displayName = member.name.length > 15 ? member.name.substring(0, 15) + "..." : member.name;
      
      elements.push({
        data: {
          id: member.userId,
          type: "individual",
          displayName: isRoot ? `👑 ${displayName}` : displayName,
          fullName: member.name,
          email: member.email || "",
          gender: member.gender || "",
          isRoot,
          ...colors,
          profileImage: getAvatarForMember(member, member.profilePicture)
        }
      });
    });

    // Add edges for relationships
    rels.forEach((rel) => {
      if (rel.type === "MARRIED_TO") {
        elements.push({
          data: {
            id: `marriage_${rel.source}_${rel.target}`,
            source: rel.source,
            target: rel.target,
            type: "marriage"
          }
        });
      } else if (rel.type === "PARENTS_OF") {
        elements.push({
          data: {
            id: `parent_${rel.source}_${rel.target}`,
            source: rel.source,
            target: rel.target,
            type: "parentChild"
          }
        });
      } else if (rel.type === "SIBLING") {
        elements.push({
          data: {
            id: `sibling_${rel.source}_${rel.target}`,
            source: rel.source,
            target: rel.target,
            type: "sibling"
          }
        });
      }
    });

    return elements;
  }, [rootUser]);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || familyMembers.length === 0) return;

    const elements = createCytoscapeElements(familyMembers, relationships);
    setCytoscapeElements(elements);

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: getCytoscapeStyles(),
      layout: {
        name: "elk",
        elk: {
          "algorithm": "layered",
          "elk.direction": "DOWN",
          "elk.spacing.nodeNode": 100,
          "elk.layered.spacing.nodeNodeBetweenLayers": 150,
          "elk.spacing.edgeNode": 50,
          "elk.spacing.edgeEdge": 30,
          "elk.alignment": "CENTER"
        }
      } as any,
      zoomingEnabled: true,
      userZoomingEnabled: true,
      panningEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      selectionType: 'single',
      wheelSensitivity: 0.1,
      minZoom: 0.1,
      maxZoom: 3
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [familyMembers, relationships, getCytoscapeStyles, createCytoscapeElements]);

  // Add overlay buttons for adding relations
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    
    const addOverlayButtons = () => {
      cy.nodes('[type="individual"]').forEach((node) => {
        const renderedPosition = node.renderedPosition();
        const nodeId = node.id();
        
        // Create + button overlay
        const button = document.createElement('button');
        button.className = 'absolute bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg transition-all duration-200 hover:scale-110 z-50';
        button.innerHTML = '+';
        button.style.left = `${renderedPosition.x + 35}px`;
        button.style.top = `${renderedPosition.y - 35}px`;
        button.style.pointerEvents = 'auto';
        
        button.onclick = (e) => {
          e.stopPropagation();
          handleAddRelation(nodeId);
        };

        if (containerRef.current) {
          containerRef.current.appendChild(button);
        }
      });
    };

    // Add buttons after layout
    const layoutHandler = () => {
      setTimeout(addOverlayButtons, 100);
    };

    cy.on('layoutstop', layoutHandler);
    
    // Initial button placement
    setTimeout(addOverlayButtons, 500);

    return () => {
      cy.off('layoutstop', layoutHandler);
      // Clean up overlay buttons
      if (containerRef.current) {
        const buttons = containerRef.current.querySelectorAll('button');
        buttons.forEach(btn => btn.remove());
      }
    };
  }, [familyMembers, handleAddRelation]);

  const handleRelationshipCategorySelect = async (category: string) => {
    if (category === 'sibling') {
      const validation = await validateSiblingRelationship(selectedNode, familyTreeId!);
      if (validation.shouldAddParent) {
        setSelectedRelationshipCategory('parent');
        setShowRelationshipChoice(false);
        setShowAddDialog(true);
        return;
      }
      if (validation.shouldCancel) {
        setShowRelationshipChoice(false);
        return;
      }
    }
    setSelectedRelationshipCategory(category);
    setShowRelationshipChoice(false);
    setShowAddDialog(true);
  };

  const addFamilyMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.relationship || !newMember.gender || !selectedNodeId || !familyTreeId || !rootUser) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields (name, email, relationship, gender).",
        variant: "destructive",
      });
      return;
    }

    const validation = await validateRelationshipAddition(selectedNode, selectedRelationshipCategory, familyTreeId, newMember);
    if (!validation.valid) {
      toast({
        title: "Cannot add relationship",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    if (validation.requiresConfirmation) {
      const confirmed = window.confirm(validation.message + "\n\nClick OK to continue or Cancel to abort.");
      if (!confirmed) {
        return;
      }
    }

    const emailExists = await checkEmailExists(newMember.email, familyMembers);
    if (emailExists) {
      toast({
        title: "Email already exists",
        description: "This email is already in use. Please use a different email.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await addFamilyMemberWithRelationships(
        newMember,
        selectedNodeId,
        selectedRelationshipCategory,
        familyTreeId,
        rootUser,
        familyMembers,
        relationships,
        setFamilyMembers,
        setRelationships,
        selectedNode,
        handleAddRelation
      );

      setShowAddDialog(false);
      setSelectedRelationshipCategory('');
      setNewMember({ 
        name: '', 
        email: '', 
        phone: '', 
        relationship: '', 
        gender: '',
        dateOfBirth: '',
        marriageDate: '',
        marriageStatus: 'married'
      });

      toast({
        title: "Family member added",
        description: `${newMember.name} has been added to the family tree.`,
      });
    } catch (error) {
      console.error('Error adding family member:', error);
      toast({
        title: "Error",
        description: "Failed to add family member. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    if (familyMembers.length <= 1) {
      toast({
        title: "Add family members",
        description: "Please add at least one family member before creating the tree.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      toast({
        title: "Family Tree Created!",
        description: "Your family tree has been saved successfully.",
      });

      navigate('/dashboard', {
        state: { user: rootUser },
        replace: true
      });
    } catch (error) {
      console.error('Error completing family tree:', error);
      toast({
        title: "Error",
        description: "Failed to complete family tree. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Build Your Family Tree</h1>
          <p className="text-slate-600 text-sm mt-1">Click the + button on any node to add family members</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={handleComplete}
            disabled={familyMembers.length <= 1 || isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Creating...' : 'Create Family Tree'}
          </Button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={containerRef}
          className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 relative"
          style={{ minHeight: '600px' }}
        />
        
        {/* Controls */}
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
          <button
            onClick={() => cyRef.current?.fit()}
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-2 shadow-lg transition-all duration-200"
            title="Fit to view"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <button
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-2 shadow-lg transition-all duration-200"
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-2 shadow-lg transition-all duration-200"
            title="Zoom out"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
              <Input
                id="name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="Enter full name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gender" className="text-sm font-medium">Gender *</Label>
              <select
                id="gender"
                value={newMember.gender}
                onChange={e => setNewMember({ ...newMember, gender: e.target.value })}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring mt-1"
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <Label htmlFor="relationship" className="text-sm font-medium">Relationship *</Label>
              <Select
                value={newMember.relationship}
                onValueChange={(value) => setNewMember({ ...newMember, relationship: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {relationshipCategories[selectedRelationshipCategory as keyof typeof relationshipCategories]?.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="Enter email address"
                className="mt-1"
              />
            </div>

            {selectedRelationshipCategory === 'spouse' && (
              <>
                <div>
                  <Label htmlFor="marriageDate" className="text-sm font-medium">Marriage Date</Label>
                  <Input
                    id="marriageDate"
                    type="date"
                    value={newMember.marriageDate}
                    onChange={(e) => setNewMember({ ...newMember, marriageDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="marriageStatus" className="text-sm font-medium">Marriage Status</Label>
                  <Select value={newMember.marriageStatus} onValueChange={(value) => setNewMember({ ...newMember, marriageStatus: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="dateOfBirth" className="text-sm font-medium">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={newMember.dateOfBirth}
                onChange={(e) => setNewMember({ ...newMember, dateOfBirth: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium">Phone (Optional)</Label>
              <Input
                id="phone"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                placeholder="Enter phone number"
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={addFamilyMember}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!newMember.name || !newMember.email || !newMember.relationship || !newMember.gender}
              >
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRelationshipChoice} onOpenChange={setShowRelationshipChoice}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Add Relation to {selectedNode?.name}
            </DialogTitle>
            <p className="text-sm text-slate-600 mt-2">
              What relation do you want to add?
            </p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center text-center space-y-2"
              onClick={() => handleRelationshipCategorySelect('parent')}
            >
              <User className="w-6 h-6" />
              <span className="text-sm font-medium">Add Parent</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center text-center space-y-2"
              onClick={() => handleRelationshipCategorySelect('spouse')}
            >
              <User className="w-6 h-6" />
              <span className="text-sm font-medium">Add Spouse</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center text-center space-y-2"
              onClick={() => handleRelationshipCategorySelect('child')}
            >
              <User className="w-6 h-6" />
              <span className="text-sm font-medium">Add Child</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center text-center space-y-2"
              onClick={() => handleRelationshipCategorySelect('sibling')}
            >
              <User className="w-6 h-6" />
              <span className="text-sm font-medium">Add Sibling</span>
            </Button>
          </div>
          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowRelationshipChoice(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyTreeBuilder;