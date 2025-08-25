import * as React from 'react';
import { User, Calendar, MessageSquare, Users, Settings, Home, Plus, Download, Mail, LogOut, X, CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getFamilyMembers, getUserByEmailOrId } from '@/lib/neo4j';
import { User as UserType } from '@/types';
import FamilyTreeVisualization from './FamilyTreeVisualization1';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardProps {
  user: UserType;
  onUserUpdate: (updatedUser: UserType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user: initialUser, onUserUpdate }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = React.useState<UserType>(initialUser);
  const [familyMembers, setFamilyMembers] = React.useState<any[]>([]);
  
  // State for profile modal
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [profileDetails, setProfileDetails] = React.useState<UserType | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  const [editData, setEditData] = React.useState<UserType | null>(null);

  // Update user state when initialUser prop changes
  React.useEffect(() => {
    console.log('Dashboard: Initial user prop changed:', initialUser);
    setUser(initialUser);
  }, [initialUser]);

  // Fetch user details when modal opens
  React.useEffect(() => {
    if (profileOpen) {
      console.log('Profile modal opened, setting profile details:', user);
      setProfileDetails(user);
      setEditData({ ...user }); // Create a copy to avoid reference issues
    }
  }, [profileOpen, user]);

  // Handle profile edit
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editData) return;
    const { name, value } = e.target;
    setEditData({ ...editData, [name]: value });
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSaveProfile = async () => {
    if (!editData) return;
    
    // Show loading state
    const loadingToast = toast({
      title: 'Updating profile...',
      description: 'Please wait while we save your changes.',
    });

    try {
      // Prepare update data with all fields
      const updateData: any = {
        name: editData.name || '',
        phone: editData.phone || '', // Ensure phone is always a string, even if empty
        address: editData.address || '',
        dateOfBirth: editData.dateOfBirth || '',
        married: editData.married || '',
      };

      // Debug logging
      console.log('=== PROFILE UPDATE DEBUG ===');
      console.log('User ID:', editData.userId);
      console.log('Update data being sent:', updateData);
      console.log('Phone number being saved:', updateData.phone);

      // Only include password if it's been changed (not empty)
      if (editData.password && editData.password.trim() !== '') {
        updateData.password = editData.password;
        console.log('Password update included');
      }

      // Update user profile in Neo4j backend
      console.log('Calling updateUserProfile...');
      await updateUserProfile(editData.userId, updateData);
      console.log('updateUserProfile completed successfully');
      
      // Small delay to ensure database commit
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch fresh user data from the database to ensure UI consistency
      console.log('Fetching fresh user data for ID:', editData.userId);
      const freshUserData = await getUserByEmailOrId(editData.userId);
      console.log('Fetched fresh data:', freshUserData);

      if (freshUserData) {
        // Update component state with the absolute latest data
        setUser(freshUserData);
        setProfileDetails(freshUserData);
        
        // CRITICAL: Pass the fresh data up to the parent component (DashboardPage)
        onUserUpdate(freshUserData);
        console.log('onUserUpdate called with fresh data.');

        // Dismiss loading toast and show success
        loadingToast.dismiss();
        toast({
          title: 'Profile Updated!',
          description: 'Your changes have been saved successfully.',
        });
      } else {
        // This case is unlikely but good to handle
        throw new Error('Could not retrieve updated user data from the database.');
      }
      
      setEditMode(false);

    } catch (err) {
      console.error('=== PROFILE UPDATE FAILED ===', err);
      // Dismiss loading toast and show error
      loadingToast.dismiss();
      toast({ 
        title: 'Error Updating Profile', 
        description: 'Failed to save your changes. Please check the console and try again.',
        variant: 'destructive' 
      });
    }
  };

  React.useEffect(() => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Navbar */}
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-indigo-600">Bharat Roots</h1>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                  onClick={() => navigate('/family-tree')}
                >
                  <Users className="w-4 h-4" />
                  Family
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                  onClick={() => navigate('/events')}
                >
                  <Calendar className="w-4 h-4" />
                  Events
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                  onClick={() => navigate('/chat')}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                  onClick={() => navigate('/posts')}
                >
                  <Mail className="w-4 h-4" />
                  Posts
                </Button>
              </div>
            </div>

            {/* Profile Section in Navbar */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500">ID: {user.familyTreeId}</div>
              </div>
              <div className="relative">
                <Avatar 
                  className="h-10 w-10 ring-2 ring-indigo-300 shadow cursor-pointer hover:ring-indigo-400 transition-all"
                  onClick={() => setProfileOpen(true)}
                >
                  <AvatarImage src={user.profilePicture} />
                  <AvatarFallback className="bg-indigo-500 text-white text-sm">{user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-500 hover:bg-red-50 flex items-center gap-1"
                onClick={() => {
                  localStorage.removeItem('userData');
                  navigate('/');
                }}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Family Tree Visualization */}
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

        {/* Recent Activity - REMOVED */}
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
                  <div className="text-sm text-gray-500">Date of Birth: {profileDetails?.dateOfBirth ? format(new Date(profileDetails.dateOfBirth), 'PPP') : 'Not provided'}</div>
                  {profileDetails?.dateOfBirth && (
                    <div className="text-sm text-gray-500">Age: {calculateAge(profileDetails.dateOfBirth)} years</div>
                  )}
                  <div className="text-sm text-gray-500">Married: {profileDetails?.married || 'Not specified'}</div>
                  <div className="text-sm text-gray-500">Address: {profileDetails?.address || 'Not provided'}</div>
                  <div className="text-sm text-gray-500">Family Tree ID: {profileDetails?.familyTreeId}</div>
                  <div className="text-sm text-gray-500">Password: ••••••••</div>
                  <Button className="mt-4" onClick={() => setEditMode(true)}>Edit Profile</Button>
                </>
              ) : (
                <div className="w-full space-y-4 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name"
                      name="name" 
                      value={editData?.name || ''} 
                      onChange={handleEditChange} 
                      placeholder="Full Name" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address (Read-only)</Label>
                    <Input 
                      id="email"
                      name="email" 
                      value={editData?.email || ''} 
                      className="bg-gray-100"
                      disabled
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender (Read-only)</Label>
                    <Select value={editData?.gender || ''} disabled>
                      <SelectTrigger className="bg-gray-100">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone"
                      name="phone" 
                      type="tel"
                      value={editData?.phone || ''} 
                      onChange={handleEditChange} 
                      placeholder="Phone Number" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !editData?.dateOfBirth && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editData?.dateOfBirth ? format(new Date(editData.dateOfBirth), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={editData?.dateOfBirth ? new Date(editData.dateOfBirth) : undefined}
                          onSelect={(date) => setEditData(prev => prev ? {...prev, dateOfBirth: date?.toISOString().split('T')[0] || ''} : null)}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {editData?.dateOfBirth && (
                      <p className="text-sm text-gray-500">Age: {calculateAge(editData.dateOfBirth)} years</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="married">Marital Status</Label>
                    <Select 
                      value={editData?.married || ''} 
                      onValueChange={(value) => setEditData(prev => prev ? {...prev, married: value} : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Marital Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input 
                      id="address"
                      name="address" 
                      value={editData?.address || ''} 
                      onChange={handleEditChange} 
                      placeholder="Your Address" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password (optional)</Label>
                    <Input 
                      id="password"
                      name="password" 
                      type="password"
                      value={editData?.password || ''} 
                      onChange={handleEditChange} 
                      placeholder="Leave blank to keep current password" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="familyTreeId">Family Tree ID (Read-only)</Label>
                    <Input 
                      id="familyTreeId"
                      name="familyTreeId" 
                      value={editData?.familyTreeId || ''} 
                      className="bg-gray-100"
                      disabled
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
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
