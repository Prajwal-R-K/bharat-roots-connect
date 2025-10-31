import * as React from 'react';
import { User, Calendar, MessageSquare, Users, Settings, Home, Plus, Download, Mail, LogOut, X, CalendarIcon, UserPlus, Camera, Menu, Link2, Bell, Compass } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getFamilyMembers, getUserByEmailOrId, getUnreadInterconnectCount, getIncomingInterconnectRequests, markInterconnectRequestRead, acceptInterconnectRequest, rejectInterconnectRequest, deleteInterconnectRequestForUser } from '@/lib/neo4j';
import type { InterconnectRequest } from '@/lib/neo4j/relationships';

import { uploadProfilePhoto, getProfilePhotoUrl } from '@/lib/profile-api';
import { User as UserType, FamilyMember } from '@/types';
import FamilyTreeVisualization from './FamilyTreeVisualization1';
import RelationshipAnalyzer from './RelationshipAnalyzer';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { createUser } from '@/lib/neo4j';
import { createCoreRelationship } from '@/lib/neo4j/relationships';
import { generateId, getCurrentDateTime } from '@/lib/utils';

interface DashboardProps {
  user: UserType;
  onUserUpdate: (updatedUser: UserType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user: initialUser, onUserUpdate }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = React.useState<UserType>(initialUser);
  const [familyMembers, setFamilyMembers] = React.useState<FamilyMember[]>([]);
  
  // State for profile modal
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [profileDetails, setProfileDetails] = React.useState<UserType | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  const [editData, setEditData] = React.useState<UserType | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  
  // State for mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [unreadInterconnects, setUnreadInterconnects] = React.useState<number>(0);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [loadingNotifs, setLoadingNotifs] = React.useState(false);
  const [incomingNotifs, setIncomingNotifs] = React.useState<InterconnectRequest[]>([]);
  
  // State for Explore feature
  const [exploreOpen, setExploreOpen] = React.useState(false);
  const [addMemberOpen, setAddMemberOpen] = React.useState(false);
  const [newMember, setNewMember] = React.useState({
    name: '',
    relationship: '',
    gender: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    hasEmail: true,
    userId: '',
    password: '',
    confirmPassword: '',
    isAlive: true,
    dateOfDeath: ''
  });

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
      const updateData: Partial<UserType> = {
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

  // Poll unread interconnect requests count and listen for refresh/focus
  React.useEffect(() => {
    const intervalDelay = 10000;
    const fetchUnread = async () => {
      try {
        const count = await getUnreadInterconnectCount(user.userId);
        setUnreadInterconnects(typeof count === 'number' ? count : 0);
      } catch (err) {
        console.error('Failed to fetch unread interconnect count', err);
      }
    };
    fetchUnread();
    const interval = window.setInterval(fetchUnread, intervalDelay);
    const onRefresh = () => fetchUnread();
    const onFocus = () => fetchUnread();
    window.addEventListener('interconnect:refresh', onRefresh);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('interconnect:refresh', onRefresh);
      window.removeEventListener('focus', onFocus);
    };
  }, [user.userId]);

