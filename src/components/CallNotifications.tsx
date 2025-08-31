import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface CallNotification {
  id: string;
  type: 'call-started' | 'call-ended' | 'call-missed' | 'member-joined' | 'member-left';
  callerName: string;
  callType: 'voice' | 'video';
  timestamp: Date;
  duration?: string;
}

interface CallNotificationsProps {
  className?: string;
}

export const CallNotifications: React.FC<CallNotificationsProps> = ({ className }) => {
  const [notifications, setNotifications] = useState<CallNotification[]>([]);

  const addNotification = (notification: Omit<CallNotification, 'id' | 'timestamp'>) => {
    const newNotification: CallNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep only 5 most recent

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Expose function globally for other components to use
  useEffect(() => {
    (window as any).addCallNotification = addNotification;
    return () => {
      delete (window as any).addCallNotification;
    };
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className={cn("fixed top-4 right-4 z-40 space-y-2", className)}>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={cn(
            "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-72 max-w-80",
            "transform transition-all duration-300 ease-out animate-in slide-in-from-right-5",
            "hover:shadow-xl"
          )}
        >
          <div className="flex items-start space-x-3">
            {/* Icon */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              notification.type === 'call-started' ? "bg-green-100 text-green-600" :
              notification.type === 'call-ended' ? "bg-gray-100 text-gray-600" :
              notification.type === 'call-missed' ? "bg-red-100 text-red-600" :
              "bg-blue-100 text-blue-600"
            )}>
              {notification.type.includes('call') ? (
                <Phone className="h-4 w-4" />
              ) : (
                <Users className="h-4 w-4" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {notification.callerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {notification.callerName}
                </span>
              </div>
              
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {notification.type === 'call-started' && `Started a ${notification.callType} call`}
                {notification.type === 'call-ended' && `Call ended${notification.duration ? ` (${notification.duration})` : ''}`}
                {notification.type === 'call-missed' && `Missed ${notification.callType} call`}
                {notification.type === 'member-joined' && `Joined the call`}
                {notification.type === 'member-left' && `Left the call`}
              </p>
              
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {/* Close button */}
            <Button
              onClick={() => removeNotification(notification.id)}
              variant="ghost"
              size="sm"
              className="flex-shrink-0 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper function to add notifications from anywhere in the app
export const addCallNotification = (notification: Omit<CallNotification, 'id' | 'timestamp'>) => {
  if ((window as any).addCallNotification) {
    (window as any).addCallNotification(notification);
  }
};

export default CallNotifications;
