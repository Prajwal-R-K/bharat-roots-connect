import * as React from 'react';
import { User, Calendar, MessageSquare, Users, Settings, Home, Plus, Download, Mail, LogOut, X, CalendarIcon, UserPlus, Camera, Menu } from 'lucide-react';
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
import { uploadProfilePhoto, getProfilePhotoUrl } from '@/lib/profile-api';
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
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  
  // State for mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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

  const handleSelectChange = (name: string, value: string) => {
    if (!editData) return;
    setEditData({ ...editData, [name]: value });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (!editData || !date) return;
    setEditData({ ...editData, dateOfBirth: date.toISOString().split('T')[0] });
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
    
    const loadingToast = toast({
      title: 'Updating profile...',
      description: 'Please wait while we save your changes.',
    });

    try {
      const updateData: any = {
        name: editData.name || '',
        phone: editData.phone || '',
        address: editData.address || '',
        dateOfBirth: editData.dateOfBirth || '',
        married: editData.married || '',
        gender: editData.gender || '',
      };

      console.log('=== PROFILE UPDATE DEBUG ===');
      console.log('User ID:', editData.userId);
      console.log('Update data being sent:', updateData);

      if (editData.password && editData.password.trim() !== '') {
        updateData.password = editData.password;
        console.log('Password update included');
      }

      console.log('Calling updateUserProfile...');
      await updateUserProfile(editData.userId, updateData);
      console.log('updateUserProfile completed successfully');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Fetching fresh user data for ID:', editData.userId);
      const freshUserData = await getUserByEmailOrId(editData.userId);
      console.log('Fetched fresh data:', freshUserData);

      if (freshUserData) {
        setUser(freshUserData);
        setProfileDetails(freshUserData);
        onUserUpdate(freshUserData);
        console.log('onUserUpdate called with fresh data.');

        loadingToast.dismiss();
        toast({
          title: 'Profile Updated!',
          description: 'Your changes have been saved successfully.',
        });
      } else {
        throw new Error('Could not retrieve updated user data from the database.');
      }
      
      setEditMode(false);

    } catch (err) {
      console.error('=== PROFILE UPDATE FAILED ===', err);
      loadingToast.dismiss();
      toast({ 
        title: 'Error Updating Profile', 
        description: 'Failed to save your changes. Please check the console and try again.',
        variant: 'destructive' 
      });
    }
  };

  // Handle profile photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploadingPhoto(true);
    
    try {
      const result = await uploadProfilePhoto(user.userId, user.familyTreeId, file);
      const fullPhotoUrl = getProfilePhotoUrl(result.photoUrl);
      await updateUserProfile(user.userId, { profilePicture: fullPhotoUrl });
      
      const freshUserData = await getUserByEmailOrId(user.userId);
      if (freshUserData) {
        setUser(freshUserData);
        setProfileDetails(freshUserData);
        onUserUpdate(freshUserData);
      }

      toast({
        title: 'Photo uploaded!',
        description: 'Your profile photo has been updated successfully.',
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload profile photo. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploadingPhoto(false);
      event.target.value = '';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Navbar with Family Background Theme */}
      <nav className="bg-white/95 backdrop-blur-md shadow-xl border-b border-slate-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand with enhanced styling */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent drop-shadow-sm">
                  Parivaar Bhandan
                </h1>
              </div>
            </div>

            {/* Navigation Links - Desktop */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-1">
                <Button 
                  variant="ghost" 
                  className="text-slate-700 hover:bg-amber-50 hover:text-amber-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-300 font-serif"
                  onClick={() => navigate('/family-tree')}
                >
                  <Users className="w-4 h-4" />
                  Family Tree
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-slate-700 hover:bg-amber-50 hover:text-amber-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-300 font-serif"
                  onClick={() => navigate('/events')}
                >
                  <Calendar className="w-4 h-4" />
                  Events
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-slate-700 hover:bg-amber-50 hover:text-amber-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-300 font-serif"
                  onClick={() => navigate('/posts')}
                >
                  <Mail className="w-4 h-4" />
                  Posts
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-slate-700 hover:bg-amber-50 hover:text-amber-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-300 font-serif"
                  onClick={() => navigate('/chat')}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </Button>
              </div>
            </div>

            {/* Profile Section & Mobile Toggle */}
            <div className="flex items-center gap-3">
              {/* Profile Avatar */}
              <div className="relative">
                <Avatar 
                  className="h-10 w-10 ring-2 ring-amber-300 shadow-lg cursor-pointer hover:ring-amber-400 transition-all duration-200 hover:shadow-xl"
                  onClick={() => setProfileOpen(true)}
                >
                  <AvatarImage src={user.profilePicture} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-semibold text-sm">
                    {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* User Info - Desktop Only */}
              <div className="text-right hidden lg:block">
                <div className="text-sm font-semibold text-slate-900 font-serif">{user.name}</div>
                <div className="text-xs text-slate-500 font-medium">Family ID: {user.familyTreeId}</div>
              </div>
              
              {/* Desktop Logout Button */}
              <Button 
                variant="outline" 
                size="sm"
                className="hidden md:flex text-slate-600 hover:text-slate-800 border-slate-300 hover:bg-slate-50 font-serif"
                onClick={() => {
                  localStorage.removeItem('userData');
                  localStorage.removeItem('userId');
                  navigate('/');
                }}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline font-medium">Logout</span>
              </Button>
              
              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 h-10 w-10 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200 text-amber-600 hover:text-amber-700 shadow-sm transition-all duration-200"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold font-serif">Menu</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white hover:bg-white/20 p-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <Avatar 
                  className="h-12 w-12 ring-2 ring-amber-300 shadow-lg cursor-pointer"
                  onClick={() => {
                    setProfileOpen(true);
                    setMobileMenuOpen(false);
                  }}
                >
                  <AvatarImage src={user.profilePicture} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-semibold">
                    {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold text-slate-900 font-serif">{user.name}</div>
                  <div className="text-xs text-slate-500">Family ID: {user.familyTreeId}</div>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 space-y-2">
              {[
                { icon: Users, label: 'Family Tree', path: '/family-tree' },
                { icon: Calendar, label: 'Events', path: '/events' },
                { icon: Mail, label: 'Posts', path: '/posts' },
                { icon: MessageSquare, label: 'Chat', path: '/chat' }
              ].map(({ icon: Icon, label, path }) => (
                <Button 
                  key={path}
                  variant="ghost" 
                  className="w-full justify-start text-slate-700 hover:bg-amber-50 hover:text-amber-600 h-12 font-serif"
                  onClick={() => {
                    navigate(path);
                    setMobileMenuOpen(false);
                  }}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="min-h-screen">
        {/* Enhanced Welcome Section - Full Window Size */}
        <div 
          className="relative bg-cover bg-center bg-no-repeat h-screen flex items-center justify-center overflow-hidden"
          style={{ 
            backgroundImage: 'url(/dashboard.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-black/25"></div>
          
          {/* Floating animation particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-20 w-4 h-4 bg-white/20 rounded-full animate-bounce"></div>
            <div className="absolute top-40 right-32 w-6 h-6 bg-yellow-300/30 rounded-full animate-pulse"></div>
            <div className="absolute bottom-32 left-16 w-5 h-5 bg-pink-300/25 rounded-full animate-ping"></div>
            <div className="absolute bottom-20 right-20 w-8 h-8 bg-blue-300/20 rounded-full animate-bounce"></div>
            <div className="absolute top-1/3 left-1/3 w-3 h-3 bg-green-300/30 rounded-full animate-pulse"></div>
            <div className="absolute top-2/3 right-1/4 w-4 h-4 bg-purple-300/25 rounded-full animate-ping"></div>
          </div>
          
          <div className="relative text-center px-6 max-w-4xl mx-auto">
            {/* Pure White Animated Text */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 font-serif text-white drop-shadow-2xl">
              <span className="relative inline-block animate-pulse">
                Welcome to Your Family
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl font-medium mb-12 animate-bounce text-white drop-shadow-lg font-serif">
              Connect, share, and celebrate together
            </p>
            
            {/* Animated moving dots - Pure White */}
            <div className="flex justify-center space-x-4 mb-12">
              <div className="w-4 h-4 bg-white rounded-full animate-bounce [animation-delay:-0.3s] shadow-lg"></div>
              <div className="w-4 h-4 bg-white rounded-full animate-bounce [animation-delay:-0.15s] shadow-lg"></div>
              <div className="w-4 h-4 bg-white rounded-full animate-bounce shadow-lg"></div>
              <div className="w-4 h-4 bg-white rounded-full animate-bounce [animation-delay:0.15s] shadow-lg"></div>
              <div className="w-4 h-4 bg-white rounded-full animate-bounce [animation-delay:0.3s] shadow-lg"></div>
            </div>
            
            {/* Animated Family Tree View Button - White theme */}
            <button
              onClick={() => {
                const familyTreeSection = document.getElementById('family-tree-section');
                familyTreeSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold transition-all duration-300 bg-white/20 backdrop-blur-sm text-white rounded-full shadow-2xl hover:shadow-white/30 hover:scale-110 transform animate-pulse hover:animate-none border-2 border-white/50 hover:bg-white/30"
            >
              <span className="absolute inset-0 w-full h-full bg-white/10 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></span>
              <span className="relative flex items-center gap-3 font-serif">
                <svg className="w-6 h-6 animate-spin group-hover:animate-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Family Tree View
                <svg className="w-6 h-6 animate-bounce group-hover:animate-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* Family Tree Section */}
        <div id="family-tree-section" className="min-h-screen p-6">
          <div className="min-h-[800px]">
            <FamilyTreeVisualization
              user={user}
              familyMembers={familyMembers}
              viewMode="all"
              minHeight="750px"
              showControls={true}
            />
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-serif">Profile Settings</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setProfileOpen(false);
                    setEditMode(false);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Photo Section */}
              <div className="text-center">
                <div className="relative inline-block">
                  <Avatar className="h-24 w-24 ring-4 ring-amber-300 shadow-xl mx-auto">
                    <AvatarImage src={profileDetails?.profilePicture} alt={profileDetails?.name} />
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-xl">
                      {profileDetails?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {editMode && (
                    <label className="absolute bottom-0 right-0 bg-amber-500 text-white p-2 rounded-full cursor-pointer hover:bg-amber-600 transition-colors shadow-lg">
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                    </label>
                  )}
                </div>
                {uploadingPhoto && <p className="text-sm text-amber-600 mt-2 font-medium">Uploading...</p>}
              </div>

              {/* Profile Information */}
              <div className="space-y-4">
                {editMode ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium text-slate-700 font-serif">Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={editData?.name || ''}
                          onChange={handleEditChange}
                          className="mt-1 border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700 font-serif">Phone Number</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={editData?.phone || ''}
                          onChange={handleEditChange}
                          className="mt-1 border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-sm font-medium text-slate-500 font-serif">Email (Read-only)</Label>
                        <Input
                          id="email"
                          value={editData?.email || ''}
                          disabled
                          className="mt-1 bg-slate-100 border-slate-300 text-slate-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="gender" className="text-sm font-medium text-slate-500 font-serif">Gender (Read-only)</Label>
                        <Input
                          id="gender"
                          value={editData?.gender || ''}
                          disabled
                          className="mt-1 bg-slate-100 border-slate-300 text-slate-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="dateOfBirth" className="text-sm font-medium text-slate-700 font-serif">Date of Birth</Label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <Select 
                            value={editData?.dateOfBirth ? new Date(editData.dateOfBirth).getDate().toString() : ''} 
                            onValueChange={(day) => {
                              if (editData?.dateOfBirth) {
                                const currentDate = new Date(editData.dateOfBirth);
                                currentDate.setDate(parseInt(day));
                                handleDateChange(currentDate);
                              } else {
                                const newDate = new Date();
                                newDate.setDate(parseInt(day));
                                handleDateChange(newDate);
                              }
                            }}
                          >
                            <SelectTrigger className="border-slate-300 focus:border-amber-500">
                              <SelectValue placeholder="Day" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                                <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select 
                            value={editData?.dateOfBirth ? (new Date(editData.dateOfBirth).getMonth() + 1).toString() : ''} 
                            onValueChange={(month) => {
                              if (editData?.dateOfBirth) {
                                const currentDate = new Date(editData.dateOfBirth);
                                currentDate.setMonth(parseInt(month) - 1);
                                handleDateChange(currentDate);
                              } else {
                                const newDate = new Date();
                                newDate.setMonth(parseInt(month) - 1);
                                handleDateChange(newDate);
                              }
                            }}
                          >
                            <SelectTrigger className="border-slate-300 focus:border-amber-500">
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">January</SelectItem>
                              <SelectItem value="2">February</SelectItem>
                              <SelectItem value="3">March</SelectItem>
                              <SelectItem value="4">April</SelectItem>
                              <SelectItem value="5">May</SelectItem>
                              <SelectItem value="6">June</SelectItem>
                              <SelectItem value="7">July</SelectItem>
                              <SelectItem value="8">August</SelectItem>
                              <SelectItem value="9">September</SelectItem>
                              <SelectItem value="10">October</SelectItem>
                              <SelectItem value="11">November</SelectItem>
                              <SelectItem value="12">December</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Select 
                            value={editData?.dateOfBirth ? new Date(editData.dateOfBirth).getFullYear().toString() : ''} 
                            onValueChange={(year) => {
                              if (editData?.dateOfBirth) {
                                const currentDate = new Date(editData.dateOfBirth);
                                currentDate.setFullYear(parseInt(year));
                                handleDateChange(currentDate);
                              } else {
                                const newDate = new Date();
                                newDate.setFullYear(parseInt(year));
                                handleDateChange(newDate);
                              }
                            }}
                          >
                            <SelectTrigger className="border-slate-300 focus:border-amber-500">
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent className="max-h-40">
                              {Array.from({length: 100}, (_, i) => new Date().getFullYear() - i).map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {editData?.dateOfBirth && (
                          <p className="text-sm text-amber-600 mt-1 font-medium">
                            Age: {calculateAge(editData.dateOfBirth)} years
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="married" className="text-sm font-medium text-slate-700 font-serif">Marital Status</Label>
                        <Select value={editData?.married || ''} onValueChange={(value) => handleSelectChange('married', value)}>
                          <SelectTrigger className="mt-1 border-slate-300 focus:border-amber-500">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="password" className="text-sm font-medium text-slate-700 font-serif">New Password</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          value={editData?.password || ''}
                          onChange={handleEditChange}
                          placeholder="Leave blank to keep current"
                          className="mt-1 border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="address" className="text-sm font-medium text-slate-700 font-serif">Address</Label>
                        <Input
                          id="address"
                          name="address"
                          value={editData?.address || ''}
                          onChange={handleEditChange}
                          placeholder="Enter your address"
                          className="mt-1 border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setEditMode(false)}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 font-serif"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveProfile}
                        className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-serif"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-slate-600 font-serif">Name:</span>
                        <p className="text-slate-900 font-serif">{profileDetails?.name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 font-serif">Email:</span>
                        <p className="text-slate-900">{profileDetails?.email}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 font-serif">Phone:</span>
                        <p className="text-slate-900">{profileDetails?.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 font-serif">Gender:</span>
                        <p className="text-slate-900 capitalize">{profileDetails?.gender}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 font-serif">Date of Birth:</span>
                        <p className="text-slate-900">
                          {profileDetails?.dateOfBirth ? 
                            `${format(new Date(profileDetails.dateOfBirth), 'PPP')} (Age: ${calculateAge(profileDetails.dateOfBirth)})` 
                            : 'Not provided'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 font-serif">Marital Status:</span>
                        <p className="text-slate-900 capitalize">{profileDetails?.married || 'Not specified'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-medium text-slate-600 font-serif">Address:</span>
                        <p className="text-slate-900">{profileDetails?.address || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={() => setEditMode(true)}
                        className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-serif"
                      >
                        Edit Profile
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;