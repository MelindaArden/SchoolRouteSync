import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { User } from "@/lib/types";
import { Bus, Bell, Menu, X, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  recipientId: number;
  sessionId?: number;
  studentId?: number;
  isRead: boolean;
  createdAt: string;
}

interface NavigationProps {
  user: User;
  onLogout: () => void;
  role: "driver" | "leadership";
}

export default function Navigation({ user, onLogout, role }: NavigationProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch user notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ['/api/users', user.id, 'notifications'],
    queryFn: () => fetch(`/api/users/${user.id}/notifications`).then(res => res.json()),
    refetchInterval: 5000, // Refetch every 5 seconds to keep notifications current
    staleTime: 0, // Always consider data stale to force fresh fetches
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => 
      fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => 
      fetch(`/api/users/${user.id}/notifications/mark-all-read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'notifications'] });
    }
  });

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: Notification) => !n.isRead).length : 0;

  return (
    <header className="bg-primary text-white shadow-lg sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Bus className="h-6 w-6" />
          <h1 className="text-xl font-medium">Route Runner</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchNotifications(); // Force refresh notifications
              setShowNotifications(true);
            }}
            className="text-white hover:text-gray-200 relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:text-gray-200">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Signed in as</p>
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-gray-600">{user.role}</p>
                </div>
                <Button onClick={onLogout} variant="destructive" className="w-full">
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Notifications Modal */}
      {showNotifications && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setShowNotifications(false)}
        >
          <div className="flex items-end justify-center min-h-screen">
            <div 
              className="bg-white rounded-t-lg w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Notifications</h3>
                {notifications.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                  >
                    Mark All Read
                  </Button>
                )}
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification: Notification) => (
                    <div key={notification.id} className={`border rounded-lg p-3 relative ${
                      notification.isRead ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="pr-8">
                        <p className="text-sm font-medium text-gray-800">{notification.title || 'System Alert'}</p>
                        <p className="text-xs text-gray-600">{notification.message || 'No details available'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                        {notification.type && (
                          <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${
                            notification.type === 'urgent' ? 'bg-red-100 text-red-800' :
                            notification.type === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                        onClick={() => deleteNotificationMutation.mutate(notification.id)}
                        disabled={deleteNotificationMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              
              <Button 
                onClick={() => setShowNotifications(false)}
                className="w-full mt-4 bg-primary"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
