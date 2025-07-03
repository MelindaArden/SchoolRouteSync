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
import NotFound from "@/pages/not-found";

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for active session on server (better for mobile Safari)
    const checkSession = async () => {
      try {
        const response = await fetch("/api/session", {
          credentials: "include"
        });
        
        if (response.ok) {
          const sessionData = await response.json();
          if (sessionData.isAuthenticated && sessionData.userId) {
            // Get full user data
            const userResponse = await fetch(`/api/users/${sessionData.userId}`, {
              credentials: "include"
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              setUser(userData);
              localStorage.setItem("user", JSON.stringify(userData));
            }
          }
        } else {
          // Fall back to localStorage for offline cases
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              setUser(userData);
            } catch (error) {
              localStorage.removeItem("user");
            }
          }
        }
      } catch (error) {
        console.log("Session check failed, checking localStorage");
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
          } catch (error) {
            localStorage.removeItem("user");
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (error) {
      console.log("Logout request failed");
    } finally {
      setUser(null);
      localStorage.removeItem("user");
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
