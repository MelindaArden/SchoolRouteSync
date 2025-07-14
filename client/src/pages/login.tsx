import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@/lib/types";
import { Bus } from "lucide-react";

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || !businessName) {
      toast({
        title: "Error",
        description: "Please enter username, password, and business name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Enhanced mobile detection for deployment and T-Mobile
      const isMobileSafari = /iPhone|iPad/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
      const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
      const isDeployment = window.location.hostname.includes('.replit.app') || window.location.hostname.includes('.replit.dev');
      const isTMobile = navigator.userAgent.includes('T-Mobile');
      
      console.log("Enhanced mobile detection:", {
        isMobileSafari,
        isMobile,
        isDeployment,
        isTMobile,
        hostname: window.location.hostname,
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled,
        onlineStatus: navigator.onLine
      });
      
      // Use mobile-specific endpoint for mobile browsers or deployment environments
      const loginEndpoint = (isMobile || isDeployment || isTMobile) ? "/api/mobile-login" : "/api/login";
      console.log("Selected endpoint:", loginEndpoint);
      
      const response = await fetch(loginEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Critical for mobile Safari sessions
        body: JSON.stringify({ username, password, businessName }),
      });

      if (!response.ok) {
        // If mobile endpoint fails, try regular login and enhanced fallback for T-Mobile
        if (loginEndpoint === "/api/mobile-login") {
          console.log("Mobile login failed, trying regular login");
          const fallbackResponse = await fetch("/api/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ username, password, businessName }),
          });
          
          if (!fallbackResponse.ok) {
            const errorData = await fallbackResponse.json();
            console.log("Fallback login error:", errorData);
            
            // For T-Mobile, provide specific debugging
            if (isTMobile) {
              console.error("T-Mobile login issue detected. Running diagnostics...");
              try {
                const debugResponse = await fetch("/api/tmobile-debug", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ username, test: true, timestamp: Date.now() })
                });
                const debugData = await debugResponse.json();
                console.log("T-Mobile debug data:", debugData);
              } catch (debugError) {
                console.error("Debug test failed:", debugError);
              }
            }
            
            throw new Error(errorData.message || "Login failed - please check your credentials");
          }
          
          const userData = await fallbackResponse.json();
          console.log("Fallback login success:", userData);
          onLogin(userData);
        } else {
          const errorData = await response.json();
          console.log("Login error:", {
            status: response.status,
            statusText: response.statusText,
            errorData,
            endpoint: loginEndpoint,
            userAgent: navigator.userAgent,
            hostname: window.location.hostname
          });
          throw new Error(errorData.message || `Login failed (${response.status})`);
        }
      } else {
        const userData = await response.json();
        console.log("Login success:", userData);
        
        // Store authentication token for mobile Safari compatibility
        if (userData.authToken) {
          localStorage.setItem("authToken", userData.authToken);
          console.log("Auth token stored for mobile Safari");
        }
        
        // Also store mobile token for backward compatibility
        if (userData.token) {
          localStorage.setItem("mobileToken", userData.token);
        }
        
        onLogin(userData);
      }
      
      // Enhanced session verification for deployment
      setTimeout(async () => {
        try {
          const sessionCheck = await fetch("/api/session", {
            credentials: "include",
            headers: userData.authToken ? {
              'Authorization': `Bearer ${userData.authToken}`
            } : {}
          });
          
          if (sessionCheck.ok) {
            const sessionData = await sessionCheck.json();
            console.log("Session verification:", sessionData);
          } else {
            console.warn("Session verification failed:", await sessionCheck.text());
          }
        } catch (error) {
          console.error("Session verification failed:", error);
        }
      }, 1000);
      
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary rounded-full p-3">
              <Bus className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-medium text-gray-800">
            SchoolRide
          </CardTitle>
          <p className="text-gray-600">Afterschool Pickup Management</p>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-800 mb-2">Login Credentials:</p>
            <p className="text-blue-700">
              <strong>Business Name:</strong> tnt-gymnastics<br/>
              <strong>Admin:</strong> ma1313 / Dietdew13!<br/>
              <strong>Drivers:</strong> ChadW or DeShaun / Password123
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base font-medium">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="h-12 text-lg px-4 border-2 border-gray-300 focus:border-primary"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-12 text-lg px-4 border-2 border-gray-300 focus:border-primary"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-base font-medium">Business Name</Label>
              <Input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name"
                className="h-12 text-lg px-4 border-2 border-gray-300 focus:border-primary"
                autoComplete="organization"
                autoCapitalize="words"
                disabled={loading}
              />
              <p className="text-sm text-gray-500">Enter the exact business name used during setup</p>
            </div>
            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
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
        </CardContent>
      </Card>
    </div>
  );
}
