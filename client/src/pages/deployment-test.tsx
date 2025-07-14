import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function DeploymentTest() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loginResult, setLoginResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("ma1313");
  const [password, setPassword] = useState("Dietdew13!");

  const runConnectivityTest = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/deployment-test");
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });
      
      const data = await response.json();
      setLoginResult({
        success: response.ok,
        status: response.status,
        data: data
      });
    } catch (error) {
      setLoginResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Deployment Test Dashboard</h1>
        <p className="text-muted-foreground">
          Test connectivity and authentication for the deployed application
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {/* Connectivity Test */}
        <Card>
          <CardHeader>
            <CardTitle>1. Connectivity Test</CardTitle>
            <CardDescription>
              Test database connection and server status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runConnectivityTest} disabled={loading}>
              {loading ? "Testing..." : "Run Connectivity Test"}
            </Button>
            
            {testResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={testResult.status === 'connected' ? 'default' : 'destructive'}>
                    {testResult.status === 'connected' ? 'Connected' : 'Error'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {testResult.serverTime}
                  </span>
                </div>
                
                {testResult.database && (
                  <div className="space-y-2">
                    <p className="font-medium">Database Status:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Connected: {testResult.database.connected ? '✅' : '❌'}</li>
                      <li>User Count: {testResult.database.userCount}</li>
                      <li>Environment: {testResult.environment}</li>
                    </ul>
                    
                    {testResult.database.availableUsers && (
                      <div className="mt-3">
                        <p className="font-medium text-sm">Available Users:</p>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {testResult.database.availableUsers.map((user: any, index: number) => (
                            <div key={index} className="text-xs p-2 bg-muted rounded">
                              <div className="font-medium">{user.username}</div>
                              <div className="text-muted-foreground">{user.role}</div>
                              <div className="text-xs">Password: {user.hasPassword ? '✅' : '❌'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {testResult.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{testResult.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Login Test */}
        <Card>
          <CardHeader>
            <CardTitle>2. Authentication Test</CardTitle>
            <CardDescription>
              Test login functionality with provided credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            </div>
            
            <Button onClick={testLogin} disabled={loading}>
              {loading ? "Testing Login..." : "Test Login"}
            </Button>
            
            {loginResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={loginResult.success ? 'default' : 'destructive'}>
                    {loginResult.success ? 'Login Success' : 'Login Failed'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Status: {loginResult.status}
                  </span>
                </div>
                
                {loginResult.success && loginResult.data && (
                  <div className="space-y-2">
                    <p className="font-medium">User Data:</p>
                    <div className="text-sm space-y-1">
                      <div>Username: {loginResult.data.username}</div>
                      <div>Role: {loginResult.data.role}</div>
                      <div>User ID: {loginResult.data.id}</div>
                      <div>Auth Token: {loginResult.data.authToken ? '✅ Created' : '❌ Missing'}</div>
                      {loginResult.data.debug && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <div>Session ID: {loginResult.data.debug.sessionId}</div>
                          <div>Login Method: {loginResult.data.debug.loginMethod}</div>
                          <div>Mobile: {loginResult.data.debug.isMobile ? 'Yes' : 'No'}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {!loginResult.success && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {loginResult.error || (loginResult.data && loginResult.data.message)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Test Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>3. Quick Test Credentials</CardTitle>
            <CardDescription>
              Test with different user accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setUsername("ma1313");
                  setPassword("Dietdew13!");
                }}
              >
                Admin (ma1313)
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setUsername("ChadW");
                  setPassword("Password123");
                }}
              >
                Admin (ChadW)
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setUsername("DeShaun");
                  setPassword("Password123");
                }}
              >
                Admin (DeShaun)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Use this page to diagnose any deployment authentication issues.</p>
        <p>All tests run against the current deployment environment.</p>
      </div>
    </div>
  );
}