import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserType } from '@/types';
import { getFamilyMembers, getTraversableFamilyTreeData } from '@/lib/neo4j';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TreePine, Users, ArrowLeft, Search, Zap } from 'lucide-react';
import FamilyTreeVisualization from '@/components/FamilyTreeVisualization';

const FamilyTreeViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<UserType | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<any>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [relationshipAnalysis, setRelationshipAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      navigate('/auth');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadFamilyData(parsedUser);
  }, [navigate]);

  const loadFamilyData = async (currentUser: UserType) => {
    try {
      setIsLoading(true);
      const [members, treeResponse] = await Promise.all([
        getFamilyMembers(currentUser.familyTreeId),
        getTraversableFamilyTreeData(currentUser.familyTreeId)
      ]);
      
      setFamilyMembers(members);
      setTreeData(treeResponse);
    } catch (error) {
      console.error('Error loading family data:', error);
      toast({
        title: "Error",
        description: "Failed to load family tree data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeRelationship = (node1: string, node2: string) => {
    if (!familyMembers.length || !treeData?.relationships) return '';

    const member1 = familyMembers.find(m => m.userId === node1 || m.email === node1);
    const member2 = familyMembers.find(m => m.userId === node2 || m.email === node2);
    
    if (!member1 || !member2) return 'Unable to find selected members';

    // Find direct relationship
    const directRelation = treeData.relationships.find((rel: any) => 
      (rel.from === node1 && rel.to === node2) || (rel.from === node2 && rel.to === node1)
    );

    if (directRelation) {
      return `Direct relationship: ${member1.name} is ${directRelation.type} of ${member2.name}`;
    }

    // Find path through relationships using BFS
    const findRelationshipPath = (start: string, end: string) => {
      const visited = new Set();
      const queue = [[start]];
      
      while (queue.length > 0) {
        const path = queue.shift()!;
        const current = path[path.length - 1];
        
        if (current === end && path.length > 1) {
          return path;
        }
        
        if (visited.has(current) || path.length > 4) continue; // Limit search depth
        visited.add(current);
        
        const connections = treeData.relationships.filter((rel: any) => 
          rel.from === current || rel.to === current
        );
        
        for (const conn of connections) {
          const next = conn.from === current ? conn.to : conn.from;
          if (!visited.has(next)) {
            queue.push([...path, next]);
          }
        }
      }
      return null;
    };

    const path = findRelationshipPath(node1, node2);
    if (path && path.length > 2) {
      return `Indirect relationship: ${member1.name} and ${member2.name} are connected through ${path.length - 2} intermediate family member(s)`;
    }

    return `No direct family relationship found between ${member1.name} and ${member2.name}`;
  };

  const handleNodeSelection = (nodeId: string) => {
    setSelectedNodes(prev => {
      const newSelection = prev.includes(nodeId) 
        ? prev.filter(id => id !== nodeId)
        : prev.length < 2 ? [...prev, nodeId] : [prev[1], nodeId];
      
      if (newSelection.length === 2) {
        const analysis = analyzeRelationship(newSelection[0], newSelection[1]);
        setRelationshipAnalysis(analysis);
      } else {
        setRelationshipAnalysis('');
      }
      
      return newSelection;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <TreePine className="w-16 h-16 mx-auto text-indigo-500 animate-pulse mb-4" />
          <p className="text-indigo-600 font-medium">Loading family tree...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-indigo-800 flex items-center gap-3">
              <TreePine className="w-8 h-8" />
              Family Tree View
            </h1>
          </div>
          <Badge variant="secondary" className="text-sm">
            <Users className="w-4 h-4 mr-2" />
            {familyMembers.length} Members
          </Badge>
        </div>

        {/* Relationship Analysis Panel */}
        {selectedNodes.length > 0 && (
          <Card className="border-indigo-200 bg-indigo-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-indigo-800 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Relationship Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selectedNodes.map((nodeId, index) => {
                    const member = familyMembers.find(m => m.userId === nodeId || m.email === nodeId);
                    return (
                      <Badge key={nodeId} variant="outline" className="bg-white">
                        {member?.name || nodeId} {index === 0 ? '(Node 1)' : '(Node 2)'}
                      </Badge>
                    );
                  })}
                </div>
                {relationshipAnalysis && (
                  <div className="p-3 bg-white rounded-lg border border-indigo-200">
                    <p className="text-indigo-700 font-medium">{relationshipAnalysis}</p>
                  </div>
                )}
                {selectedNodes.length < 2 && (
                  <p className="text-indigo-600 text-sm">
                    Select {2 - selectedNodes.length} more node{selectedNodes.length === 1 ? '' : 's'} to analyze relationship
                  </p>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedNodes([]);
                    setRelationshipAnalysis('');
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Family Tree Visualization */}
        <Card className="shadow-2xl border-0">
          <CardContent className="p-0">
            <div className="h-[700px] w-full rounded-lg overflow-hidden">
              {familyMembers.length > 0 ? (
                <FamilyTreeVisualization 
                  user={user!} 
                  familyMembers={familyMembers}
                  viewMode="all"
                  minHeight="700px"
                  showControls={true}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                  <TreePine className="w-16 h-16 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Family Tree Data</h3>
                  <p className="text-center">Start building your family tree by adding members</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Family Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-indigo-800">Family Members ({familyMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {familyMembers.map((member) => (
                <div 
                  key={member.userId} 
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedNodes.includes(member.userId) || selectedNodes.includes(member.email)
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                  onClick={() => handleNodeSelection(member.userId || member.email)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                      {member.relationship && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {member.relationship}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FamilyTreeViewPage;