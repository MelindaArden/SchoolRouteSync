import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { User } from "./lib/types";
import Login from "@/pages/login";
import DriverDashboard from "@/pages/driver-dashboard";
import LeadershipDashboard from "@/pages/leadership-dashboard";
import RouteSummary from "@/pages/route-summary";
import MobileDebug from "@/pages/mobile-debug";
import DebugAuth from "@/pages/debug-auth";
import NotFound from "@/pages/not-found";

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for authentication token first, then session (mobile Safari compatible)
    const checkAuth = async () => {
      try {
        const authToken = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("user");
        
        // If we have both token and user data, verify token is still valid
        if (authToken && storedUser) {
          try {
            const response = await fetch("/api/session", {
              headers: {
                'Authorization': `Bearer ${authToken}`
              },
              credentials: "include"
            });
            
            if (response.ok) {
              const sessionData = await response.json();
              if (sessionData.isAuthenticated) {
                const userData = JSON.parse(storedUser);
                setUser(userData);
                console.log("Token authentication successful");
                return;
              }
            }
          } catch (error) {
            console.log("Token validation failed, clearing stored data");
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
          }
        }
        
        // Fall back to session check
        try {
          const response = await fetch("/api/session", {
            credentials: "include"
          });
          
          if (response.ok) {
            const sessionData = await response.json();
            if (sessionData.isAuthenticated && sessionData.userId) {
              const userResponse = await fetch(`/api/users/${sessionData.userId}`, {
                credentials: "include"
              });
              
              if (userResponse.ok) {
                const userData = await userResponse.json();
                setUser(userData);
                localStorage.setItem("user", JSON.stringify(userData));
                console.log("Session authentication successful");
              }
            }
          }
        } catch (error) {
          console.log("Session check failed");
        }
        
        // Final fallback to localStorage only (offline mode)
        if (!user && storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            console.log("Using offline authentication");
          } catch (error) {
            localStorage.removeItem("user");
          }
        }
        
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      const authToken = localStorage.getItem("authToken");
      if (authToken) {
        await fetch("/api/logout", {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          credentials: "include"
        });
      } else {
        await fetch("/api/logout", {
          method: "POST",
          credentials: "include"
        });
      }
    } catch (error) {
      console.log("Logout request failed");
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
      localStorage.removeItem("mobileToken");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Switch>
      <Route path="/">
        {user.role === "leadership" ? (
          <LeadershipDashboard user={user} onLogout={handleLogout} />
        ) : (
          <DriverDashboard user={user} onLogout={handleLogout} />
        )}
      </Route>
      <Route path="/leadership">
        <LeadershipDashboard user={user} onLogout={handleLogout} />
      </Route>
      <Route path="/route-summary/:sessionId">
        {(params) => (
          <RouteSummary user={user} onLogout={handleLogout} sessionId={params.sessionId} />
        )}
      </Route>
      <Route path="/mobile-debug">
        <MobileDebug />
      </Route>
      <Route path="/debug-auth">
        <DebugAuth />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
