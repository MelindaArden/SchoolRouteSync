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
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Enhanced mobile detection for deployment
      const isMobileSafari = /iPhone|iPad/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
      const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
      const isDeployment = window.location.hostname.includes('.replit.app') || window.location.hostname.includes('.replit.dev');
      
      console.log("Mobile detection:", {
        isMobileSafari,
        isMobile,
        isDeployment,
        hostname: window.location.hostname,
        userAgent: navigator.userAgent
      });
      
      // Use mobile-specific endpoint for Safari on iOS or deployment environments
      const loginEndpoint = (isMobileSafari || (isMobile && isDeployment)) ? "/api/mobile-login" : "/api/login";
      
      const response = await fetch(loginEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Critical for mobile Safari sessions
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        // If mobile endpoint fails, try regular login
        if ((isMobileSafari || (isMobile && isDeployment)) && loginEndpoint === "/api/mobile-login") {
          console.log("Mobile login failed, trying regular login");
          const fallbackResponse = await fetch("/api/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ username, password }),
          });
          
          if (!fallbackResponse.ok) {
            const errorData = await fallbackResponse.json();
            console.log("Fallback login error:", errorData);
            throw new Error(errorData.message || "Login failed");
          }
          
          const userData = await fallbackResponse.json();
          console.log("Fallback login success:", userData);
          onLogin(userData);
        } else {
          const errorData = await response.json();
          console.log("Login error:", errorData);
          throw new Error(errorData.message || "Login failed");
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
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
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
