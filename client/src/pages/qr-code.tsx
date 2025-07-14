import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, QrCode, Copy, ExternalLink } from "lucide-react";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { useToast } from "@/hooks/use-toast";

export default function QRCodePage() {
  const { toast } = useToast();
  const appUrl = "https://e537d7f5-b883-43fe-b64c-44c5c6138301-00-3ipw3bmo8u42i.janeway.replit.dev";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      toast({
        title: "Copied!",
        description: "App URL copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-6 h-6" />
              Mobile App Installation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Scan the QR code below with your phone's camera to access and install the School Bus Route Manager app.
            </p>
            <Button onClick={() => window.location.href = "/"} variant="outline">
              Back to App
            </Button>
          </CardContent>
        </Card>

        {/* QR Code Display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Scan to Install PWA</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <QRCodeGenerator url={appUrl} size={300} className="mx-auto" />
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">App URL:</p>
              <p className="text-xs text-gray-600 break-all mb-3">{appUrl}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={copyToClipboard} size="sm" variant="outline">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy URL
                </Button>
                <Button 
                  onClick={() => window.open(appUrl, '_blank')} 
                  size="sm" 
                  variant="outline"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Installation Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Installation Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              
              {/* iPhone Instructions */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-blue-900">iPhone/iPad (Safari)</h3>
                <ol className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>1. Scan QR code or open link in Safari</li>
                  <li>2. Tap the Share button (square with arrow)</li>
                  <li>3. Scroll down and tap "Add to Home Screen"</li>
                  <li>4. Tap "Add" to install the app</li>
                </ol>
              </div>

              {/* Android Instructions */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-medium text-green-900">Android (Chrome)</h3>
                <ol className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>1. Scan QR code or open link in Chrome</li>
                  <li>2. Look for "Install App" button or banner</li>
                  <li>3. Or tap menu (3 dots) → "Add to Home screen"</li>
                  <li>4. Tap "Install" or "Add" to complete</li>
                </ol>
              </div>

              {/* Login Credentials */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-medium text-purple-900">Login Credentials</h3>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <div><strong>Admin:</strong> ma1313 / Dietdew13!</div>
                  <div><strong>Driver:</strong> DeShaun / Password123</div>
                  <div><strong>Business:</strong> tnt-gymnastics</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PWA Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              App Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-3 border rounded">
                <Smartphone className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <h4 className="font-medium">Native App Experience</h4>
                <p className="text-xs text-gray-600">Full-screen, app-like interface</p>
              </div>
              <div className="text-center p-3 border rounded">
                <Download className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <h4 className="font-medium">Offline Support</h4>
                <p className="text-xs text-gray-600">Works without internet connection</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}