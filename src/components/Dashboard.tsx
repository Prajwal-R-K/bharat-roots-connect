import * as React from 'react';
import { User, Calendar, MessageSquare, Users, Settings, Home, Plus, Download, Mail, LogOut, X, CalendarIcon, UserPlus } from 'lucide-react';
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
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Parivaar Bhandan
                </h1>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-1">
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200"
                  onClick={() => navigate('/family-tree')}
                >
                  <Users className="w-4 h-4" />
                  Family Tree
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200"
                  onClick={() => navigate('/events')}
                >
                  <Calendar className="w-4 h-4" />
                  Events
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200"
                  onClick={() => navigate('/posts')}
                >
                  <Mail className="w-4 h-4" />
                  Posts
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200"
                  onClick={() => navigate('/chat')}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </Button>
              </div>
            </div>

            {/* Profile Section in Navbar */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500 font-medium">Family ID: {user.familyTreeId}</div>
              </div>
              <div className="relative">
                <Avatar 
                  className="h-10 w-10 ring-2 ring-indigo-300 shadow-lg cursor-pointer hover:ring-indigo-400 transition-all duration-200 hover:shadow-xl"
                  onClick={() => setProfileOpen(true)}
                >
                  <AvatarImage src={user.profilePicture} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold">
                    {user.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-500 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200"
                onClick={() => {
                  localStorage.removeItem('userData');
                  localStorage.removeItem('userId');
                  navigate('/');
                }}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Logout</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        <div className="md:hidden bg-gray-50 border-t border-gray-200">
          <div className="px-4 py-3 space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
              onClick={() => navigate('/family-tree')}
            >
              <Users className="w-4 h-4 mr-3" />
              Family Tree
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
              onClick={() => navigate('/events')}
            >
              <Calendar className="w-4 h-4 mr-3" />
              Events
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
              onClick={() => navigate('/posts')}
            >
              <Mail className="w-4 h-4 mr-3" />
              Posts
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
              onClick={() => navigate('/chat')}
            >
              <MessageSquare className="w-4 h-4 mr-3" />
              Chat
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg mr-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">Family Members</p>
                <p className="text-2xl font-bold text-blue-800">{activeMembers.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-500 rounded-lg mr-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-600">Pending Invites</p>
                <p className="text-2xl font-bold text-green-800">{pendingInvites.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-lg mr-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-600">Tree Created</p>
                <p className="text-sm font-bold text-purple-800">{treeCreatedDate}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-500 rounded-lg mr-4">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-600">Your Role</p>
                <p className="text-sm font-bold text-orange-800">Family Admin</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-gray-50 to-gray-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Plus className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                className="h-20 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                onClick={() => navigate('/add-member')}
              >
                <div className="flex flex-col items-center gap-2">
                  <UserPlus className="w-6 h-6" />
                  <span>Add Family Member</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 border-2 border-indigo-200 hover:bg-indigo-50"
                onClick={() => navigate('/invite')}
              >
                <div className="flex flex-col items-center gap-2">
                  <Mail className="w-6 h-6 text-indigo-600" />
                  <span>Invite Members</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 border-2 border-green-200 hover:bg-green-50"
                onClick={() => navigate('/events')}
              >
                <div className="flex flex-col items-center gap-2">
                  <Calendar className="w-6 h-6 text-green-600" />
                  <span>Create Event</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

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
      </div>

      {/* Enhanced Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white relative">
              <button 
                className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors" 
                onClick={() => { 
                  setProfileOpen(false); 
                  setEditMode(false); 
                }}
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-4 ring-white/30 shadow-lg">
                  <AvatarImage src={profileDetails?.profilePicture} />
                  <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                    {profileDetails?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{profileDetails?.name}</h2>
                  <p className="text-indigo-100">{profileDetails?.email}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
              {!editMode ? (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                        <p className="text-gray-900 font-medium">{profileDetails?.name || 'Not provided'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <Label className="text-sm font-medium text-gray-600">Email Address</Label>
                        <p className="text-gray-900 font-medium">{profileDetails?.email}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <Label className="text-sm font-medium text-gray-600">Phone Number</Label>
                        <p className="text-gray-900 font-medium">{profileDetails?.phone || 'Not provided'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <Label className="text-sm font-medium text-gray-600">Gender</Label>
                        <p className="text-gray-900 font-medium capitalize">{profileDetails?.gender || 'Not specified'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <Label className="text-sm font-medium text-gray-600">Date of Birth</Label>
                        <p className="text-gray-900 font-medium">
                          {profileDetails?.dateOfBirth ? format(new Date(profileDetails.dateOfBirth), 'PPP') : 'Not provided'}
                        </p>
                        {profileDetails?.dateOfBirth && (
                          <p className="text-sm text-indigo-600 mt-1">Age: {calculateAge(profileDetails.dateOfBirth)} years</p>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <Label className="text-sm font-medium text-gray-600">Marital Status</Label>
                        <p className="text-gray-900 font-medium capitalize">{profileDetails?.married || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-indigo-600" />
                      Contact Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <Label className="text-sm font-medium text-gray-600">Address</Label>
                      <p className="text-gray-900 font-medium">{profileDetails?.address || 'Not provided'}</p>
                    </div>
                  </div>

                  {/* Family Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Family Information
                    </h3>
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                      <Label className="text-sm font-medium text-indigo-700">Family Tree ID</Label>
                      <p className="text-indigo-900 font-bold text-lg">{profileDetails?.familyTreeId}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button 
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3"
                      onClick={() => setEditMode(true)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="outline"
                      className="px-6 border-gray-300 hover:bg-gray-50"
                      onClick={() => setProfileOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-600" />
                    Edit Profile Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name *</Label>
                      <Input 
                        id="name"
                        name="name" 
                        value={editData?.name || ''} 
                        onChange={handleEditChange} 
                        placeholder="Enter your full name"
                        className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                      <Input 
                        id="email"
                        name="email" 
                        value={editData?.email || ''} 
                        className="bg-gray-100 border-gray-300"
                        disabled
                      />
                      <p className="text-xs text-gray-500">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                      <Input 
                        id="phone"
                        name="phone" 
                        type="tel"
                        value={editData?.phone || ''} 
                        onChange={handleEditChange} 
                        placeholder="Enter your phone number"
                        className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-sm font-medium text-gray-700">Gender</Label>
                      <Select value={editData?.gender || ''} disabled>
                        <SelectTrigger className="bg-gray-100 border-gray-300">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Gender cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700">Date of Birth</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal border-gray-300 hover:bg-gray-50",
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
                        <p className="text-sm text-indigo-600">Age: {calculateAge(editData.dateOfBirth)} years</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="married" className="text-sm font-medium text-gray-700">Marital Status</Label>
                      <Select 
                        value={editData?.married || ''} 
                        onValueChange={(value) => setEditData(prev => prev ? {...prev, married: value} : null)}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">Address</Label>
                    <Input 
                      id="address"
                      name="address" 
                      value={editData?.address || ''} 
                      onChange={handleEditChange} 
                      placeholder="Enter your complete address"
                      className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">New Password (Optional)</Label>
                    <Input 
                      id="password"
                      name="password" 
                      type="password"
                      value={editData?.password || ''} 
                      onChange={handleEditChange} 
                      placeholder="Leave blank to keep current password"
                      className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500">Leave empty if you don't want to change your password</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="familyTreeId" className="text-sm font-medium text-gray-700">Family Tree ID</Label>
                    <Input 
                      id="familyTreeId"
                      name="familyTreeId" 
                      value={editData?.familyTreeId || ''} 
                      className="bg-gray-100 border-gray-300"
                      disabled
                    />
                    <p className="text-xs text-gray-500">Family Tree ID cannot be changed</p>
                  </div>
                  
                  <div className="flex gap-3 pt-6 border-t border-gray-200">
                    <Button 
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3" 
                      onClick={handleSaveProfile}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-gray-300 hover:bg-gray-50 py-3" 
                      onClick={() => {
                        setEditMode(false);
                        setEditData({ ...user });
                      }}
                    >
                      Cancel
                    </Button>
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
