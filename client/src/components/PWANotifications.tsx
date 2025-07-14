import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function PWANotifications() {
  const { toast } = useToast();

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && 'serviceWorker' in navigator) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('PWA Notifications enabled');
        } else {
          console.log('PWA Notifications denied');
        }
      });
    }

    // Listen for push messages
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'notification') {
        toast({
          title: event.data.title || 'School Bus Routes',
          description: event.data.body || 'New notification',
        });
      }
    });

    // PWA install success detection
    window.addEventListener('appinstalled', () => {
      toast({
        title: 'App Installed Successfully!',
        description: 'School Bus Route Manager is now available on your home screen',
      });
    });

    // Network status for offline capability
    const handleOnline = () => {
      toast({
        title: 'Back Online',
        description: 'Connection restored. Data will sync automatically.',
      });
    };

    const handleOffline = () => {
      toast({
        title: 'Working Offline',
        description: 'Some features may be limited until connection is restored.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  return null; // This component only handles notifications
}