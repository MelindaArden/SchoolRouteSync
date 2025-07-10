import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Smartphone, Globe } from "lucide-react";

export default function TMobileTest() {
  const [username, setUsername] = useState("ma1313");
  const [password, setPassword] = useState("Dietdew13!");
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const detectEnvironment = () => {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isIOS = /iPhone|iPad/.test(ua);
    const isTMobile = ua.includes('T-Mobile');
    
    return {
      userAgent: ua,
      isMobile,
      isSafari,
      isIOS,
      isMobileSafari: isIOS && isSafari,
      isTMobile,
      cookiesEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      currentUrl: window.location.href,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      isDeployment: window.location.hostname.includes('.replit.app') || window.location.hostname.includes('.replit.dev')
    };
  };

  const testEndpoint = async (endpoint: string, label: string) => {
    try {
      console.log(`Testing ${label} (${endpoint})...`);
      
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
        label,
        endpoint,
        status: response.status, 
        success: response.ok,
        data,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { 
        label,
        endpoint,
        error: String(error),
        timestamp: new Date().toISOString()
      };
    }
  };

  const testSession = async () => {
    try {
      const response = await fetch("/api/session", {
        credentials: "include"
      });
      const data = await response.json();
      return { 
        status: response.status, 
        success: response.ok,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { 
        error: String(error),
        timestamp: new Date().toISOString()
      };
    }
  };

  const runComprehensiveTest = async () => {
    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }

    setLoading(true);
    
    const environment = detectEnvironment();
    console.log("T-Mobile Test Environment:", environment);
    
    // Test sequence for T-Mobile debugging
    const sessionBefore = await testSession();
    const debugTest = await testEndpoint("/api/tmobile-debug", "T-Mobile Debug");
    const mobileLogin = await testEndpoint("/api/mobile-login", "Mobile Login");
    const regularLogin = await testEndpoint("/api/login", "Regular Login");
    const sessionAfter = await testSession();

    const results = {
      environment,
      tests: {
        sessionBefore,
        debugTest,
        mobileLogin,
        regularLogin,
        sessionAfter
      },
      timestamp: new Date().toISOString(),
      recommendations: []
    };

    // Add specific recommendations for T-Mobile
    if (environment.isTMobile) {
      results.recommendations.push("T-Mobile carrier detected - using mobile-optimized login");
      if (!environment.cookiesEnabled) {
        results.recommendations.push("Cookies disabled - may cause login issues");
      }
      if (!environment.onlineStatus) {
        results.recommendations.push("Offline status detected - check internet connection");
      }
    }

    if (mobileLogin.success || regularLogin.success) {
      results.recommendations.push("Login successful - authentication is working");
    } else {
      results.recommendations.push("Both login methods failed - check credentials or network");
    }

    setTestResults(results);
    setLoading(false);
  };

  const getStatusBadge = (test: any) => {
    if (test.error) {
      return <Badge variant="destructive">Error</Badge>;
    }
    return test.success ? 
      <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge> : 
      <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-500 rounded-full p-3">
                <Smartphone className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-medium text-gray-800">
              T-Mobile Safari Login Diagnostics
            </CardTitle>
            <p className="text-gray-600">Comprehensive testing for mobile login issues</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="test-username">Username</Label>
                <Input
                  id="test-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-password">Password</Label>
                <Input
                  id="test-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>
            </div>
            
            <Button
              onClick={runComprehensiveTest}
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Running T-Mobile Tests...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Run Complete Diagnostic</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {testResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Diagnostic Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Environment Info */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Device Environment
                </h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><strong>T-Mobile Device:</strong> {testResults.environment.isTMobile ? "Yes" : "No"}</div>
                    <div><strong>Mobile Safari:</strong> {testResults.environment.isMobileSafari ? "Yes" : "No"}</div>
                    <div><strong>Cookies Enabled:</strong> {testResults.environment.cookiesEnabled ? "Yes" : "No"}</div>
                    <div><strong>Online Status:</strong> {testResults.environment.onlineStatus ? "Online" : "Offline"}</div>
                    <div><strong>Deployment:</strong> {testResults.environment.isDeployment ? "Yes" : "Local"}</div>
                    <div><strong>Protocol:</strong> {testResults.environment.protocol}</div>
                  </div>
                  <div className="mt-2 text-xs break-all">
                    <strong>User Agent:</strong> {testResults.environment.userAgent}
                  </div>
                </div>
              </div>

              {/* Test Results */}
              <div>
                <h3 className="font-medium mb-3">Authentication Tests</h3>
                <div className="space-y-3">
                  {Object.entries(testResults.tests).map(([key, test]: [string, any]) => (
                    <div key={key} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                        {getStatusBadge(test)}
                      </div>
                      
                      <div className="text-sm bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                        <pre>{JSON.stringify(test, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {testResults.recommendations.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Recommendations
                  </h3>
                  <div className="space-y-2">
                    {testResults.recommendations.map((rec: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}