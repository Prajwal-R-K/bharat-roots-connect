import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types";
import { ArrowLeft, Send, MessageCircle, Users, Clock, Moon, Sun, Phone, Video, MoreVertical, Smile, Check, CheckCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";
import { getUserByEmailOrId } from "@/lib/neo4j";
import { format, isToday, isYesterday } from "date-fns";

// Import MongoDB functions
import {
  sendMessage,
  getFamilyMessages,
  getNewMessages,
  markMessageAsRead,
  updateOnlineStatus,
  getOnlineFamilyMembers,
  createOrUpdateFamilyRoom,
  type ChatMessage
} from "@/lib/mongodb";

const ChatPage: React.FC = () => {
  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  // Update theme in localStorage and apply to document
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.className = theme;
  }, [theme]);

  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load family data and initialize chat room
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
          navigate('/');
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

        // Get family members
        const members = await getFamilyMembers(currentUser.familyTreeId);
        setFamilyMembers(members);

        // Create or update family chat room in MongoDB
        await createOrUpdateFamilyRoom(
          currentUser.familyTreeId,
          `${currentUser.familyTreeId} Family`,
          members.map(member => ({
            userId: member.userId,
            userName: member.name
          }))
        );

        // Load existing messages from MongoDB
        const existingMessages = await getFamilyMessages(currentUser.familyTreeId, 50);
        
        if (existingMessages.length === 0) {
          // Create welcome message if no messages exist
          const welcomeMessage = await sendMessage({
            familyId: currentUser.familyTreeId,
            senderId: 'system',
            senderName: 'Family Chat System',
            content: `🏠 Welcome to your family chat!\n\nThis is a private space for the ${currentUser.familyTreeId} family to stay connected. All family members can see and participate in this conversation.\n\nYour messages are securely stored and synchronized across all devices.`,
            status: 'sent',
            messageType: 'system'
          });
          setMessages([welcomeMessage]);
          setLastMessageTimestamp(welcomeMessage.timestamp);
        } else {
          setMessages(existingMessages);
          setLastMessageTimestamp(existingMessages[existingMessages.length - 1].timestamp);
        }

        // Update user online status
        await updateOnlineStatus(currentUser.userId, currentUser.familyTreeId, true);

        // Get initial online members
        const onlineUsers = await getOnlineFamilyMembers(currentUser.familyTreeId);
        setOnlineMembers(onlineUsers);

        setLoading(false);

      } catch (error) {
        console.error('Error initializing chat:', error);
        setLoading(false);
        toast({
          title: "Connection error",
          description: "Failed to connect to chat. Please try again.",
          variant: "destructive"
        });
      }
    };

    initializeChat();

    // Cleanup: Update offline status when component unmounts
    return () => {
      if (user) {
        updateOnlineStatus(user.userId, user.familyTreeId, false).catch(console.error);
      }
    };
  }, [navigate]);

  // Real-time message polling - check for new messages every 2 seconds
  useEffect(() => {
    if (!user || loading) return;

    const pollNewMessages = async () => {
      try {
        const newMessages = await getNewMessages(user.familyTreeId, lastMessageTimestamp);
        
        if (newMessages.length > 0) {
          setMessages(prev => [...prev, ...newMessages]);
          setLastMessageTimestamp(newMessages[newMessages.length - 1].timestamp);
          
          // Mark messages as read if they're not from current user
          for (const message of newMessages) {
            if (message.senderId !== user.userId) {
              await markMessageAsRead(message.id, user.userId);
            }
          }
        }

        // Update online members list
        const currentOnlineMembers = await getOnlineFamilyMembers(user.familyTreeId);
        setOnlineMembers(currentOnlineMembers);

      } catch (error) {
        console.error('Error polling new messages:', error);
      }
    };

    // Poll every 2 seconds for real-time updates
    const interval = setInterval(pollNewMessages, 2000);

    return () => clearInterval(interval);
  }, [user, lastMessageTimestamp, loading]);

  // Send message function with MongoDB integration
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const messageData = {
        familyId: user.familyTreeId,
        senderId: user.userId,
        senderName: user.name,
        senderProfilePicture: user.profilePicture,
        content: messageContent,
        status: 'sending' as const,
        messageType: 'text' as const
      };

      // Optimistically add message to UI
      const tempMessage: ChatMessage = {
        ...messageData,
        id: `temp_${Date.now()}`,
        timestamp: new Date(),
        readBy: [],
        isDeleted: false
      };
      
      setMessages(prev => [...prev, tempMessage]);

      // Send to MongoDB
      const savedMessage = await sendMessage(messageData);
      
      // Replace temp message with saved message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id ? savedMessage : msg
        )
      );

      setLastMessageTimestamp(savedMessage.timestamp);

      toast({
        title: "Message sent",
        description: "Your message has been delivered to the family.",
      });

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove failed message from UI
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp_')));
      
      toast({
        title: "Failed to send message",
        description: "Please check your connection and try again.",
        variant: "destructive"
      });
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Check if message is from current user
  const isMessageFromCurrentUser = (message: ChatMessage): boolean => {
    return message.senderId === user?.userId;
  };

  // Format message time
  const formatMessageTime = (timestamp: Date): string => {
    if (isToday(timestamp)) {
      return format(timestamp, 'HH:mm');
    } else if (isYesterday(timestamp)) {
      return `Yesterday ${format(timestamp, 'HH:mm')}`;
    } else {
      return format(timestamp, 'MMM dd, HH:mm');
    }
  };

  // Format date separator
  const formatDateSeparator = (timestamp: Date): string => {
    if (isToday(timestamp)) {
      return 'Today';
    } else if (isYesterday(timestamp)) {
      return 'Yesterday';
    } else {
      return format(timestamp, 'MMMM dd, yyyy');
    }
  };

  // Check if should show date separator
  const shouldShowDateSeparator = (currentMessage: ChatMessage, previousMessage?: ChatMessage): boolean => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.timestamp).toDateString();
    const previousDate = new Date(previousMessage.timestamp).toDateString();
    
    return currentDate !== previousDate;
  };

  // Get message status icon
  const getMessageStatusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 animate-spin" />;
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-400" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Loading Chat</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Connecting to your family...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Authentication Required</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Please log in to access family chat.</p>
          <Button onClick={() => navigate('/')}>Go to Login</Button>
        </div>
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
                {onlineMembers.length} online
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
                    variant={onlineMembers.includes(member.userId) ? 'default' : 'secondary'} 
                    className={`text-xs ${onlineMembers.includes(member.userId) ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}`}
                  >
                    {onlineMembers.includes(member.userId) ? 'online' : 'offline'}
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
              Press Enter to send • Messages sync across all devices via MongoDB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
