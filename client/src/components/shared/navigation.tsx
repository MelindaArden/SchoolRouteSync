import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { User } from "@/lib/types";
import { Bus, Bell, Menu } from "lucide-react";

interface NavigationProps {
  user: User;
  onLogout: () => void;
  role: "driver" | "leadership";
}

export default function Navigation({ user, onLogout, role }: NavigationProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch user notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/users', user.id, 'notifications'],
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <header className="bg-primary text-white shadow-lg sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Bus className="h-6 w-6" />
          <h1 className="text-xl font-medium">SchoolRide</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotifications(true)}
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
              <h3 className="text-lg font-medium text-gray-800 mb-4">Notifications</h3>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification: any) => (
                    <div key={notification.id} className="bg-gray-50 border rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-800">{notification.title}</p>
                      <p className="text-xs text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleTimeString()}
                      </p>
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
