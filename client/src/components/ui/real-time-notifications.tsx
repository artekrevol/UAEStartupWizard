import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Bell, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { 
  Popover,
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export function RealTimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Initialize WebSocket connection
  const { status, addMessageHandler, subscribeToNotifications } = useWebSocket({
    onOpen: () => {
      console.log('WebSocket connection established');
      
      // Subscribe to notifications if user is logged in
      if (user) {
        subscribeToNotifications(user.id);
      }
    },
    onClose: () => {
      console.log('WebSocket connection closed');
    }
  });

  // Subscribe to user-specific notifications when user changes
  useEffect(() => {
    if (status === 'connected' && user) {
      subscribeToNotifications(user.id);
    }
  }, [status, user, subscribeToNotifications]);

  // Handle incoming notifications
  useEffect(() => {
    if (!user) return;
    
    // Set up notification handler
    const removeHandler = addMessageHandler('notification', (data) => {
      if (!data || !data.notification) return;
      
      const newNotification: Notification = {
        id: data.notification.id || `notification-${Date.now()}`,
        type: data.notification.type || 'info',
        title: data.notification.title || 'Notification',
        message: data.notification.message || '',
        timestamp: data.notification.timestamp || Date.now(),
        read: false
      };
      
      setNotifications(prev => [newNotification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      
      // Show toast for real-time feedback
      toast({
        title: newNotification.title,
        description: newNotification.message,
        variant: newNotification.type === 'error' ? 'destructive' : 'default'
      });
    });
    
    return () => {
      removeHandler();
    };
  }, [user, addMessageHandler, toast]);

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    setUnreadCount(0);
  };

  // Mark a single notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    setUnreadCount(prev => Math.max(prev - 1, 0));
  };

  // Get icon based on notification type
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-accent">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs min-w-4 h-4 flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-medium">Notifications</h4>
          {notifications.length > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-4 hover:bg-accent cursor-pointer ${!notification.read ? 'bg-muted/50' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t text-center">
          <div className="text-xs text-muted-foreground">
            {status === 'connected' ? (
              <span className="flex items-center justify-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Connected
              </span>
            ) : status === 'connecting' ? (
              <span className="flex items-center justify-center gap-1">
                <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
                Connecting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                Disconnected
              </span>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}