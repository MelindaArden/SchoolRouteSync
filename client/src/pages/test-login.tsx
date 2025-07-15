import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function TestLogin() {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [loginResult, setLoginResult] = useState<any>(null);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginResult(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();
      setLoginResult(result);

      if (response.ok) {
        // Store auth token if provided
        if (result.authToken) {
          localStorage.setItem('authToken', result.authToken);
        }
        toast({
          title: "Login Test Successful",
          description: `Logged in as ${result.username}`,
        });
      } else {
        toast({
          title: "Login Test Failed",
          description: result.message || "Login failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login test error:', error);
      toast({
        title: "Login Test Error",
        description: "Network or server error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testCredentials = [
    { username: "ma1313", password: "Dietdew13!" },
    { username: "ChadW", password: "Password123" },
    { username: "DeShaun", password: "Password123" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Route Runner - Login Test</CardTitle>
            <p className="text-center text-gray-600">Test authentication system</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Testing Login..." : "Test Login"}
              </Button>
            </form>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Quick Test Credentials:</h3>
              <div className="grid gap-2">
                {testCredentials.map((cred, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setCredentials(cred)}
                    className="text-left justify-start"
                  >
                    {cred.username} / {cred.password}
                  </Button>
                ))}
              </div>
            </div>

            {loginResult && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Login Test Result:</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(loginResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Current URL:</span> {window.location.href}
              </div>
              <div>
                <span className="font-medium">Local Storage Token:</span> 
                <code className="ml-2 text-xs bg-gray-100 px-1 rounded">
                  {localStorage.getItem('authToken')?.substring(0, 20) || 'None'}...
                </code>
              </div>
              <div>
                <span className="font-medium">User Agent:</span> 
                <code className="ml-2 text-xs bg-gray-100 px-1 rounded">
                  {navigator.userAgent.substring(0, 50)}...
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}