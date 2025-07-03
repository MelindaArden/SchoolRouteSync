import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function MobileDebug() {
  const [username, setUsername] = useState("ma1313");
  const [password, setPassword] = useState("Dietdew13!");
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const detectEnvironment = () => {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isIOS = /iPhone|iPad/.test(ua);
    
    return {
      userAgent: ua,
      isMobile,
      isSafari,
      isIOS,
      isMobileSafari: isIOS && isSafari,
      cookiesEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      currentUrl: window.location.href
    };
  };

  const testSession = async () => {
    try {
      const response = await fetch("/api/session", {
        credentials: "include"
      });
      const data = await response.json();
      return { status: response.status, data };
    } catch (error) {
      return { error: String(error) };
    }
  };

  const testLogin = async (endpoint: string) => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      return { 
        endpoint,
        status: response.status, 
        success: response.ok,
        data,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      return { 
        endpoint,
        error: String(error) 
      };
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    
    const env = detectEnvironment();
    const sessionBefore = await testSession();
    
    // Test both login endpoints
    const regularLogin = await testLogin("/api/login");
    const sessionAfterRegular = await testSession();
    
    const mobileLogin = await testLogin("/api/mobile-login");
    const sessionAfterMobile = await testSession();

    setDebugInfo({
      environment: env,
      sessionBefore,
      regularLogin,
      sessionAfterRegular,
      mobileLogin,
      sessionAfterMobile,
      timestamp: new Date().toISOString()
    });
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mobile Safari Login Diagnostics</CardTitle>
            <p className="text-sm text-gray-600">
              This page helps diagnose login issues on mobile Safari
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              onClick={runDiagnostics} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Running Diagnostics..." : "Test Login & Session"}
            </Button>
          </CardContent>
        </Card>

        {debugInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Diagnostic Results</CardTitle>
              <Badge variant={debugInfo.environment.isMobileSafari ? "default" : "secondary"}>
                {debugInfo.environment.isMobileSafari ? "Mobile Safari" : "Other Browser"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Environment</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo.environment, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Session Before Login</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo.sessionBefore, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Regular Login (/api/login)</h3>
                  <Badge variant={debugInfo.regularLogin.success ? "default" : "destructive"}>
                    {debugInfo.regularLogin.success ? "Success" : "Failed"}
                  </Badge>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto mt-2">
                    {JSON.stringify(debugInfo.regularLogin, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Session After Regular Login</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo.sessionAfterRegular, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Mobile Login (/api/mobile-login)</h3>
                  <Badge variant={debugInfo.mobileLogin.success ? "default" : "destructive"}>
                    {debugInfo.mobileLogin.success ? "Success" : "Failed"}
                  </Badge>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto mt-2">
                    {JSON.stringify(debugInfo.mobileLogin, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Session After Mobile Login</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo.sessionAfterMobile, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}