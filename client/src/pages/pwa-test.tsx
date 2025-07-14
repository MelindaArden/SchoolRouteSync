import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Smartphone, Download, Globe, Wifi, WifiOff } from "lucide-react";
import { PWAInstallButton } from "@/components/PWAInstallButton";

export default function PWATest() {
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<string>("checking");
  const [manifestStatus, setManifestStatus] = useState<string>("checking");
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  useEffect(() => {
    // Check Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          setServiceWorkerStatus("registered");
          console.log("Service Worker registered:", registration);
        } else {
          setServiceWorkerStatus("not-registered");
        }
      }).catch(() => {
        setServiceWorkerStatus("error");
      });
    } else {
      setServiceWorkerStatus("not-supported");
    }

    // Check Manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      fetch('/manifest.json')
        .then((response) => {
          if (response.ok) {
            setManifestStatus("available");
          } else {
            setManifestStatus("not-found");
          }
        })
        .catch(() => {
          setManifestStatus("error");
        });
    } else {
      setManifestStatus("not-linked");
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPromptAvailable(true);
    };

    // Listen for online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const testNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        new Notification('PWA Test', {
          body: 'Push notifications are working!',
          icon: '/pwa-icon-192.png'
        });
      }
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "registered" || status === "available" || status === "granted") {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (status: string, successValue: string) => {
    const variant = status === successValue ? "default" : "destructive";
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-6 h-6" />
              PWA Installation Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This page tests all PWA functionality including service worker registration, 
              manifest availability, install prompt, and push notifications.
            </p>
            <div className="flex gap-4">
              <PWAInstallButton />
              <Button onClick={() => window.location.href = "/"} variant="outline">
                Back to App
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PWA Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Service Worker Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(serviceWorkerStatus)}
                Service Worker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Status:</span>
                  {getStatusBadge(serviceWorkerStatus, "registered")}
                </div>
                <div className="flex justify-between">
                  <span>Support:</span>
                  <Badge variant={'serviceWorker' in navigator ? "default" : "destructive"}>
                    {'serviceWorker' in navigator ? "supported" : "not-supported"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manifest Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(manifestStatus)}
                Web App Manifest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Status:</span>
                  {getStatusBadge(manifestStatus, "available")}
                </div>
                <div className="flex justify-between">
                  <span>Link:</span>
                  <Badge variant={document.querySelector('link[rel="manifest"]') ? "default" : "destructive"}>
                    {document.querySelector('link[rel="manifest"]') ? "linked" : "not-linked"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installation Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Installation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Installed:</span>
                  <Badge variant={isInstalled ? "default" : "secondary"}>
                    {isInstalled ? "yes" : "no"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Install Prompt:</span>
                  <Badge variant={installPromptAvailable ? "default" : "secondary"}>
                    {installPromptAvailable ? "available" : "not-available"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Network Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isOnline ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-red-500" />}
                Network Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <Badge variant={isOnline ? "default" : "destructive"}>
                    {isOnline ? "online" : "offline"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Notifications:</span>
                  {getStatusBadge(notificationPermission, "granted")}
                </div>
                <Button onClick={testNotifications} size="sm" className="w-full mt-2">
                  Test Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PWA Features Test */}
        <Card>
          <CardHeader>
            <CardTitle>PWA Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded">
                <Globe className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-medium">Offline Support</h3>
                <p className="text-sm text-gray-600">Service worker caches resources</p>
              </div>
              <div className="text-center p-4 border rounded">
                <Smartphone className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-medium">Home Screen Install</h3>
                <p className="text-sm text-gray-600">Add to home screen capability</p>
              </div>
              <div className="text-center p-4 border rounded">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <h3 className="font-medium">App-like Experience</h3>
                <p className="text-sm text-gray-600">Standalone display mode</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Browser Info */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>User Agent:</strong> {navigator.userAgent}</div>
              <div><strong>Platform:</strong> {navigator.platform}</div>
              <div><strong>Language:</strong> {navigator.language}</div>
              <div><strong>Online:</strong> {navigator.onLine ? "Yes" : "No"}</div>
              <div><strong>Cookies Enabled:</strong> {navigator.cookieEnabled ? "Yes" : "No"}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}