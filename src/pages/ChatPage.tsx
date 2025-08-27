import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types";
import { ArrowLeft, Send, MessageCircle, Users, Clock, Moon, Sun, Phone, Video, MoreVertical, Smile } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";
import { getUserByEmailOrId } from "@/lib/neo4j";
import { format, isToday, isYesterday } from "date-fns";

// Enhanced message type for professional chat
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  senderProfilePicture?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  messageType: 'text' | 'image' | 'file';
}

const ChatPage: React.FC = () => {
  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  // Apply theme to html root
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time message checking every 3 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      const savedMessages = localStorage.getItem(`chat_${user.familyTreeId}`);
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        
        // Only update if there are new messages
        if (parsedMessages.length > messages.length) {
          setMessages(parsedMessages);
          // Update last seen time
          localStorage.setItem(`lastSeen_${user.userId}`, new Date().toISOString());
        }
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [user, messages.length]);

  // Mark user as online
  useEffect(() => {
    if (!user) return;
    
    const markOnline = () => {
      const onlineUsers = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
      if (!onlineUsers.includes(user.userId)) {
        onlineUsers.push(user.userId);
        localStorage.setItem('onlineUsers', JSON.stringify(onlineUsers));
        setOnlineMembers(onlineUsers);
      }
    };

    markOnline();
    const interval = setInterval(markOnline, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
      // Remove from online users when component unmounts
      const onlineUsers = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
      const updatedUsers = onlineUsers.filter((id: string) => id !== user.userId);
      localStorage.setItem('onlineUsers', JSON.stringify(updatedUsers));
    };
  }, [user]);

  useEffect(() => {
    const loadUserAndChat = async () => {
      try {
        setLoading(true);
        
        // Get user data from localStorage
        const storedUserId = localStorage.getItem('userId');
        if (!storedUserId) {
          navigate('/auth');
          return;
        }

        const currentUser = await getUserByEmailOrId(storedUserId);
        if (!currentUser) {
          navigate('/auth');
          return;
        }
        
        setUser(currentUser);
        
        // Get family members
        const members = await getFamilyMembers(currentUser.familyTreeId);
        const activeMembers = members.filter(member => member.status === 'active');
        setFamilyMembers(activeMembers);

        // Load existing messages from localStorage or create initial messages
        const savedMessages = localStorage.getItem(`chat_${currentUser.familyTreeId}`);
        if (savedMessages) {
          setMessages(JSON.parse(savedMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        } else {
          // Create welcome message
          const welcomeMessage: ChatMessage = {
            id: "1",
            senderId: "system",
            senderName: "Family Chat",
            content: `Welcome to your family chat, ${currentUser.name}! 👋 This is where all family members can communicate. Start by saying hello!`,
            timestamp: new Date(),
            status: 'read',
            messageType: 'text'
          };
          setMessages([welcomeMessage]);
        }

      } catch (error) {
        console.error("Error loading chat:", error);
        toast({
          title: "Loading Error",
          description: "Could not load family chat. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAndChat();
  }, [navigate]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;
    
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.userId,
      senderName: user.name,
      content: newMessage.trim(),
      timestamp: new Date(),
      senderProfilePicture: user.profilePicture,
      status: 'sent',
      messageType: 'text'
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setNewMessage("");

    // Save to localStorage
    localStorage.setItem(`chat_${user.familyTreeId}`, JSON.stringify(updatedMessages));
    
    toast({
      title: "Message Sent",
      description: "Your message has been sent to the family chat.",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    if (isToday(timestamp)) {
      return format(timestamp, 'HH:mm');
    } else if (isYesterday(timestamp)) {
      return `Yesterday ${format(timestamp, 'HH:mm')}`;
    } else {
      return format(timestamp, 'MMM dd, HH:mm');
    }
  };

  const formatDateSeparator = (timestamp: Date) => {
    if (isToday(timestamp)) {
      return 'Today';
    } else if (isYesterday(timestamp)) {
      return 'Yesterday';
    } else {
      return format(timestamp, 'MMMM dd, yyyy');
    }
  };

  const shouldShowDateSeparator = (currentMsg: ChatMessage, prevMsg?: ChatMessage) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.timestamp).toDateString();
    const prevDate = new Date(prevMsg.timestamp).toDateString();
    return currentDate !== prevDate;
  };

  const isMessageFromCurrentUser = (message: ChatMessage) => {
    return message.senderId === user?.userId;
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />;
      case 'sent':
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
      case 'delivered':
        return <div className="w-2 h-2 bg-blue-400 rounded-full" />;
      case 'read':
        return <div className="w-2 h-2 bg-green-400 rounded-full" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading family chat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-200">Please log in to access family chat.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-all duration-300">
      {/* Modern Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full px-3 py-2 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <div className="h-8 w-px bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600" />
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Family Chat
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  {familyMembers.length} member{familyMembers.length !== 1 ? 's' : ''} • {user.familyTreeId}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <Phone className="h-4 w-4" />
              <span className="hidden md:inline">Call</span>
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <Video className="h-4 w-4" />
              <span className="hidden md:inline">Video</span>
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2">
              <MoreVertical className="h-4 w-4" />
            </Button>
            {/* Enhanced Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              className="relative overflow-hidden border-2 border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 hover:scale-105 transition-all duration-200"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <div className={`absolute inset-0 bg-gradient-to-r transition-all duration-300 ${
                theme === 'light' 
                  ? 'from-yellow-400 to-orange-500 opacity-10' 
                  : 'from-blue-600 to-purple-700 opacity-20'
              }`} />
              <div className="relative flex items-center gap-2">
                {theme === 'light' ? (
                  <>
                    <Sun className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">Dark</span>
                  </>
                )}
              </div>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex h-[calc(100vh-88px)]">
        {/* Enhanced Family Members Sidebar */}
        <div className="w-80 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col">
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Family Members</h2>
              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {familyMembers.filter(m => m.status === 'active').length} online
              </Badge>
            </div>
            <div className="space-y-3">
              {familyMembers.map((member) => (
                <div key={member.userId} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 cursor-pointer">
                  <div className="relative">
                    <Avatar className="h-10 w-10 ring-2 ring-gray-200 dark:ring-gray-700">
                      <AvatarImage src={member.profilePicture} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                      onlineMembers.includes(member.userId) || member.userId === user?.userId 
                        ? 'bg-green-500' 
                        : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                      {member.name}
                      {member.userId === user?.userId && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">You</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.myRelationship || 'Family Member'}</p>
                  </div>
                  <Badge 
                    variant={member.status === 'active' ? 'default' : 'secondary'} 
                    className={`text-xs ${member.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}`}
                  >
                    {member.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Chat Area */}
        <div className="flex-1 flex flex-col bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
          {/* Messages Area with enhanced styling */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-1">
              {messages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No messages yet</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Start a conversation with your family!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const prevMessage = index > 0 ? messages[index - 1] : undefined;
                  const showDateSeparator = shouldShowDateSeparator(message, prevMessage);
                  const isCurrentUser = isMessageFromCurrentUser(message);
                  
                  return (
                    <div key={message.id}>
                      {/* Date Separator */}
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-6">
                          <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-3 py-1 rounded-full">
                            {formatDateSeparator(message.timestamp)}
                          </div>
                        </div>
                      )}
                      
                      {/* Message */}
                      <div className={`flex items-end gap-2 mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        {!isCurrentUser && message.senderId !== 'system' && (
                          <Avatar className="h-8 w-8 ring-2 ring-gray-200 dark:ring-gray-700">
                            <AvatarImage src={message.senderProfilePicture} />
                            <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white text-xs">
                              {message.senderName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-last' : ''}`}>
                          <div
                            className={`relative px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                              isCurrentUser
                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md'
                                : message.senderId === 'system'
                                ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-800 dark:text-green-200 rounded-bl-md'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                            }`}
                          >
                            {!isCurrentUser && message.senderId !== 'system' && (
                              <p className="text-xs font-semibold mb-1 opacity-70">{message.senderName}</p>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                            
                            {/* Message status and time */}
                            <div className={`flex items-center gap-2 mt-2 text-xs ${
                              isCurrentUser ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              <Clock className="h-3 w-3" />
                              <span>{formatMessageTime(message.timestamp)}</span>
                              {isCurrentUser && (
                                <div className="flex items-center gap-1">
                                  {getMessageStatusIcon(message.status)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {isTyping && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Someone is typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Enhanced Message Input */}
          <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl">
            <div className="flex items-end gap-3">
              <Button variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2">
                <Smile className="h-5 w-5 text-gray-500" />
              </Button>
              <div className="flex-1 relative">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full px-6 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full p-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              Press Enter to send • Messages update automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
