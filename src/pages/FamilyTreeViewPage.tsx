import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import FamilyTreeVisualization from '@/components/FamilyTreeVisualization1';
import FamilyTreeMetaGraph from '@/components/FamilyTreeMetaGraph';
import RelationshipAnalyzer from '@/components/RelationshipAnalyzer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { User } from '@/types';
import { getFamilyMembers, getTraversableFamilyTreeData, getUserPersonalFamilyView, getConnectedFamilyTrees, getFamilyTreeMetaGraph } from '@/lib/neo4j';

type UIMember = {
  userId: string;
  name: string;
  email?: string;
  status?: string;
  profilePicture?: string;
  relationship?: string;
  gender?: string;
};

type GraphLink = {
  source: string;
  target: string;
  type: 'PARENTS_OF' | 'SIBLING' | 'MARRIED_TO';
  sourceName?: string;
  targetName?: string;
};

const FamilyTreeViewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<UIMember[]>([]);
  const [treeData, setTreeData] = useState<{ nodes: UIMember[], links: GraphLink[] }>({ nodes: [], links: [] });
  const [viewType, setViewType] = useState<"personal" | "all" | "hyper">("all");
  const [connectedTrees, setConnectedTrees] = useState<any[]>([]);
  const [metaGraphData, setMetaGraphData] = useState<{ trees: any[], connections: any[] }>({ trees: [], connections: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    } else {
      navigate('/auth');
    }
  }, [navigate]);


  const fetchFamilyData = useCallback(async () => {
    setIsLoading(true);
    try {
      let members: UIMember[] = [];
      let visualizationData: { nodes: UIMember[], links: GraphLink[] } = { nodes: [], links: [] };
      let connections: any[] = [];

      if (viewType === "personal") {
        members = await getUserPersonalFamilyView(currentUser!.userId, currentUser!.familyTreeId);
        visualizationData = { nodes: members, links: [] };
      } else if (viewType === "hyper") {
        const metaGraph = await getFamilyTreeMetaGraph(currentUser!.familyTreeId);
        console.log('Meta-graph data:', metaGraph);
        setMetaGraphData(metaGraph);
        // Set empty visualization data for meta-graph mode
        members = [];
        visualizationData = { nodes: [], links: [] };
      } else {
        members = await getFamilyMembers(currentUser!.familyTreeId);
        const single = await getTraversableFamilyTreeData(currentUser!.familyTreeId);
        visualizationData = { nodes: (single.nodes as UIMember[]), links: (single.links as GraphLink[]) };
      }

      setFamilyMembers(members);
      setTreeData(visualizationData);
      setConnectedTrees(connections);
    } catch (error) {
      console.error("Error fetching family data:", error);
      toast({
        title: "Error",
        description: "Failed to load family data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, viewType]);

  useEffect(() => {
    if (currentUser) {
      fetchFamilyData();
    }
  }, [currentUser, viewType, fetchFamilyData]);

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="flex items-center gap-2 border-isn-primary/30 hover:bg-isn-primary/5 hover:border-isn-primary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-isn-primary mb-4">Family Tree</h1>
          
          {currentUser && (
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {currentUser.name}'s Family Tree
                </h2>
                <Badge variant="outline" className="mb-4">
                  Family Tree ID: {currentUser.familyTreeId}
                </Badge>
              </div>
              
              <div className="flex gap-4 items-center">
                <Select value={viewType} onValueChange={(value: "personal" | "all" | "hyper") => setViewType(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="personal">My View</SelectItem>
                    <SelectItem value="hyper">Connected Trees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading family tree...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {viewType === "hyper" && connectedTrees.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Connected Family Trees</CardTitle>
                  <CardDescription>
                    Relationships with members from other family trees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {connectedTrees.map((connection, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{connection.sourceName}</span>
                          <span className="text-muted-foreground mx-2">is {connection.type} of</span>
                          <span className="font-medium">{connection.targetName}</span>
                        </div>
                        <Badge variant="secondary">{connection.targetFamilyTreeId}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>
                  {viewType === "personal" ? "My Family Relationships" : 
                   viewType === "all" ? "Complete Family Tree" : 
                   "Connected Trees View"}
                </CardTitle>
                <CardDescription>
                  {viewType === "personal" ? "Your personal view of family relationships" : 
                   viewType === "all" ? "All members and relationships in your family tree" : 
                   "High-level view of interconnected family trees"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`${viewType === "hyper" ? "h-[700px]" : "h-96"} border rounded-lg`}>
                  {currentUser && viewType === "hyper" ? (
                    <FamilyTreeMetaGraph
                      currentUser={currentUser}
                      trees={metaGraphData.trees}
                      connections={metaGraphData.connections}
                      minHeight="700px"
                    />
                  ) : currentUser && (
                    <FamilyTreeVisualization 
                      user={currentUser} 
                      familyMembers={familyMembers}
                      viewMode={viewType}
                      minHeight="400px"
                      showControls={true}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Relationship Analyzer Component */}
            {currentUser && familyMembers.length > 1 && (
              <RelationshipAnalyzer 
                familyId={currentUser.familyTreeId} 
                currentUserId={currentUser.userId} 
              />
            )}

            {familyMembers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Family Members ({familyMembers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {familyMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-isn-light rounded-full flex items-center justify-center">
                            {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="font-medium">{member.name || 'Pending'}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.relationship && (
                            <Badge variant="outline">{member.relationship}</Badge>
                          )}
                          <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                            {member.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FamilyTreeViewPage;