import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  MessageCircle, 
  Phone, 
  Video, 
  Plus,
  Settings,
  Search,
  ArrowLeft
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getFamilyMembers } from '@/lib/neo4j/family-tree';
import { getUserByEmailOrId } from '@/lib/neo4j';
import { ChatInterface } from '@/components/ChatInterface';

interface GroupChatViewProps {
  onBack?: () => void;
}

export const GroupChatView: React.FC<GroupChatViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<'family' | 'subgroup' | null>(null);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);

  useEffect(() => {
    const initializeGroupView = async () => {
      try {
        setLoading(true);

        // Get user data
        const storedUserId = localStorage.getItem('userId');
        const storedEmail = localStorage.getItem('userEmail');
        
        if (!storedUserId && !storedEmail) {
          toast({
            title: "Authentication required",
            description: "Please log in to access group chat.",
            variant: "destructive"
          });
          navigate('/auth');
          return;
        }

        const currentUser = await getUserByEmailOrId(storedUserId || storedEmail!);
        if (!currentUser || !currentUser.familyTreeId) {
          toast({
            title: "Family not found",
            description: "You need to be part of a family to use group chat.",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }

        setUser(currentUser);

        // Get family members
        const members = await getFamilyMembers(currentUser.familyTreeId);
        setFamilyMembers(members);

        setLoading(false);
      } catch (error) {
        console.error('Error initializing group view:', error);
        setLoading(false);
        toast({
          title: "Connection error",
          description: "Failed to load group view. Please try again.",
          variant: "destructive"
        });
      }
    };

    initializeGroupView();
  }, [navigate]);

  // Group family members by relationship
  const groupMembersByRelationship = () => {
    const groups: { [key: string]: any[] } = {};
    
    familyMembers.forEach(member => {
      const relationship = member.relationship || 'Family';
      if (!groups[relationship]) {
        groups[relationship] = [];
      }
      groups[relationship].push(member);
    });

    return groups;
  };

  const getOnlineStatus = (userId: string): boolean => {
    return onlineMembers.includes(userId);
  };

  const handleStartGroupCall = (callType: 'voice' | 'video', members: any[]) => {
    // This would integrate with the WebRTC service
    toast({
      title: `${callType === 'video' ? 'Video' : 'Voice'} call started`,
      description: `Calling ${members.length} family members...`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading group view...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Unable to load group view</p>
          <p className="text-sm text-muted-foreground mb-4">Please try logging in again.</p>
          <Button onClick={() => navigate('/auth')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // If a specific chat is selected, show the chat interface
  if (selectedChat === 'family') {
    return (
      <div className="h-screen bg-background">
        <ChatInterface 
          user={user} 
          familyMembers={familyMembers}
          onBack={() => setSelectedChat(null)}
        />
      </div>
    );
  }

  const relationshipGroups = groupMembersByRelationship();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button
                onClick={onBack}
                variant="ghost"
                size="sm"
                className="md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  <Users className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold">Family Groups</h1>
                <p className="text-sm text-muted-foreground">
                  {familyMembers.length} total members
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        {/* Main Family Group */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>{user.familyTreeId} Family</span>
                <Badge variant="secondary">{familyMembers.length} members</Badge>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleStartGroupCall('voice', familyMembers)}
                  variant="outline"
                  size="sm"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call All
                </Button>
                <Button
                  onClick={() => handleStartGroupCall('video', familyMembers)}
                  variant="outline"
                  size="sm"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video Call
                </Button>
                <Button
                  onClick={() => setSelectedChat('family')}
                  variant="default"
                  size="sm"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {familyMembers.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {getOnlineStatus(member.userId) && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.relationship || 'Family Member'}
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm">
                      <Phone className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Relationship-based Groups */}
        {Object.entries(relationshipGroups).map(([relationship, members]) => {
          if (relationship === 'Family' || members.length < 2) return null;
          
          return (
            <Card key={relationship}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>{relationship} Group</span>
                    <Badge variant="outline">{members.length} members</Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleStartGroupCall('voice', members)}
                      variant="outline"
                      size="sm"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                    <Button
                      onClick={() => handleStartGroupCall('video', members)}
                      variant="outline"
                      size="sm"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </Button>
                    <Button variant="default" size="sm">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center space-x-2 p-2 rounded-lg border bg-muted/20"
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {getOnlineStatus(member.userId) && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-background"></div>
                        )}
                      </div>
                      <span className="text-sm font-medium">{member.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Create New Group Button */}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Plus className="h-8 w-8 text-muted-foreground mb-2" />
            <h3 className="font-medium mb-1">Create New Group</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create custom groups for specific family discussions
            </p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupChatView;
