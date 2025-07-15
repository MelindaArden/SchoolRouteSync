import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExpoLauncher() {
  const [isStarting, setIsStarting] = useState(false);
  const [output, setOutput] = useState('');

  const startExpoServer = async () => {
    setIsStarting(true);
    setOutput('Starting Expo development server...\n');
    
    try {
      const response = await fetch('/api/start-expo', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.text();
        setOutput(prev => prev + data);
      } else {
        setOutput(prev => prev + 'Error starting Expo server\n');
      }
    } catch (error) {
      setOutput(prev => prev + `Error: ${error}\n`);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Route Runner Mobile App Launcher</CardTitle>
          <CardDescription>
            Start the Expo development server to get a QR code for your mobile app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Quick Access Options:</h3>
            
            <div className="grid gap-4">
              <Card className="border-blue-200">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-blue-700">Web App (Ready Now)</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Use Route Runner directly in your browser:
                  </p>
                  <a 
                    href="https://e537d7f5-b883-43fe-b64c-44c5c6138301-00-3ipw3bmo8u42i.janeway.replit.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline break-all"
                  >
                    https://e537d7f5-b883-43fe-b64c-44c5c6138301-00-3ipw3bmo8u42i.janeway.replit.dev
                  </a>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-green-700">Mobile App (Expo Go)</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Start development server for mobile testing:
                  </p>
                  <Button 
                    onClick={startExpoServer} 
                    disabled={isStarting}
                    className="w-full"
                  >
                    {isStarting ? 'Starting...' : 'Start Expo Server & Generate QR Code'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {output && (
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
              {output}
            </div>
          )}

          <div className="text-sm text-gray-600">
            <h4 className="font-semibold mb-2">Login Credentials:</h4>
            <ul className="space-y-1">
              <li><strong>Admin:</strong> ma1313 / Dietdew13!</li>
              <li><strong>Driver:</strong> ChadW / Password123</li>
              <li><strong>Driver:</strong> DeShaun / Password123</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}