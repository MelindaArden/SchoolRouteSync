import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/lib/types";
import { Bus, Smartphone } from "lucide-react";

interface MobileLoginProps {
  onLogin: (user: User) => void;
}

export default function MobileLogin({ onLogin }: MobileLoginProps) {
  const [username, setUsername] = useState("ma1313");
  const [password, setPassword] = useState("Dietdew13!");
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Mobile-optimized login attempt:", {
        username,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        hostname: window.location.hostname
      });

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      setDebugInfo(data);

      if (!response.ok) {
        console.error("Login failed:", data);
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
        return;
      }

      // Store authentication data
      if (data.authToken) {
        localStorage.setItem("authToken", data.authToken);
      }
      if (data.token) {
        localStorage.setItem("mobileToken", data.token);
      }
      localStorage.setItem("user", JSON.stringify(data));

      console.log("Mobile login successful:", data);
      
      toast({
        title: "Login Successful",
        description: `Welcome ${data.firstName || data.username}!`,
      });

      onLogin(data);
    } catch (error: any) {
      console.error("Mobile login error:", error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Mobile-optimized header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-center space-x-2">
          <Bus className="h-8 w-8 text-primary" />
          <Smartphone className="h-6 w-6 text-gray-500" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-lg border-0">
          <CardHeader className="text-center pb-6 px-6 pt-8">
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
              Mobile Login
            </CardTitle>
            <p className="text-gray-600">Optimized for mobile devices</p>
          </CardHeader>
          
          <CardContent className="px-6 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-base font-medium text-gray-700">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="h-14 text-lg px-4 border-2 border-gray-300 focus:border-primary rounded-lg"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-medium text-gray-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="h-14 text-lg px-4 border-2 border-gray-300 focus:border-primary rounded-lg"
                  autoComplete="current-password"
                  required
                />
              </div>
              
              <Button
                type="submit"
                className="w-full h-16 text-xl font-semibold rounded-lg bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Quick access credentials for testing */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Test Credentials:</p>
              <div className="space-y-1 text-sm text-blue-800">
                <button 
                  type="button"
                  onClick={() => {
                    setUsername("ma1313");
                    setPassword("Dietdew13!");
                  }}
                  className="block w-full text-left p-2 bg-white rounded border hover:bg-gray-50"
                >
                  <strong>Driver:</strong> ma1313 / Dietdew13!
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setUsername("ChadW");
                    setPassword("Password123");
                  }}
                  className="block w-full text-left p-2 bg-white rounded border hover:bg-gray-50"
                >
                  <strong>Admin:</strong> ChadW / Password123
                </button>
              </div>
            </div>

            {/* Debug information */}
            {debugInfo && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-2">Debug Info:</p>
                <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile-friendly footer */}
      <div className="bg-white border-t border-gray-200 p-4 text-center">
        <p className="text-sm text-gray-500">
          School Bus Management System v2.0
        </p>
      </div>
    </div>
  );
}