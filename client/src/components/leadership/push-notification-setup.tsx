import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, CheckCircle, AlertCircle } from 'lucide-react';

export function PushNotificationSetup() {
  const {
    isSupported,
    permission,
    requestPermission,
    canNotify
  } = usePushNotifications({ enabled: true });

  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      console.log('Attempting to enable notifications...');
      
      if (!('Notification' in window)) {
        alert('This browser does not support notifications');
        return;
      }

      console.log('Current permission:', Notification.permission);
      
      if (Notification.permission === 'denied') {
        alert('Notifications are blocked. To enable them:\n\n1. Click the lock/info icon in the address bar\n2. Set notifications to "Allow"\n3. Refresh the page and try again\n\nOr check your browser settings under Privacy & Security > Notifications');
        return;
      }
      
      if (Notification.permission === 'default') {
        console.log('Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('Permission result:', permission);
        
        if (permission === 'granted') {
          console.log('Permission granted! Testing notification...');
          new Notification('School Bus Notifications Enabled', {
            body: 'You will now receive real-time updates about routes and pickups.',
            icon: '/favicon.ico',
            tag: 'test-notification'
          });
        } else {
          alert('Notification permission was denied. You can enable it later in your browser settings.');
        }
      } else if (Notification.permission === 'granted') {
        console.log('Permission already granted, testing notification...');
        new Notification('Notifications Working', {
          body: 'Push notifications are enabled and working correctly!',
          icon: '/favicon.ico',
          tag: 'test-notification'
        });
      }
      
      // Also use the hook method as backup  
      try {
        const granted = await requestPermission();
        if (granted) {
          console.log('Push notifications enabled successfully via hook');
        }
      } catch (hookError) {
        console.log('Hook method failed, but direct method may have worked');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusBadge = () => {
    if (!isSupported) {
      return <Badge variant="destructive">Not Supported</Badge>;
    }
    
    switch (permission) {
      case 'granted':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Enabled</Badge>;
      case 'denied':
        return <Badge variant="destructive"><BellOff className="h-3 w-3 mr-1" />Blocked</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Not Set</Badge>;
    }
  };

  const getInstructions = () => {
    if (!isSupported) {
      return "Your browser doesn't support push notifications. Try using Chrome, Firefox, or Safari.";
    }

    switch (permission) {
      case 'granted':
        return "Push notifications are enabled! You'll receive alerts when drivers submit maintenance requests or report issues.";
      case 'denied':
        return "Notifications are blocked. Please click the notification icon in your browser's address bar to enable them.";
      default:
        return "Enable push notifications to get instant alerts when drivers need assistance.";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Get instant browser alerts for driver maintenance requests and issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {getInstructions()}
        </p>
        
        {/* Debug info for development */}
        <div className="text-xs text-gray-400 border-t pt-2">
          Browser Support: {isSupported ? 'Yes' : 'No'} | 
          Permission: {permission} | 
          Can Notify: {canNotify ? 'Yes' : 'No'}
        </div>
        
        {isSupported && permission !== 'granted' && (
          <Button 
            onClick={handleEnableNotifications}
            disabled={isRequesting}
            className="w-full"
          >
            {isRequesting ? 'Requesting Permission...' : 
             permission === 'denied' ? 'Try Enable Again' : 'Enable Push Notifications'}
          </Button>
        )}

        {canNotify && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-3">
            <div>
              <p className="text-sm text-green-800">
                ✓ Push notifications are active. You'll receive instant alerts for:
              </p>
              <ul className="text-xs text-green-700 mt-2 space-y-1">
                <li>• Van maintenance requests</li>
                <li>• Driver issue reports</li>
                <li>• Urgent priority alerts</li>
              </ul>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                if ('showNotification' in window) {
                  (window as any).showNotification('Test Notification', {
                    body: 'Push notifications are working correctly!',
                    icon: '/favicon.ico'
                  });
                } else {
                  new Notification('Test Notification', {
                    body: 'Push notifications are working correctly!',
                    icon: '/favicon.ico'
                  });
                }
              }}
              className="w-full text-green-700 border-green-300 hover:bg-green-100"
            >
              Test Notification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}