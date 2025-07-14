import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Building2 } from "lucide-react";

interface MasterLoginProps {
  onLogin: (masterAdmin: any) => void;
}

export default function MasterLogin({ onLogin }: MasterLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter username and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/master-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const masterAdminData = await response.json();
      
      // Store master admin token
      if (masterAdminData.token) {
        localStorage.setItem("masterAdminToken", masterAdminData.token);
      }
      
      onLogin(masterAdminData);
      
      toast({
        title: "Success",
        description: "Logged in to Master Dashboard",
      });
    } catch (error) {
      console.error("Master login error:", error);
      toast({
        title: "Error",
        description: "Invalid master admin credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-purple-600 rounded-full p-3">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-medium text-gray-800">
            Master Dashboard
          </CardTitle>
          <p className="text-gray-600">Platform Administration Access</p>
          
          <div className="mt-4 p-3 bg-purple-50 rounded-lg text-sm">
            <p className="font-medium text-purple-800 mb-2">Master Admin Access:</p>
            <p className="text-purple-700">
              <strong>Username:</strong> master-admin<br/>
              <strong>Password:</strong> MasterPass2024!
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base font-medium">Master Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter master username"
                className="h-12 text-lg px-4 border-2 border-gray-300 focus:border-purple-600"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium">Master Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter master password"
                className="h-12 text-lg px-4 border-2 border-gray-300 focus:border-purple-600"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Access Master Dashboard"
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <a 
              href="/" 
              className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center justify-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              Business Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}