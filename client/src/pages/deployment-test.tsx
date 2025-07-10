import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function DeploymentTest() {
  const [credentials, setCredentials] = useState({
    username: "ma1313",
    password: "Dietdew13!"
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testLogin = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify(credentials)
      });
      
      setTestResult({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
        data: error.response ? await error.response.json() : null,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testMobileLogin = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/api/mobile-login", {
        method: "POST",
        body: JSON.stringify(credentials)
      });
      
      setTestResult({
        success: true,
        data: response,
        endpoint: 'mobile-login',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
        data: error.response ? await error.response.json() : null,
        endpoint: 'mobile-login',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Deployment Login Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                placeholder="Enter password"
              />
            </div>

            <div className="flex space-x-4">
              <Button 
                onClick={testLogin} 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Testing..." : "Test Regular Login"}
              </Button>
              
              <Button 
                onClick={testMobileLogin} 
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                {isLoading ? "Testing..." : "Test Mobile Login"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {testResult && (
          <Card>
            <CardHeader>
              <CardTitle className={testResult.success ? "text-green-600" : "text-red-600"}>
                Test Result: {testResult.success ? "SUCCESS" : "FAILED"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Valid Credentials for Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Driver:</strong> ma1313 / Dietdew13!</div>
              <div><strong>Driver:</strong> driver1 / password123</div>
              <div><strong>Admin:</strong> ChadW / Password123</div>
              <div><strong>Admin:</strong> DeShaun / Password123</div>
              <div><strong>Admin:</strong> Melinda / Password123</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}