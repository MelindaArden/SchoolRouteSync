import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Smartphone, Wifi, Database } from "lucide-react";

export default function MobileTest() {
  const [loginResult, setLoginResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    // Run diagnostic tests on page load
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const results: any = {};
    
    // Test 1: Browser capabilities
    results.browser = {
      userAgent: navigator.userAgent,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      isIOS: /iPhone|iPad/.test(navigator.userAgent),
      localStorage: typeof(Storage) !== "undefined"
    };

    // Test 2: Network connectivity
    try {
      const response = await fetch('/api/session', { credentials: 'include' });
      results.network = {
        status: response.status,
        ok: response.ok,
        reachable: true
      };
    } catch (error) {
      results.network = {
        reachable: false,
        error: String(error)
      };
    }

    // Test 3: Authentication state
    const storedUser = localStorage.getItem('user');
    const authToken = localStorage.getItem('authToken');
    results.auth = {
      hasStoredUser: !!storedUser,
      hasAuthToken: !!authToken,
      userData: storedUser ? JSON.parse(storedUser) : null
    };

    setTestResults(results);
  };

  const testMobileLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: 'ma1313',
          password: 'Dietdew13!',
          businessName: 'tnt-gymnastics'
        })
      });

      const result = await response.json();
      setLoginResult({ success: response.ok, data: result, status: response.status });

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(result));
        if (result.authToken) {
          localStorage.setItem('authToken', result.authToken);
        }
      }
    } catch (error) {
      setLoginResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const clearStorage = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('mobileToken');
    setLoginResult(null);
    runDiagnostics();
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-6 w-6" />
            Mobile Login Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Button onClick={runDiagnostics} variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Run Diagnostics
            </Button>
            <Button onClick={testMobileLogin} disabled={loading}>
              {loading ? "Testing..." : "Test Driver Login (ma1313)"}
            </Button>
            <Button onClick={clearStorage} variant="outline">
              Clear Storage
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Browser Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Browser Information</CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.browser && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {testResults.browser.isMobile ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Mobile Device: {testResults.browser.isMobile ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.browser.cookiesEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Cookies: {testResults.browser.cookiesEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.browser.localStorage ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>LocalStorage: {testResults.browser.localStorage ? 'Available' : 'Not Available'}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                User Agent: {testResults.browser.userAgent}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Network Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Network Status</CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.network && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {testResults.network.reachable ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Server Reachable: {testResults.network.reachable ? 'Yes' : 'No'}</span>
              </div>
              {testResults.network.status && (
                <div>Status: {testResults.network.status}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authentication Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.auth && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {testResults.auth.hasStoredUser ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Stored User: {testResults.auth.hasStoredUser ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.auth.hasAuthToken ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Auth Token: {testResults.auth.hasAuthToken ? 'Yes' : 'No'}</span>
              </div>
              {testResults.auth.userData && (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <div>User: {testResults.auth.userData.username}</div>
                  <div>Role: {testResults.auth.userData.role}</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login Test Results */}
      {loginResult && (
        <Card>
          <CardHeader>
            <CardTitle>Login Test Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {loginResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Login: {loginResult.success ? 'Successful' : 'Failed'}</span>
                <Badge variant={loginResult.success ? "default" : "destructive"}>
                  {loginResult.status}
                </Badge>
              </div>
              {loginResult.data && (
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(loginResult.data, null, 2)}
                </pre>
              )}
              {loginResult.error && (
                <div className="text-red-600 text-sm">
                  Error: {loginResult.error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">Instructions:</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Run diagnostics to check your device compatibility</li>
          <li>Test the mobile login functionality</li>
          <li>If login works but you can't access the app, try refreshing the page</li>
          <li>Use credentials: ma1313 / Dietdew13! / tnt-gymnastics</li>
        </ol>
      </div>
    </div>
  );
}