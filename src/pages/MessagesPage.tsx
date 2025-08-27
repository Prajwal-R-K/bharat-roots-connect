import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types";
import { ArrowLeft, Send, MessageCircle, Users, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";
import { getUserByEmailOrId } from "@/lib/neo4j";
import { format } from "date-fns";

// Simple message type for the chat
interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderProfilePicture?: string;
  familyTreeId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  timestamp: Date;
  isEdited: boolean;
  isDeleted: boolean;
  readBy: { userId: string; readAt: Date }[];
}

const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Try to get user from navigation state first, then localStorage
  const [user, setUser] = useState<User | null>(location.state?.user || null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadUserAndInitializeChat = async () => {
      try {
        setLoading(true);
        
        // Get user data if not already available
        let currentUser = user;
        if (!currentUser) {
          const storedUserId = localStorage.getItem('userId');
          if (storedUserId) {
            try {
              currentUser = await getUserByEmailOrId(storedUserId);
              if (currentUser) {
                setUser(currentUser);
              }
            } catch (error) {
              console.error("Error fetching user:", error);
            }
          }
        }

        if (!currentUser) {
          navigate('/auth');
          return;
        }
        
        console.log(`Initializing family chat for familyTreeId: ${currentUser.familyTreeId}`);
        
        // Get family members from Neo4j
        const members = await getFamilyMembers(currentUser.familyTreeId);
        const activeMembers = members.filter(member => member.status === 'active');
        setFamilyMembers(activeMembers);

        // Create mock messages for demonstration
        const mockMessages = [
          {
            messageId: "1",
            conversationId: "family-" + currentUser.familyTreeId,
            senderId: "demo-user-1",
            senderName: "Family Admin",
            familyTreeId: currentUser.familyTreeId,
            content: "Welcome to your family chat! 👋 This is where all family members can communicate.",
            messageType: 'text' as const,
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            isEdited: false,
            isDeleted: false,
            readBy: []
          },
          {
            messageId: "2", 
            conversationId: "family-" + currentUser.familyTreeId,
            senderId: currentUser.userId,
            senderName: currentUser.name,
            familyTreeId: currentUser.familyTreeId,
            content: "Hello everyone! Great to see our family chat is working!",
            messageType: 'text' as const,
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            isEdited: false,
            isDeleted: false,
            readBy: []
          }
        ];
        
        setMessages(mockMessages as ChatMessage[]);
        console.log(`Loaded ${mockMessages.length} mock messages for family chat`);

      } catch (error) {
        console.error("Error initializing family chat:", error);
        toast({
          title: "Loading Error",
          description: "Could not load family data. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAndInitializeChat();
  }, [user, navigate]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || !user) return;
    
    try {
      setSendingMessage(true);
      console.log(`Sending message from ${user.name} to family ${user.familyTreeId}`);
      
      // Create a new message object
      const newMsg: ChatMessage = {
        messageId: Date.now().toString(),
        conversationId: "family-" + user.familyTreeId,
        senderId: user.userId,
        senderName: user.name,
        senderProfilePicture: user.profilePicture,
        familyTreeId: user.familyTreeId,
        content: newMessage.trim(),
        messageType: 'text',
        timestamp: new Date(),
        isEdited: false,
        isDeleted: false,
        readBy: [{ userId: user.userId, readAt: new Date() }]
      };

      // Add to local state immediately for better UX
      setMessages(prev => [...prev, newMsg]);
      setNewMessage("");

      /* Enable this when MongoDB is configured:
      try {
        const sentMessage = await sendMessageToFamily(
          user.familyTreeId,
          user.userId,
          user.name,
          newMessage.trim(),
          user.profilePicture
        );
        
        // Update with the actual message from MongoDB
        setMessages(prev => [...prev.slice(0, -1), sentMessage]);
      } catch (mongoError) {
        console.warn("MongoDB not configured, message saved locally only:", mongoError);
      }
      */
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the family chat.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Send Failed",
        description: "Could not send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    return format(new Date(timestamp), 'MMM dd, HH:mm');
  };

  const isMessageFromCurrentUser = (message: ChatMessage) => {
    return message.senderId === user?.userId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading family chat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please log in to access family chat.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Family Chat</h1>
                <p className="text-sm text-gray-500">
                  {familyMembers.length} member{familyMembers.length !== 1 ? 's' : ''} • Family ID: {user.familyTreeId}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{familyMembers.length} members</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto flex h-[calc(100vh-80px)]">
        {/* Family Members Sidebar */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900 mb-3">Family Members</h2>
            <div className="space-y-2">
              {familyMembers.map((member) => (
                <div key={member.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profilePicture} />
                    <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.name}
                      {member.userId === user.userId && <span className="text-blue-600 ml-1">(You)</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{member.myRelationship || 'Family Member'}</p>
                  </div>
                  <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {member.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No messages yet</p>
                  <p className="text-sm text-gray-400">Start a conversation with your family!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.messageId}
                    className={`flex ${isMessageFromCurrentUser(message) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${isMessageFromCurrentUser(message) ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`rounded-lg p-3 ${
                          isMessageFromCurrentUser(message)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {!isMessageFromCurrentUser(message) && (
                          <p className="text-xs font-medium mb-1 opacity-70">{message.senderName}</p>
                        )}
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <div className={`mt-1 flex items-center gap-1 text-xs text-gray-500 ${
                        isMessageFromCurrentUser(message) ? 'justify-end' : 'justify-start'
                      }`}>
                        <Clock className="h-3 w-3" />
                        {formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                    {!isMessageFromCurrentUser(message) && (
                      <Avatar className="h-8 w-8 order-1 mr-2">
                        <AvatarImage src={message.senderProfilePicture} />
                        <AvatarFallback>{message.senderName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message to your family..."
                className="flex-1"
                disabled={sendingMessage}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="px-6"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;