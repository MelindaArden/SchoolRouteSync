import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PWAInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast({
        title: "App Installed!",
        description: "School Bus Route Manager is now available on your home screen",
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstall = async () => {
    if (!installPrompt) {
      toast({
        title: "Install Not Available",
        description: "App install is not available on this device or browser",
        variant: "destructive",
      });
      return;
    }

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        toast({
          title: "Installing App...",
          description: "School Bus Route Manager is being added to your device",
        });
      }
      
      setInstallPrompt(null);
    } catch (error) {
      console.error('Install failed:', error);
      toast({
        title: "Install Failed",
        description: "Unable to install the app. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Don't show button if already installed or no install prompt available
  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Smartphone className="w-4 h-4" />
        App Installed
      </div>
    );
  }

  if (!installPrompt) {
    return null;
  }

  return (
    <Button 
      onClick={handleInstall}
      size="sm"
      variant="outline"
      className="flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      Install App
    </Button>
  );
}