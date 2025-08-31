import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/types";
import { toast } from "@/hooks/use-toast";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";
import { getUserByEmailOrId } from "@/lib/neo4j";
import { ChatInterface } from "@/components/ChatInterface";
import { useGlobalCall } from "@/components/GlobalCallProvider";

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentUser, setFamilyMembers: setGlobalFamilyMembers } = useGlobalCall();
  const [user, setUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);

        // Get user data from localStorage
        const storedUserId = localStorage.getItem('userId');
        const storedEmail = localStorage.getItem('userEmail');
        
        if (!storedUserId && !storedEmail) {
          toast({
            title: "Authentication required",
            description: "Please log in to access family chat.",
            variant: "destructive"
          });
          navigate('/auth');
          return;
        }

        // Get current user
        const currentUser = await getUserByEmailOrId(storedUserId || storedEmail!);
        if (!currentUser || !currentUser.familyTreeId) {
          toast({
            title: "Family not found",
            description: "You need to be part of a family to use chat.",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }

        setUser(currentUser);
        setCurrentUser(currentUser); // Set in global context

        // Get family members
        const members = await getFamilyMembers(currentUser.familyTreeId);
        setFamilyMembers(members);
        setGlobalFamilyMembers(members); // Set in global context

        setLoading(false);
      } catch (error) {
        console.error('Error initializing chat:', error);
        setLoading(false);
        toast({
          title: "Connection error",
          description: "Failed to connect to chat. Please try again.",
          variant: "destructive"
        });
        navigate('/dashboard');
      }
    };

    initializeChat();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading family chat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Unable to load chat</p>
          <p className="text-sm text-muted-foreground mb-4">Please try logging in again.</p>
          <button 
            onClick={() => navigate('/auth')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <ChatInterface 
        user={user} 
        familyMembers={familyMembers}
        onBack={() => navigate('/dashboard')}
      />
    </div>
  );
};

export default ChatPage;
