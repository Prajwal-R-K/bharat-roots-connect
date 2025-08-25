import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChatMessage, User } from '@/types';
import { format, isToday, isYesterday } from 'date-fns';
import { saveMessage, getRecentMessages, createChatRoom } from '@/lib/mongodb';
import { getFamilyMembers } from '@/lib/neo4j';
import { useToast } from '@/hooks/use-toast';

interface FamilyChatProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  isModal?: boolean; // New prop to determine if it's used as a modal or embedded
}

const FamilyChat: React.FC<FamilyChatProps> = ({ user, isOpen, onClose, isModal = true }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Initialize chat when opened
  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeChat();
    }
  }, [isOpen, isInitialized]);

  const initializeChat = async () => {
    setIsLoading(true);
    try {
      // Get family members
      const members = await getFamilyMembers(user.familyTreeId);
      // Transform the data to match User type
      const transformedMembers = members.map((member: any) => ({
        ...member,
        familyTreeId: user.familyTreeId // Add the missing familyTreeId
      }));
      setFamilyMembers(transformedMembers);

      // Create or get chat room
      const memberIds = members.map(member => member.userId);
      await createChatRoom(user.familyTreeId, memberIds);

      // Load recent messages
      await loadMessages();
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      toast({
        title: 'Chat Error',
        description: 'Failed to load chat. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const recentMessages = await getRecentMessages(user.familyTreeId, 50);
      setMessages(recentMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData: ChatMessage = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      familyTreeId: user.familyTreeId,
      senderId: user.userId,
      senderName: user.name,
      message: newMessage.trim(),
      timestamp: new Date(),
      messageType: 'text'
    };

    try {
      // Optimistically add message to UI
      setMessages(prev => [...prev, messageData]);
      setNewMessage('');

      // Save to database
      await saveMessage(messageData);
      
      // Note: In a real implementation, you'd emit this via Socket.IO
      // and other clients would receive it in real-time
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Send Failed',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
      
      // Remove the optimistically added message
      setMessages(prev => prev.filter(msg => msg.messageId !== messageData.messageId));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM dd, yyyy');
    }
  };

  if (!isOpen) return null;

  const messageGroups = groupMessagesByDate(messages);

  const containerClasses = isModal 
    ? "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    : "h-full w-full";
    
  const cardClasses = isModal 
    ? "w-full max-w-4xl h-[600px] flex flex-col"
    : "h-full w-full flex flex-col";

  return (
    <div className={containerClasses}>
      <Card className={cardClasses}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Family Chat</CardTitle>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{familyMembers.length} members</span>
            </Badge>
          </div>
          {isModal && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>

        <Separator />

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(messageGroups).map(([dateKey, dayMessages]) => (
                  <div key={dateKey} className="space-y-3">
                    {/* Date Header */}
                    <div className="flex items-center justify-center">
                      <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {formatDateHeader(dateKey)}
                      </div>
                    </div>

                    {/* Messages for this date */}
                    {dayMessages.map((message, index) => {
                      const isOwnMessage = message.senderId === user.userId;
                      const showAvatar = index === 0 || 
                        dayMessages[index - 1].senderId !== message.senderId;

                      return (
                        <div
                          key={message.messageId || index}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                        >
                          <div className={`flex space-x-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {/* Avatar */}
                            {!isOwnMessage && (
                              <div className={`${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                                    {message.senderName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            )}

                            {/* Message Content */}
                            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                              {/* Sender name for other users */}
                              {!isOwnMessage && showAvatar && (
                                <span className="text-xs text-gray-600 mb-1 px-2">
                                  {message.senderName}
                                </span>
                              )}

                              {/* Message Bubble */}
                              <div
                                className={`px-3 py-2 rounded-lg text-sm ${
                                  isOwnMessage
                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                                }`}
                              >
                                <p className="break-words">{message.message}</p>
                              </div>

                              {/* Timestamp */}
                              <div
                                className={`flex items-center space-x-1 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                                  isOwnMessage ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {formatMessageTime(message.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send • Only family members can see these messages
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyChat;
