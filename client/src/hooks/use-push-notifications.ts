import { useEffect, useState } from 'react';

interface PushNotificationOptions {
  enabled: boolean;
  onNotificationClick?: (data: any) => void;
}

export function usePushNotifications(options: PushNotificationOptions) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Browser does not support notifications');
      return false;
    }

    try {
      console.log('Requesting notification permission...');
      
      // For older browsers that don't support promise-based API
      if (typeof Notification.requestPermission === 'function') {
        const result = Notification.requestPermission();
        
        // Handle both callback and promise-based APIs
        const permission = await (result instanceof Promise ? result : Promise.resolve(result));
        
        console.log('Permission result:', permission);
        setPermission(permission);
        return permission === 'granted';
      } else {
        console.error('Notification.requestPermission is not available');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const showNotification = (title: string, options?: NotificationOptions & { onNotificationClick?: (data: any) => void }) => {
    if (!isSupported || permission !== 'granted') {
      return null;
    }

    const { onNotificationClick, ...notificationOptions } = options || {};

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: true,
      ...notificationOptions
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      onNotificationClick?.(options?.data);
    };

    // Auto-close after 10 seconds if not clicked
    setTimeout(() => {
      notification.close();
    }, 10000);

    return notification;
  };

  const showDriverAlert = (issueData: any) => {
    const title = `${issueData.priority?.toUpperCase() || 'ALERT'}: Driver Issue`;
    const body = `${issueData.driver?.firstName} ${issueData.driver?.lastName}: ${issueData.title}`;
    
    return showNotification(title, {
      body,
      tag: `driver-alert-${issueData.id}`,
      data: issueData,
      onNotificationClick: () => {
        window.focus();
      }
    });
  };

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    showDriverAlert,
    canNotify: permission === 'granted'
  };
}