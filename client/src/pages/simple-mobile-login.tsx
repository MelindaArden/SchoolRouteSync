import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SimpleMobileLogin({ onLogin }: { onLogin: (user: any) => void }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDriverLogin = async () => {
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

      if (response.ok) {
        const userData = await response.json();
        console.log("Driver login successful:", userData);
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(userData));
        if (userData.authToken) {
          localStorage.setItem('authToken', userData.authToken);
        }
        
        toast({
          title: "Success",
          description: "Driver login successful!",
        });
        
        // Immediate redirect
        onLogin(userData);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
    } catch (error) {
      console.error("Driver login error:", error);
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: 'ChadW',
          password: 'Password123',
          businessName: 'tnt-gymnastics'
        })
      });

      if (response.ok) {
        const userData = await response.json();
        console.log("Admin login successful:", userData);
        
        localStorage.setItem('user', JSON.stringify(userData));
        if (userData.authToken) {
          localStorage.setItem('authToken', userData.authToken);
        }
        
        toast({
          title: "Success",
          description: "Admin login successful!",
        });
        
        onLogin(userData);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
    } catch (error) {
      console.error("Admin login error:", error);
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
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
            Route Runner
          </CardTitle>
          <p className="text-gray-600">Mobile Login Test</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            onClick={handleDriverLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Logging in..." : "Login as Driver (ma1313)"}
          </Button>
          
          <Button
            onClick={handleAdminLogin}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? "Logging in..." : "Login as Admin (ChadW)"}
          </Button>
          
          <div className="text-xs text-gray-500 text-center mt-4">
            This is a simplified mobile login test page.
            <br />
            Use this if the main login page has issues.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}