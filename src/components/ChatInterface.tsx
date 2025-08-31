import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types";
import { 
  ArrowLeft, 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Smile, 
  Paperclip,
  Search,
  Users,
  Settings,
  Moon,
  Sun,
  Bell,
  BellOff
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFamilyMembers } from "@/lib/neo4j/family-tree";
import { getUserByEmailOrId } from "@/lib/neo4j";
import { format, isToday, isYesterday } from "date-fns";
import { webrtcService } from "@/services/webrtc-service";
import { useGlobalCall } from "@/components/GlobalCallProvider";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { MediaPermissionHelper } from "@/components/MediaPermissionHelper";

// Emoji picker imports
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

// Import HTTP-based chat functions
import {
  sendMessage,
  getFamilyMessages,
  getNewMessages,
  markMessageAsRead,
  createOrUpdateFamilyRoom,
  type ChatMessage
} from "@/lib/chat-api";

interface ChatInterfaceProps {
  user: User;
  familyMembers: any[];
  onBack?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  user, 
  familyMembers, 
  onBack 
}) => {
  const navigate = useNavigate();
  const { initializeWebRTC } = useGlobalCall();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  const [showPermissionHelper, setShowPermissionHelper] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Theme management
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.className = theme;
  }, [theme]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Load messages and initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);

        // Create or update family chat room
        await createOrUpdateFamilyRoom(
          user.familyTreeId,
          `${user.familyTreeId} Family`,
          familyMembers.map(member => ({
            userId: member.userId,
            userName: member.name
          }))
        );

        // Load existing messages
        const existingMessages = await getFamilyMessages(user.familyTreeId, 50);
        
        if (existingMessages.length === 0) {
          // Create welcome message
          const welcomeMessage = await sendMessage({
            familyId: user.familyTreeId,
            senderId: 'system',
            senderName: 'Family Chat System',
            content: `🏠 Welcome to your family chat!\n\nThis is a private space for the ${user.familyTreeId} family to stay connected.`,
            status: 'sent',
            messageType: 'system'
          });
          setMessages([welcomeMessage]);
          setLastMessageTimestamp(welcomeMessage.timestamp);
        } else {
          setMessages(existingMessages);
          setLastMessageTimestamp(existingMessages[existingMessages.length - 1].timestamp);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error initializing chat:', error);
        setLoading(false);
        toast({
          title: "Connection error",
          description: "Failed to load chat. Please try again.",
          variant: "destructive"
        });
      }
    };

    initializeChat();
  }, [user.familyTreeId, familyMembers]);

  // Initialize WebRTC service immediately when user is available
  useEffect(() => {
    const initializeWebRTC = async () => {
      if (user && user.familyTreeId) {
        try {
          console.log('🔄 Initializing WebRTC service for user:', user.userId);
          await webrtcService.initialize(user.userId, user.familyTreeId, user.name);
          console.log('✅ WebRTC service initialized successfully');
        } catch (error) {
          console.error('❌ WebRTC initialization failed:', error);
        }
      }
    };

    initializeWebRTC();
  }, [user]);

  // Real-time message polling
  useEffect(() => {
    if (!user || loading) return;

    const pollNewMessages = async () => {
      try {
        const newMessages = await getNewMessages(user.familyTreeId, lastMessageTimestamp);
        
        if (newMessages.length > 0) {
          // Merge updates from server: replace existing by ID, append new ones
          setMessages(prev => {
            const byId = new Map(prev.map(m => [m.id, m] as const));
            for (const incoming of newMessages) {
              // Always prefer server message as source of truth
              byId.set(incoming.id, incoming);
            }
            return Array.from(byId.values());
          });
          setLastMessageTimestamp(newMessages[newMessages.length - 1].timestamp);
          
          // Show notification for new messages
          if (notifications && 'Notification' in window) {
            newMessages.forEach(message => {
              if (message.senderId !== user.userId) {
                new Notification(`${message.senderName}`, {
                  body: message.content,
                  icon: '/favicon.ico'
                });
              }
            });
          }
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    };

    const interval = setInterval(pollNewMessages, 2000);
    return () => clearInterval(interval);
  }, [user, lastMessageTimestamp, loading, notifications]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const messageData = {
        familyId: user.familyTreeId,
        senderId: user.userId,
        senderName: user.name,
        content: messageContent,
        status: 'sending' as const,
        messageType: 'text' as const
      };

      // Optimistically add message
      const tempMessage: ChatMessage = {
        ...messageData,
        id: `temp_${Date.now()}`,
        timestamp: new Date(),
        readBy: [],
        isDeleted: false
      };
      setMessages(prev => [...prev, tempMessage]);

      // Send to server
      const sentMessageRaw = await sendMessage(messageData);
      const sentMessage = {
        ...sentMessageRaw,
        status: sentMessageRaw.status && sentMessageRaw.status !== 'sending' ? sentMessageRaw.status : 'sent'
      };

      // Replace temp message with server response and remove any duplicate
      setMessages(prev => {
        // Remove any existing entry with the server ID and the temp ID, then add the server one
        const filtered = prev.filter(m => m.id !== tempMessage.id && m.id !== sentMessage.id);
        return [...filtered, sentMessage];
      });
      // Advance last seen timestamp to avoid re-fetching the message we just sent
      setLastMessageTimestamp(sentMessage.timestamp);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Message failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    const toAdd = emoji?.native || '';
    setNewMessage(prev => prev + toAdd);
  };

  const formatMessageTime = (timestamp: Date): string => {
    if (isToday(timestamp)) {
      return format(timestamp, 'HH:mm');
    } else if (isYesterday(timestamp)) {
      return `Yesterday ${format(timestamp, 'HH:mm')}`;
    } else {
      return format(timestamp, 'MMM dd, HH:mm');
    }
  };

  const getOnlineStatus = (userId: string): boolean => {
    return onlineMembers.includes(userId);
  };

  const handleStartCall = async (callType: 'voice' | 'video') => {
    try {
      // First check if permissions are available
      console.log(`📞 Starting ${callType} call to family`);
      
      // Test media access first
      const hasAccess = await webrtcService.testMediaAccess(callType);
      if (!hasAccess) {
        // Show permission helper if access failed
        setShowPermissionHelper(true);
        toast({
          title: "Media Access Required",
          description: `Please grant ${callType === 'video' ? 'camera and microphone' : 'microphone'} access to start the call.`,
          variant: "destructive"
        });
        return;
      }

      const familyMemberIds = familyMembers.map(member => member.userId || member.id);
      const result = await webrtcService.startCall(familyMemberIds, callType, user.name, user.familyTreeId);
      
      if (typeof result === 'object' && (result as any)?.blocked) {
        toast({
          title: "Call Blocked",
          description: "Another family call is already in progress. Please wait for it to end.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: `${callType} call started`,
        description: "Calling family members...",
      });
    } catch (error: any) {
      console.error('❌ Failed to start call:', error);
      
      // Check if it's a permission error
      if (error.message?.includes('Permission') || error.message?.includes('denied') || error.message?.includes('access')) {
        setShowPermissionHelper(true);
        toast({
          title: "Permission Required",
          description: "Please grant media permissions to start the call.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Call failed",
          description: error.message || "Failed to start call. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading Family Chat</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Connecting to your family...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Enhanced Chat Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
        <div className="flex items-center space-x-3">
          {/* Back Button */}
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            size="sm"
            className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-blue-500/20">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                  <Users className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{user.familyTreeId} Family</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                {familyMembers.length} members
                {onlineMembers.length > 0 && (
                  <span className="ml-2 text-green-500 font-medium">
                    • {onlineMembers.length} online
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Professional Call Buttons */}
          <Button
            onClick={() => handleStartCall('voice')}
            variant="ghost"
            size="sm"
            className="bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/20 rounded-full p-3 transition-all duration-200 hover:scale-105"
            title="Voice call"
          >
            <Phone className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={() => handleStartCall('video')}
            variant="ghost"
            size="sm"
            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full p-3 transition-all duration-200 hover:scale-105"
            title="Video call"
          >
            <Video className="h-4 w-4" />
          </Button>

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full p-3 hover:bg-gray-100 dark:hover:bg-gray-700">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
              <DropdownMenuItem className="hover:bg-gray-100/50 dark:hover:bg-gray-700/50">
                <Search className="h-4 w-4 mr-2" />
                Search Messages
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-gray-100/50 dark:hover:bg-gray-700/50">
                <Users className="h-4 w-4 mr-2" />
                View Family Members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowPermissionHelper(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Setup Media Permissions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    {notifications ? (
                      <Bell className="h-4 w-4 mr-2" />
                    ) : (
                      <BellOff className="h-4 w-4 mr-2" />
                    )}
                    Notifications
                  </div>
                  <Switch
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    {theme === 'dark' ? (
                      <Moon className="h-4 w-4 mr-2" />
                    ) : (
                      <Sun className="h-4 w-4 mr-2" />
                    )}
                    Dark Mode
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Professional Full-Screen Messages Area */}
      <ScrollArea className="flex-1 px-4 lg:px-8 xl:px-16 py-4 bg-gradient-to-b from-transparent to-white/30 dark:to-gray-800/30">
        <div className="space-y-4 w-full">
          {messages.map((message) => {
            const isOwn = message.senderId === user.userId;
            const isSystem = message.messageType === 'system';

            if (isSystem) {
              return (
                <div key={message.id} className="text-center my-8">
                  <div className="inline-block bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-gray-700 dark:text-gray-200 text-base px-6 py-3 rounded-2xl border border-blue-500/30 backdrop-blur-md shadow-lg">
                    {message.content}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
                    {formatMessageTime(message.timestamp)}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-6`}
              >
                <div className={`flex items-end space-x-3 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isOwn && (
                    <Avatar className="h-10 w-10 ring-2 ring-white/60 shadow-lg flex-shrink-0">
                      <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                        {message.senderName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`space-y-2 ${isOwn ? 'items-end flex flex-col' : 'items-start flex flex-col'}`}>
                    {!isOwn && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold px-4">
                        {message.senderName}
                      </p>
                    )}
                    
                    <div
                      className={`px-6 py-4 rounded-3xl shadow-lg relative transition-all duration-200 hover:shadow-xl inline-block max-w-lg ${
                        isOwn
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-lg'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200/60 dark:border-gray-600/60 rounded-bl-lg'
                      }`}
                      style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word'
                      }}
                    >
                      <p className="text-base leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
                      
                      {/* Message tail/pointer */}
                      <div className={`absolute bottom-0 w-0 h-0 ${
                        isOwn 
                          ? 'right-0 border-l-[12px] border-l-blue-600 border-t-[12px] border-t-transparent'
                          : 'left-0 border-r-[12px] border-r-white dark:border-r-gray-700 border-t-[12px] border-t-transparent'
                      }`}></div>
                    </div>
                    
                    <div className={`flex items-center space-x-2 px-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {formatMessageTime(message.timestamp)}
                      </p>
                      {isOwn && (
                        <Badge variant="outline" className="text-xs bg-white/80 dark:bg-gray-800/80">
                          {message.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {isOwn && (
                    <Avatar className="h-10 w-10 ring-2 ring-blue-500/30 shadow-lg flex-shrink-0">
                      <AvatarFallback className="text-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold">
                        {user.name?.charAt(0).toUpperCase() || 'M'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            );
          })}
          
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="h-12 w-12 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to your family chat!
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-lg max-w-md mx-auto">
                Start a conversation with your family members. Share moments, memories, and stay connected.
              </p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Enhanced Full-Screen Message Input */}
      <div className="p-6 lg:p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-t border-gray-200/60 dark:border-gray-700/60 shadow-lg">
        <div className="flex items-center space-x-4 w-full max-w-7xl mx-auto">
          <Button variant="ghost" size="lg" className="rounded-full p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105">
            <Paperclip className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </Button>
          
          <div className="flex-1 relative" ref={emojiPickerRef}>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="pr-14 py-4 text-base rounded-3xl border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 shadow-inner"
            />
            <Button
              type="button"
              onClick={() => setShowEmojiPicker(v => !v)}
              variant="ghost"
              size="lg"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
              aria-label="Toggle emoji picker"
            >
              <Smile className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Button>
            {showEmojiPicker && (
              <div className="absolute bottom-14 right-0 z-50">
                <Picker data={data} onEmojiSelect={handleEmojiSelect} theme={theme === 'dark' ? 'dark' : 'light'} previewPosition="none" />
              </div>
            )}
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="lg"
            className={`rounded-full p-4 transition-all duration-200 ${
              newMessage.trim() 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:scale-105 shadow-lg hover:shadow-xl' 
                : 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Media Permission Helper */}
      {showPermissionHelper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Setup Media Permissions</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPermissionHelper(false)}
              >
                ✕
              </Button>
            </div>
            <div className="p-0">
              <MediaPermissionHelper
                callType="video"
                onPermissionsGranted={() => {
                  setShowPermissionHelper(false);
                  toast({
                    title: "Permissions Granted!",
                    description: "You can now make video calls.",
                  });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
