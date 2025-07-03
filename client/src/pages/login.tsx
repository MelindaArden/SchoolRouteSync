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
      // Detect mobile Safari
      const isMobileSafari = /iPhone|iPad/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
      console.log("Mobile Safari detected:", isMobileSafari);
      
      // Try mobile-specific endpoint first for Safari on iOS
      const loginEndpoint = isMobileSafari ? "/api/mobile-login" : "/api/login";
      
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
        if (isMobileSafari && loginEndpoint === "/api/mobile-login") {
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
        
        // Store mobile token if provided
        if (userData.token) {
          localStorage.setItem("mobileToken", userData.token);
        }
        
        onLogin(userData);
      }
      
      // Verify session after login
      setTimeout(async () => {
        try {
          const sessionCheck = await fetch("/api/session", {
            credentials: "include"
          });
          const sessionData = await sessionCheck.json();
          console.log("Session verification:", sessionData);
        } catch (err) {
          console.log("Session verification failed:", err);
        }
      }, 200);
      
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
