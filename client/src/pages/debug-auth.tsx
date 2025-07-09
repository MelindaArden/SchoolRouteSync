import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DebugAuth() {
  const [username, setUsername] = useState("ma1313");
  const [password, setPassword] = useState("Dietdew13!");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      currentUrl: window.location.href,
      tests: []
    };

    // Test 1: Regular login
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      results.tests.push({
        name: "Regular Login",
        status: response.status,
        success: response.ok,
        data: data
      });
    } catch (error) {
      results.tests.push({
        name: "Regular Login",
        error: String(error)
      });
    }

    // Test 2: Mobile login
    try {
      const response = await fetch("/api/mobile-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      results.tests.push({
        name: "Mobile Login",
        status: response.status,
        success: response.ok,
        data: data
      });
    } catch (error) {
      results.tests.push({
        name: "Mobile Login",
        error: String(error)
      });
    }

    // Test 3: Session check
    try {
      const response = await fetch("/api/session", {
        method: "GET",
        credentials: "include"
      });
      
      const data = await response.json();
      results.tests.push({
        name: "Session Check",
        status: response.status,
        success: response.ok,
        data: data
      });
    } catch (error) {
      results.tests.push({
        name: "Session Check",
        error: String(error)
      });
    }

    setResults(results);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Debug Tool</CardTitle>
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

            <Button onClick={testAuth} disabled={loading}>
              {loading ? "Testing..." : "Test Authentication"}
            </Button>

            {results && (
              <div className="space-y-4">
                <div className="bg-gray-100 p-3 rounded">
                  <h3 className="font-semibold">Environment Info</h3>
                  <p><strong>Timestamp:</strong> {results.timestamp}</p>
                  <p><strong>URL:</strong> {results.currentUrl}</p>
                  <p><strong>User Agent:</strong> {results.userAgent}</p>
                </div>

                {results.tests.map((test: any, index: number) => (
                  <div key={index} className="border rounded p-3">
                    <h3 className="font-semibold">{test.name}</h3>
                    {test.error ? (
                      <div className="text-red-600">
                        <strong>Error:</strong> {test.error}
                      </div>
                    ) : (
                      <div>
                        <p><strong>Status:</strong> {test.status}</p>
                        <p><strong>Success:</strong> {test.success ? "✓" : "✗"}</p>
                        <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}