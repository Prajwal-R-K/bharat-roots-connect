import React, { useState, useEffect } from 'react';
import { User, Calendar, MessageSquare, Users, Settings, Home, Plus, Download, Mail, LogOut, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getFamilyMembers } from '@/lib/neo4j';
import { User as UserType } from '@/types';
import FamilyTreeVisualization from './FamilyTreeVisualization1';

interface DashboardProps {
  user: UserType;
}

const Dashboard: React.FC<DashboardProps> = ({ user: initialUser }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType>(initialUser);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  
  // State for profile modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDetails, setProfileDetails] = useState<UserType | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<UserType | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch user details when modal opens
  useEffect(() => {
    if (profileOpen) {
      setProfileDetails(user);
      setEditData(user);
    }
  }, [profileOpen, user]);

  // Handle profile edit
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editData) return;
    const { name, value } = e.target;
    setEditData({ ...editData, [name]: value });
  };

  const handleSaveProfile = async () => {
    if (!editData) return;
    try {
      // Prepare update data with all fields
      const updateData: any = {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        gender: editData.gender,
      };

      // Only include password if it's been changed (not empty)
      if (editData.password && editData.password.trim() !== '') {
        updateData.password = editData.password;
      }

      // Update user profile in Neo4j backend
      await updateUserProfile(editData.userId, updateData);
      
      // Update local state with the new data
      const updatedUser = { ...editData };
      setUser(updatedUser);
      setProfileDetails(updatedUser);
      setEditMode(false);
      
      toast({ 
        title: 'Profile updated successfully!',
        description: 'Your profile information has been saved to the database.',
      });
    } catch (err) {
      console.error('Profile update error:', err);
      toast({ 
        title: 'Error updating profile', 
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  useEffect(() => {
    const loadFamilyMembers = async () => {
      try {
        const members = await getFamilyMembers(user.familyTreeId);
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error loading family members:', error);
      }
    };

    if (user.familyTreeId) {
      loadFamilyMembers();
    }
  }, [user.familyTreeId]);

  const activeMembers = familyMembers.filter(m => m.status === 'active');
  const pendingInvites = familyMembers.filter(m => m.status === 'invited');
  const treeCreatedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

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
      {/* Profile Section */}
      <div className="flex flex-col items-center justify-center gap-4 mt-6">
        <div className="relative">
          <Avatar className="h-28 w-28 ring-4 ring-indigo-300 shadow-xl cursor-pointer rounded-full border-4 border-white hover:ring-purple-400 transition-all"
            onClick={() => setProfileOpen(true)}>
            <AvatarImage src={user.profilePicture} />
            <AvatarFallback className="bg-indigo-500 text-white text-4xl">{user.name?.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="font-bold text-indigo-700 text-2xl">{user.name}</div>
        <div className="text-xs text-gray-500 font-mono">ID: {user.familyTreeId}</div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="mt-2 text-red-500 flex items-center gap-1 hover:bg-red-50"
          onClick={() => {
            localStorage.removeItem('userData');
            navigate('/');
          }}
        >
          <LogOut className="w-4 h-4" /> Logout
        </Button>
      </div>

      {/* Main Content */}
        {/* Family Tree Visualization */}
        <div className="space-y-8">
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
                {familyMembers.length > 0 ? (
                  <FamilyTreeVisualization 
                    user={user} 
                    familyMembers={familyMembers}
                    viewMode="all"
                    minHeight="600px"
                    showControls={true}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-50 text-gray-600">
                    <Users className="w-16 h-16 mb-4 text-indigo-400" />
                    <h3 className="text-xl font-semibold mb-2">No Family Members Yet</h3>
                    <p className="text-sm text-center px-4">Start building your family tree by inviting members</p>
                    <Button 
                      className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => navigate('/family-tree-builder')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Member
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
      </div>

      {/* Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
            <button className="absolute top-4 right-4 text-gray-500 hover:text-red-500" onClick={() => { setProfileOpen(false); setEditMode(false); }}>
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-20 w-20 ring-2 ring-indigo-300">
                <AvatarImage src={profileDetails?.profilePicture} />
                <AvatarFallback className="bg-indigo-500 text-white text-3xl">{profileDetails?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              {!editMode ? (
                <>
                  <div className="font-bold text-xl text-indigo-700">{profileDetails?.name}</div>
                  <div className="text-sm text-gray-500">Email: {profileDetails?.email}</div>
                  <div className="text-sm text-gray-500">Phone: {profileDetails?.phone || 'Not provided'}</div>
                  <div className="text-sm text-gray-500">Gender: {profileDetails?.gender || 'Not specified'}</div>
                  <div className="text-sm text-gray-500">Family Tree ID: {profileDetails?.familyTreeId}</div>
                  <div className="text-sm text-gray-500">Password: ••••••••</div>
                  <Button className="mt-4" onClick={() => setEditMode(true)}>Edit Profile</Button>
                </>
              ) : (
                <div className="w-full space-y-3">
                  <input 
                    type="text" 
                    name="name" 
                    value={editData?.name || ''} 
                    onChange={handleEditChange} 
                    className="border rounded px-3 py-2 w-full" 
                    placeholder="Full Name" 
                  />
                  <input 
                    type="email" 
                    name="email" 
                    value={editData?.email || ''} 
                    onChange={handleEditChange} 
                    className="border rounded px-3 py-2 w-full" 
                    placeholder="Email Address" 
                  />
                  <input 
                    type="tel" 
                    name="phone" 
                    value={editData?.phone || ''} 
                    onChange={handleEditChange} 
                    className="border rounded px-3 py-2 w-full" 
                    placeholder="Phone Number" 
                  />
                  <select 
                    name="gender" 
                    value={editData?.gender || ''} 
                    onChange={(e) => setEditData(prev => prev ? {...prev, gender: e.target.value} : null)}
                    className="border rounded px-3 py-2 w-full"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <input 
                    type="password" 
                    name="password" 
                    value={editData?.password || ''} 
                    onChange={handleEditChange} 
                    className="border rounded px-3 py-2 w-full" 
                    placeholder="New Password (leave blank to keep current)" 
                  />
                  <input 
                    type="text" 
                    name="familyTreeId" 
                    value={editData?.familyTreeId || ''} 
                    className="border rounded px-3 py-2 w-full bg-gray-100" 
                    placeholder="Family Tree ID" 
                    disabled
                  />
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1" onClick={handleSaveProfile}>Save Changes</Button>
                    <Button variant="ghost" className="flex-1" onClick={() => setEditMode(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
