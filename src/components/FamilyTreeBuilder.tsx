// src/components/FamilyTreeBuilder.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, User, Save, ArrowLeft } from 'lucide-react';
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
  nodeTypes, 
  edgeTypes, 
  FamilyMemberNode 
} from './FamilyTreeVisualization';
import { 
  relationshipCategories,
  addFamilyMemberWithRelationships,
  validateSiblingRelationship
} from './FamilyTreeLogic';

interface FamilyTreeBuilderProps {
  onComplete: (familyData: any) => void;
  onBack: () => void;
  registrationData: any;
}

const FamilyTreeBuilder: React.FC<FamilyTreeBuilderProps> = ({ onComplete, onBack, registrationData }) => {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
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
    marriageStatus: 'married',
    hasEmail: false,
    userId: '',
    password: '',
    confirmPassword: '',
    isAlive: true,
    dateOfDeath: '',
    aliveStatus: '',
    birthDate: '',
    deathDate: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [familyTreeId, setFamilyTreeId] = useState<string | null>(null);
  const [rootUser, setRootUser] = useState<any>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggingNodeInitialPos, setDraggingNodeInitialPos] = useState<{ x: number; y: number } | null>(null);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const initializingRef = useRef(false);
  
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const handleAddRelation = useCallback((nodeId: string) => {
    console.log('handleAddRelation called with nodeId:', nodeId);
    
    // First try to find as a regular node
    let node = nodesRef.current.find(n => n.id === nodeId);
    
    // If not found, check if it's a person within a couple node
    if (!node) {
      // Search within couple nodes
      for (const n of nodesRef.current) {
        if (n.type === 'couple') {
          // Check if this nodeId belongs to person1 or person2
          if (n.data.person1?.id === nodeId) {
            // Create a virtual node for person1
            node = {
              id: nodeId,
              type: 'familyMember',
              position: n.position,
              data: {
                ...n.data.person1,
                generation: n.data.generation,
                coupleNodeId: n.id // Store reference to parent couple node
              }
            };
            break;
          } else if (n.data.person2?.id === nodeId) {
            // Create a virtual node for person2
            node = {
              id: nodeId,
              type: 'familyMember',
              position: n.position,
              data: {
                ...n.data.person2,
                generation: n.data.generation,
                coupleNodeId: n.id // Store reference to parent couple node
              }
            };
            break;
          }
        }
      }
    }
    
    console.log('Found node:', node);
    if (!node) {
      console.log('Node not found!');
      return;
    }
    
    setSelectedNodeId(nodeId);
    setSelectedNode(node);
    setShowRelationshipChoice(true);
    setNewMember({
      name: '',
      email: '',
      phone: '',
      relationship: '',
      gender: '',
      dateOfBirth: '',
      marriageDate: '',
      marriageStatus: 'married',
      hasEmail: true,
      userId: '',
      password: '',
      confirmPassword: '',
      isAlive: true,
      dateOfDeath: '',
      aliveStatus: '',
      birthDate: '',
      deathDate: ''
    });
  }, []);

  // Initialize family tree, root user, and root node
  useEffect(() => {
    const initialize = async () => {
      // Prevent double initialization in React Strict Mode
      if (registrationData && !familyTreeId && nodes.length === 0 && !initializingRef.current) {
        initializingRef.current = true;
        
        try {
          const { familyTreeId: ftId, rootUser: ru } = await initializeFamilyTree(registrationData);
          setFamilyTreeId(ftId);
          setRootUser(ru);

          const rootNode: FamilyMemberNode = {
            id: 'root',
            type: 'familyMember',
            position: { x: 0, y: 0 },
            data: {
              label: ru.name,
              name: ru.name,
              email: ru.email,
              generation: 0,
              isRoot: true,
              onAddRelation: handleAddRelation,
              gender: ru.gender,
              userId: ru.userId,
              isAlive: true,
              status: 'active'
            }
          };
          setNodes([rootNode]);
        } catch (error) {
          console.error('Failed to initialize family tree:', error);
          initializingRef.current = false; // Reset flag on error
        }
      }
    };
    initialize();
  }, [registrationData, handleAddRelation, setNodes, familyTreeId, nodes.length]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

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
    // Validate required fields based on whether user has email or not
    const requiredFields = [newMember.name, newMember.relationship, newMember.gender];
    
    if (newMember.hasEmail) {
      requiredFields.push(newMember.email);
    } else {
      requiredFields.push(newMember.userId, newMember.password, newMember.confirmPassword);
    }
    
    if (requiredFields.some(field => !field) || !selectedNodeId || !familyTreeId || !rootUser) {
      const missingFields = [];
      if (!newMember.name) missingFields.push('name');
      if (!newMember.relationship) missingFields.push('relationship');
      if (!newMember.gender) missingFields.push('gender');
      if (newMember.hasEmail && !newMember.email) missingFields.push('email');
      if (!newMember.hasEmail && !newMember.userId) missingFields.push('userId');
      if (!newMember.hasEmail && !newMember.password) missingFields.push('password');
      if (!newMember.hasEmail && !newMember.confirmPassword) missingFields.push('confirm password');
      
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.join(', ')}.`,
        variant: "destructive",
      });
      return;
    }

    // Check password confirmation for users without email
    if (!newMember.hasEmail && newMember.password !== newMember.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    // Check if user is trying to reconnect to themselves (only for users with email)
    if (newMember.hasEmail && newMember.email && rootUser && newMember.email === rootUser.email) {
      toast({
        title: "Cannot add yourself",
        description: "You cannot add yourself as a family member. This will create a new family member with your email.",
      });
      // Continue with creation - don't return, just warn
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

    // Only check email if user has email
    if (newMember.hasEmail && newMember.email) {
      const emailExists = await checkEmailExists(newMember.email, nodes);
      if (emailExists) {
        toast({
          title: "Email already exists",
          description: "This email is already in use. Please use a different email.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await addFamilyMemberWithRelationships(
        newMember,
        selectedNodeId,
        selectedRelationshipCategory,
        familyTreeId,
        rootUser,
        nodes,
        edges,
        setNodes,
        setEdges,
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
        marriageStatus: 'married',
        hasEmail: true,
        userId: '',
        password: '',
        confirmPassword: '',
        isAlive: true,
        dateOfDeath: '',
        aliveStatus: '',
        birthDate: '',
        deathDate: ''
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
    if (nodes.length <= 1) {
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
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm z-10">
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Build Your Family Tree</h1>
          <p className="text-slate-600 text-xs md:text-sm mt-1">Click the + button on any node to add family members</p>
        </div>
        <div className="flex gap-2 md:gap-3 w-full md:w-auto">
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
          disabled={nodes.length <= 1 || isLoading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Creating...' : 'Create Family Tree'}
        </Button>
      </div>
    </div>

    <div className="flex-1 relative overflow-hidden w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.3,
          maxZoom: 1.0,
          duration: 800
        }}
        className="w-full h-full bg-transparent"
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
        minZoom={0.1}
        maxZoom={2.0}
        panOnScroll={true}
        panOnScrollSpeed={0.5}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnDrag={true}
        selectNodesOnDrag={false}
        proOptions={{ hideAttribution: true }}
        onNodeDragStart={(event, node) => {
          setDraggingNodeId(node.id);
          setDraggingNodeInitialPos(node.position);
        }}
        onNodeDrag={(event, node) => {
          if (node.id === draggingNodeId && draggingNodeInitialPos) {
            const marriageEdge = edges.find(e => e.type === 'marriage' && (e.source === node.id || e.target === node.id));
            if (marriageEdge) {
              const spouseId = marriageEdge.source === node.id ? marriageEdge.target : marriageEdge.source;
              const deltaX = node.position.x - draggingNodeInitialPos.x;
              const deltaY = node.position.y - draggingNodeInitialPos.y;
              setNodes((nds) => nds.map(n => {
                if (n.id === spouseId) {
                  const currentSpouseNode = nds.find(sn => sn.id === spouseId);
                  if (currentSpouseNode) {
                    return {
                      ...n,
                      position: {
                        x: currentSpouseNode.position.x + deltaX,
                        y: currentSpouseNode.position.y + deltaY
                      }
                    };
                  }
                }
                return n;
              }));
              // Update initial for next increment
              setDraggingNodeInitialPos(node.position);
            }
          }
        }}
        onNodeDragStop={() => {
          setDraggingNodeId(null);
          setDraggingNodeInitialPos(null);
        }}
        >
          <Controls className="bg-white shadow-lg border border-slate-200" />
          <Background color="#e2e8f0" gap={30} size={2} />
        </ReactFlow>
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

            {/* Email Toggle */}
            <div>
              <Label className="text-sm font-medium">Does this person have an email?</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="hasEmail"
                    checked={newMember.hasEmail}
                    onChange={() => setNewMember({ ...newMember, hasEmail: true, userId: '', password: '' })}
                    className="mr-2"
                  />
                  Yes, has email
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="hasEmail"
                    checked={!newMember.hasEmail}
                    onChange={() => setNewMember({ ...newMember, hasEmail: false, email: '' })}
                    className="mr-2"
                  />
                  No email
                </label>
              </div>
            </div>

            {/* Email Field (if has email) */}
            {newMember.hasEmail && (
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
            )}

            {/* UserId and Password Fields (if no email) */}
            {!newMember.hasEmail && (
              <>
                <div>
                  <Label htmlFor="userId" className="text-sm font-medium">User ID *</Label>
                  <Input
                    id="userId"
                    value={newMember.userId}
                    onChange={(e) => setNewMember({ ...newMember, userId: e.target.value })}
                    placeholder="Create a unique user ID"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-medium">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newMember.password}
                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                    placeholder="Create a password"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={newMember.confirmPassword}
                    onChange={(e) => setNewMember({ ...newMember, confirmPassword: e.target.value })}
                    placeholder="Confirm password"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* Alive/Dead Status */}
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isAlive"
                    checked={newMember.isAlive}
                    onChange={() => setNewMember({ ...newMember, isAlive: true, dateOfDeath: '' })}
                    className="mr-2"
                  />
                  Alive
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isAlive"
                    checked={!newMember.isAlive}
                    onChange={() => setNewMember({ ...newMember, isAlive: false })}
                    className="mr-2"
                  />
                  Deceased
                </label>
              </div>
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

            {/* Birth Date */}
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

            {/* Death Date (if deceased) */}
            {!newMember.isAlive && (
              <div>
                <Label htmlFor="dateOfDeath" className="text-sm font-medium">Date of Death</Label>
                <Input
                  id="dateOfDeath"
                  type="date"
                  value={newMember.dateOfDeath}
                  onChange={(e) => setNewMember({ ...newMember, dateOfDeath: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}


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
                disabled={!newMember.name || !newMember.relationship || !newMember.gender || 
                  (newMember.hasEmail && !newMember.email) || 
                  (!newMember.hasEmail && (!newMember.userId || !newMember.password || !newMember.confirmPassword))}
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
              Add Relation to {selectedNode?.data?.name}
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