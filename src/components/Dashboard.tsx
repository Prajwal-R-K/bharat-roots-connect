import React, { useState, useEffect } from 'react';
import { User, Calendar, MessageSquare, Users, Settings, Home, Plus, Download, Mail, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getFamilyMembers, getTraversableFamilyTreeData } from '@/lib/neo4j';
import { User as UserType } from '@/types';
import FamilyTreeVisualization from './FamilyTreeVisualization';

interface DashboardProps {
  user: UserType;
}

const Dashboard: React.FC<DashboardProps> = ({ user: initialUser }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<UserType>(initialUser);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [completeTreeData, setCompleteTreeData] = useState<any>(null);

  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        // Fetch both family members and complete tree data for visualization
        const [members, treeData] = await Promise.all([
          getFamilyMembers(user.familyTreeId),
          getTraversableFamilyTreeData(user.familyTreeId, 5)
        ]);
        setFamilyMembers(members);
        setCompleteTreeData(treeData);
      } catch (error) {
        console.error('Error loading family data:', error);
      }
    };

    if (user.familyTreeId) {
      loadFamilyData();
    }
  }, [user.familyTreeId]);

  const activeMembers = familyMembers.filter(m => m.status === 'active');
  const pendingInvites = familyMembers.filter(m => m.status === 'invited');
  const currentDate = new Date().toLocaleDateString();

  const myRelations = familyMembers
    .filter(member => member.relationship && member.email !== user.email)
    .slice(0, 5); // Show top 5 relations

  const recentActivities = [
    { id: 1, type: 'member_joined', description: 'John Smith joined the family tree', time: '2 hours ago' },
    { id: 2, type: 'relationship_added', description: 'Added relationship: Father-Son', time: '1 day ago' },
    { id: 3, type: 'profile_updated', description: 'Updated profile information', time: '3 days ago' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'member_joined': return <Users className="w-4 h-4 text-indigo-500" />;
      case 'relationship_added': return <User className="w-4 h-4 text-green-500" />;
      case 'profile_updated': return <Settings className="w-4 h-4 text-yellow-500" />;
      default: return <Home className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-2 sm:px-4 md:px-8 py-6">
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-indigo-200 via-blue-100 to-white rounded-2xl p-8 shadow-lg border border-indigo-100 relative">
        <div>
          <h1 className="text-4xl font-extrabold text-indigo-800 mb-2 tracking-tight drop-shadow">Family Dashboard</h1>
          <p className="text-gray-700 text-lg font-medium">Manage your family tree and relationships</p>
        </div>
        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20 ring-4 ring-indigo-300 shadow-xl">
            <AvatarImage src={user.profilePicture} />
            <AvatarFallback className="bg-indigo-500 text-white text-3xl">{user.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <div className="font-bold text-indigo-700 text-lg">{user.name}</div>
            <div className="text-xs text-gray-500 font-mono">ID: {user.familyTreeId}</div>
            <Button variant="ghost" size="sm" className="mt-2 text-red-500 flex items-center gap-1 hover:bg-red-50">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Left Column - Family Tree Visualization */}
        <div className="xl:col-span-3 space-y-8">
          <Card className="shadow-2xl border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                <Home className="w-8 h-8" />
                Interactive Family Tree
              </CardTitle>
              <p className="text-indigo-100 text-sm">Explore your family connections • Click on relationships to learn more</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] w-full rounded-b-lg overflow-hidden">
                {completeTreeData && completeTreeData.nodes.length > 0 ? (
                  <FamilyTreeVisualization 
                    user={user} 
                    familyMembers={completeTreeData.nodes.map((node: any) => ({
                      userId: node.id,
                      name: node.name,
                      email: node.email || '',
                      status: node.status,
                      relationship: node.myRelationship,
                      createdBy: node.createdBy,
                      profilePicture: node.profilePicture,
                      gender: node.gender
                    }))}
                    relationships={completeTreeData.links.map((link: any) => ({
                      source: link.source,
                      target: link.target,
                      type: link.type,
                      sourceName: completeTreeData.nodes.find((n: any) => n.id === link.source)?.name || 'Unknown',
                      targetName: completeTreeData.nodes.find((n: any) => n.id === link.target)?.name || 'Unknown'
                    }))}
                    viewMode="all"
                    minHeight="600px"
                    showControls={true}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-50 text-gray-600">
                    <Users className="w-16 h-16 mb-4 text-indigo-400" />
                    <h3 className="text-xl font-semibold mb-2">No Family Members Yet</h3>
                    <p className="text-sm text-center px-4">Start building your family tree by inviting members</p>
                    <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Member
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-100 hover:shadow-xl transition-all cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-green-800 text-lg mb-2">Add Member</h3>
                <p className="text-green-600 text-sm">Invite new family members to join your tree</p>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-cyan-100 hover:shadow-xl transition-all cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Download className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-blue-800 text-lg mb-2">Export Tree</h3>
                <p className="text-blue-600 text-sm">Download your family tree as PDF or image</p>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-violet-100 hover:shadow-xl transition-all cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-purple-800 text-lg mb-2">Manage Tree</h3>
                <p className="text-purple-600 text-sm">Edit relationships and family details</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader>
              <CardTitle className="text-indigo-700 text-xl font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-100 rounded-full shadow">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-medium text-gray-800">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats and Info Cards */}
        <div className="xl:col-span-1 space-y-6">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 gap-4">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-80" />
                <div className="text-3xl font-bold mb-1">{familyMembers.length}</div>
                <p className="text-indigo-100 text-sm">Total Members</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <CardContent className="p-6 text-center">
                <User className="w-12 h-12 mx-auto mb-3 opacity-80" />
                <div className="text-3xl font-bold mb-1">{activeMembers.length}</div>
                <p className="text-green-100 text-sm">Active Members</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-500 to-red-600 text-white">
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-80" />
                <div className="text-3xl font-bold mb-1">{pendingInvites.length}</div>
                <p className="text-orange-100 text-sm">Pending Invites</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-80" />
                <div className="text-lg font-semibold mb-1">{currentDate}</div>
                <p className="text-blue-100 text-sm">Tree Created</p>
              </CardContent>
            </Card>
          </div>

          {/* My Relations */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="text-lg font-semibold">My Relations</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {myRelations.length > 0 ? (
                  myRelations.map((relation) => (
                    <div key={relation.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-indigo-200">
                          <AvatarImage src={relation.profilePicture} />
                          <AvatarFallback className="bg-indigo-500 text-white text-xs">{relation.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm text-gray-800">{relation.name}</div>
                          <div className="text-xs text-gray-500">{relation.email}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700">
                        {relation.relationship || 'Family'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No relationships yet</p>
                    <Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-3 h-3 mr-1" />
                      Add Relation
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