  // Notification list handlers for popover
  const fetchIncomingList = React.useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const list = await getIncomingInterconnectRequests(user.userId);
      setIncomingNotifs(list);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoadingNotifs(false);
    }
  }, [user.userId]);

  React.useEffect(() => {
    if (notifOpen) fetchIncomingList();
  }, [notifOpen, fetchIncomingList]);

  const handleMarkRead = async (id: string) => {
    await markInterconnectRequestRead(id);
    window.dispatchEvent(new Event('interconnect:refresh'));
    fetchIncomingList();
  };
  const handleAccept = async (id: string) => {
    const ok = await acceptInterconnectRequest(id);
    window.dispatchEvent(new Event('interconnect:refresh'));
    fetchIncomingList();
    if (!ok) {
      toast({ title: 'Failed', description: 'Unable to accept request', variant: 'destructive' });
    }
  };
  const handleReject = async (id: string) => {
    const ok = await rejectInterconnectRequest(id);
    window.dispatchEvent(new Event('interconnect:refresh'));
    fetchIncomingList();
    if (!ok) {
      toast({ title: 'Failed', description: 'Unable to reject request', variant: 'destructive' });
    }
  };
  const handleDelete = async (id: string) => {
    const ok = await deleteInterconnectRequestForUser(id, user.userId);
    window.dispatchEvent(new Event('interconnect:refresh'));
    fetchIncomingList();
    if (!ok) {
      toast({ title: 'Delete failed', description: 'Unable to delete notification', variant: 'destructive' });
    }
  };

  // Handle adding a new family member from Explore feature
  const handleAddFamilyMember = async () => {
    try {
      // Validation
      if (!newMember.name || !newMember.relationship || !newMember.gender) {
        toast({
          title: 'Missing required fields',
          description: 'Please fill in name, relationship, and gender.',
          variant: 'destructive'
        });
        return;
      }

      // Validate based on email/non-email user
      if (newMember.hasEmail && !newMember.email) {
        toast({
          title: 'Email required',
          description: 'Please provide an email address.',
          variant: 'destructive'
        });
        return;
      }

      if (!newMember.hasEmail) {
        if (!newMember.userId || !newMember.password || !newMember.confirmPassword) {
          toast({
            title: 'Missing credentials',
            description: 'Please provide userId, password, and confirm password.',
            variant: 'destructive'
          });
          return;
        }

        if (newMember.password !== newMember.confirmPassword) {
          toast({
            title: "Passwords don't match",
            description: 'Please make sure your passwords match.',
            variant: 'destructive'
          });
          return;
        }
      }

      // Create new user
      const memberData: any = {
        userId: newMember.hasEmail ? generateId('U') : newMember.userId,
        name: newMember.name,
        email: newMember.hasEmail ? newMember.email : '',
        phone: newMember.phone,
        status: newMember.hasEmail ? 'invited' : 'active',
        familyTreeId: user.familyTreeId,
        createdBy: user.userId,
        createdAt: getCurrentDateTime(),
        myRelationship: newMember.relationship,
        gender: newMember.gender,
        dateOfBirth: newMember.dateOfBirth,
        isAlive: newMember.isAlive,
        dateOfDeath: newMember.isAlive ? '' : newMember.dateOfDeath,
        password: newMember.hasEmail ? undefined : newMember.password,
      };

      const createdMember = await createUser(memberData);

      // Create relationship based on type
      const relationshipType = newMember.relationship.toLowerCase();
      
      // Map semantic relationship to core relationship and determine direction
      if (relationshipType === 'son' || relationshipType === 'daughter') {
        // For children: User is PARENT_OF the new member
        await createCoreRelationship(
          user.familyTreeId,
          user.userId,
          createdMember.userId,
          'PARENTS_OF'
        );
      } else if (relationshipType === 'spouse' || relationshipType === 'husband' || relationshipType === 'wife') {
        // For spouse: Bidirectional MARRIED_TO relationship
        await createCoreRelationship(
          user.familyTreeId,
          user.userId,
          createdMember.userId,
          'MARRIED_TO'
        );
      }

      toast({
        title: 'Family member added',
        description: `${newMember.name} has been added to your family tree.`
      });

      // Reset form
      setNewMember({
        name: '',
        relationship: '',
        gender: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        hasEmail: true,
        userId: '',
        password: '',
        confirmPassword: '',
        isAlive: true,
        dateOfDeath: ''
      });

      setAddMemberOpen(false);
      setExploreOpen(false);

      // Refresh family members to update the visualization
      const updatedMembers = await getFamilyMembers(user.familyTreeId);
      setFamilyMembers(updatedMembers);

    } catch (error) {
      console.error('Error adding family member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add family member. Please try again.',
        variant: 'destructive'
      });
    }
  };

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
                <Button 
                  variant="ghost" 
                  className="text-slate-700 hover:bg-amber-50 hover:text-amber-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-300 font-serif"
                  onClick={() => navigate('/interconnect')}
                >
                  <Link2 className="w-4 h-4" />
                  Interconnect
                </Button>
                <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="relative text-slate-700 hover:bg-amber-50 hover:text-amber-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-300 font-serif"
                    >
                      <Bell className="w-4 h-4" />
                      {unreadInterconnects > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-green-500 text-white text-[10px] font-bold">
                          {unreadInterconnects}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0 hidden md:block" align="end">
                    <div className="p-3 border-b">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Notifications</div>
                        <Button variant="ghost" size="sm" onClick={fetchIncomingList}>Refresh</Button>
                      </div>
                      <div className="text-xs text-slate-500">Incoming interconnect requests</div>
                    </div>
                    <div className="max-h-80 overflow-auto">
                      {loadingNotifs ? (
                        <div className="p-4 text-sm text-slate-500">Loading...</div>
                      ) : incomingNotifs.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">No notifications</div>
                      ) : (
                        <div className="divide-y">
                          {incomingNotifs.map((req) => (
                            <div key={req.id} className="p-3 flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="text-sm">From <Badge variant="secondary">{req.sourceFamilyTreeId}</Badge> → <Badge variant="secondary">{req.targetFamilyTreeId}</Badge></div>
                                <div className="text-xs text-slate-600">Rel: <span className="font-medium">{req.sourceRel}</span> • You as <span className="font-medium">{req.targetRel}</span></div>
                                <div className="text-[11px] text-slate-400">{req.status}{!req.readByTarget ? ' • unread' : ''}</div>
                              </div>
                              <div className="flex flex-col gap-1">
                                {req.status === 'pending' && (
                                  <>
                                    <Button size="xs" variant="default" onClick={() => handleAccept(req.id)}>Accept</Button>
                                    <Button size="xs" variant="destructive" onClick={() => handleReject(req.id)}>Reject</Button>
                                  </>
                                )}
                                {!req.readByTarget && (
                                  <Button size="xs" variant="outline" onClick={() => handleMarkRead(req.id)}>Mark read</Button>
                                )}
                                <Button size="xs" variant="ghost" onClick={() => handleDelete(req.id)}>Delete</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Profile Section & Mobile Toggle */}
            <div className="flex items-center gap-3">
              {/* Profile Avatar */}
              <div className="relative">
                {/* Notification bell - mobile view */}
                <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden relative mr-2"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadInterconnects > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-4 px-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold">
                          {unreadInterconnects}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 mr-2 md:hidden" align="end">
                    <div className="p-3 border-b">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Notifications</div>
                        <Button variant="ghost" size="sm" onClick={fetchIncomingList}>Refresh</Button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-auto">
                      {loadingNotifs ? (
                        <div className="p-4 text-sm text-slate-500">Loading...</div>
                      ) : incomingNotifs.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">No notifications</div>
                      ) : (
                        <div className="divide-y">
                          {incomingNotifs.map((req) => (
                            <div key={req.id} className="p-3 flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="text-xs">From <Badge variant="secondary">{req.sourceFamilyTreeId}</Badge> → <Badge variant="secondary">{req.targetFamilyTreeId}</Badge></div>
                                <div className="text-[11px] text-slate-600">Rel: <span className="font-medium">{req.sourceRel}</span> • You as <span className="font-medium">{req.targetRel}</span></div>
                              </div>
                              <div className="flex flex-col gap-1">
                                {req.status === 'pending' && (
                                  <>
                                    <Button size="xs" variant="default" onClick={() => handleAccept(req.id)}>Accept</Button>
                                    <Button size="xs" variant="destructive" onClick={() => handleReject(req.id)}>Reject</Button>
                                  </>
                                )}
                                {!req.readByTarget && (
                                  <Button size="xs" variant="outline" onClick={() => handleMarkRead(req.id)}>Mark read</Button>
                                )}
                                <Button size="xs" variant="ghost" onClick={() => handleDelete(req.id)}>Delete</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
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
            
            {/* Action Buttons - Family Tree View and Explore */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
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

              <button
                onClick={() => setExploreOpen(true)}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold transition-all duration-300 bg-amber-500/90 backdrop-blur-sm text-white rounded-full shadow-2xl hover:shadow-amber-500/30 hover:scale-110 transform border-2 border-amber-400/50 hover:bg-amber-600/90"
              >
                <span className="absolute inset-0 w-full h-full bg-amber-400/20 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></span>
                <span className="relative flex items-center gap-3 font-serif">
                  <Compass className="w-6 h-6" />
                  Explore Features
                </span>
              </button>
            </div>
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
          
          {/* AI Relationship Analyzer Section */}
          {familyMembers.length > 1 && (
            <div className="mt-12 max-w-6xl mx-auto">
              <RelationshipAnalyzer 
                familyId={user.familyTreeId} 
                currentUserId={user.userId} 
              />
            </div>
          )}
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

      {/* Explore Dialog */}
      <Dialog open={exploreOpen} onOpenChange={setExploreOpen}>
        <DialogContent className="sm:max-w-2xl border-0 p-0 overflow-hidden">
          {/* Header Section with Gradient */}
          <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 text-white p-8 text-center">
            <h2 className="text-3xl font-bold mb-3">Welcome to Your Family</h2>
            <p className="text-purple-100 text-lg">Connect, share, and celebrate together</p>
            
            {/* Navigation Dots */}
            <div className="flex justify-center gap-2 mt-6">
              <div className="w-3 h-3 rounded-full bg-white"></div>
              <div className="w-3 h-3 rounded-full bg-white/50"></div>
              <div className="w-3 h-3 rounded-full bg-white/50"></div>
              <div className="w-3 h-3 rounded-full bg-white/50"></div>
              <div className="w-3 h-3 rounded-full bg-white/50"></div>
            </div>
          </div>

          {/* Features Section */}
          <div className="p-8 bg-white">
            {/* Main Feature - Add Family Member */}
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => {
                  setExploreOpen(false);
                  setAddMemberOpen(true);
                }}
                className="w-full h-auto py-6 px-6 border-2 border-amber-300 hover:border-amber-500 hover:bg-amber-50 transition-all duration-300"
              >
                <div className="flex flex-col items-center gap-2 w-full">
                  <UserPlus className="w-8 h-8 text-amber-600" />
                  <span className="text-lg font-semibold text-slate-800">Add Family Member</span>
                  <p className="text-xs text-slate-500 text-center">Add new members directly connected to you</p>
                </div>
              </Button>
            </div>

            {/* Additional Features Grid */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                className="h-24 border border-dashed border-slate-300 hover:border-slate-400 flex-col gap-2 opacity-50 cursor-not-allowed"
                disabled
              >
                <Plus className="w-6 h-6 text-slate-400" />
                <span className="text-sm text-slate-400">Health Details</span>
              </Button>
              <Button
                variant="ghost"
                className="h-24 border border-dashed border-slate-300 hover:border-slate-400 flex-col gap-2 opacity-50 cursor-not-allowed"
                disabled
              >
                <Plus className="w-6 h-6 text-slate-400" />
                <span className="text-sm text-slate-400">Property Details</span>
              </Button>
              <Button
                variant="ghost"
                className="h-24 border border-dashed border-slate-300 hover:border-slate-400 flex-col gap-2 opacity-50 cursor-not-allowed"
                disabled
              >
                <Plus className="w-6 h-6 text-slate-400" />
                <span className="text-sm text-slate-400">Documents</span>
              </Button>
              <Button
                variant="ghost"
                className="h-24 border border-dashed border-slate-300 hover:border-slate-400 flex-col gap-2 opacity-50 cursor-not-allowed"
                disabled
              >
                <Plus className="w-6 h-6 text-slate-400" />
                <span className="text-sm text-slate-400">More Coming</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Family Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div>
              <Label htmlFor="memberName" className="text-sm font-medium">Name *</Label>
              <Input
                id="memberName"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="Enter full name"
                className="mt-1"
              />
            </div>

            {/* Relationship */}
            <div>
              <Label htmlFor="memberRelationship" className="text-sm font-medium">Relationship *</Label>
              <Select value={newMember.relationship} onValueChange={(value) => setNewMember({ ...newMember, relationship: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="son">Son</SelectItem>
                  <SelectItem value="daughter">Daughter</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="husband">Husband</SelectItem>
                  <SelectItem value="wife">Wife</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gender */}
            <div>
              <Label htmlFor="memberGender" className="text-sm font-medium">Gender *</Label>
              <Select value={newMember.gender} onValueChange={(value) => setNewMember({ ...newMember, gender: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
                    onChange={() => setNewMember({ ...newMember, hasEmail: true, userId: '', password: '', confirmPassword: '' })}
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
                <Label htmlFor="memberEmail" className="text-sm font-medium">Email *</Label>
                <Input
                  id="memberEmail"
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
                  <Label htmlFor="memberUserId" className="text-sm font-medium">User ID *</Label>
                  <Input
                    id="memberUserId"
                    value={newMember.userId}
                    onChange={(e) => setNewMember({ ...newMember, userId: e.target.value })}
                    placeholder="Create a unique user ID"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="memberPassword" className="text-sm font-medium">Password *</Label>
                  <Input
                    id="memberPassword"
                    type="password"
                    value={newMember.password}
                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                    placeholder="Create a password"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="memberConfirmPassword" className="text-sm font-medium">Confirm Password *</Label>
                  <Input
                    id="memberConfirmPassword"
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

            {/* Birth Date */}
            <div>
              <Label htmlFor="memberDateOfBirth" className="text-sm font-medium">Date of Birth</Label>
              <Input
                id="memberDateOfBirth"
                type="date"
                value={newMember.dateOfBirth}
                onChange={(e) => setNewMember({ ...newMember, dateOfBirth: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Death Date (if deceased) */}
            {!newMember.isAlive && (
              <div>
                <Label htmlFor="memberDateOfDeath" className="text-sm font-medium">Date of Death</Label>
                <Input
                  id="memberDateOfDeath"
                  type="date"
                  value={newMember.dateOfDeath}
                  onChange={(e) => setNewMember({ ...newMember, dateOfDeath: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}

            {/* Phone */}
            <div>
              <Label htmlFor="memberPhone" className="text-sm font-medium">Phone (Optional)</Label>
              <Input
                id="memberPhone"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                placeholder="Enter phone number"
                className="mt-1"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setAddMemberOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddFamilyMember}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;