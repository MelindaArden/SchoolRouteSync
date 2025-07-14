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
import AdminMap from "@/pages/admin-map";
import RouteSummary from "@/pages/route-summary";
import MobileDebug from "@/pages/mobile-debug";
import DebugAuth from "@/pages/debug-auth";
import TMobileTest from "@/pages/tmobile-test";
import DeploymentTest from "@/pages/deployment-test";
import MobileLogin from "@/pages/mobile-login";
import MasterLogin from "@/pages/master-login";
import MasterDashboard from "@/pages/master-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [masterAdmin, setMasterAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for authentication token first, then session (mobile Safari compatible)
    const checkAuth = async () => {
      try {
        // Check for master admin token first
        const masterAdminToken = localStorage.getItem("masterAdminToken");
        const storedMasterAdmin = localStorage.getItem("masterAdmin");
        
        if (masterAdminToken && storedMasterAdmin) {
          try {
            const masterAdminData = JSON.parse(storedMasterAdmin);
            setMasterAdmin(masterAdminData);
            console.log("Master admin authentication successful");
            return;
          } catch (error) {
            console.log("Master admin token validation failed, clearing stored data");
            localStorage.removeItem("masterAdminToken");
            localStorage.removeItem("masterAdmin");
          }
        }
        
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

  const handleMasterLogin = (masterAdminData: any) => {
    setMasterAdmin(masterAdminData);
    localStorage.setItem("masterAdmin", JSON.stringify(masterAdminData));
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

  const handleMasterLogout = () => {
    setMasterAdmin(null);
    localStorage.removeItem("masterAdmin");
    localStorage.removeItem("masterAdminToken");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {masterAdmin ? (
        <>
          <Route path="/" component={() => <MasterDashboard masterAdmin={masterAdmin} onLogout={handleMasterLogout} />} />
          <Route path="/master" component={() => <MasterDashboard masterAdmin={masterAdmin} onLogout={handleMasterLogout} />} />
        </>
      ) : user ? (
        <>
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
          <Route path="/admin-map">
            <AdminMap />
          </Route>
          <Route path="/route-summary/:sessionId">
            {(params) => (
              <RouteSummary user={user} onLogout={handleLogout} sessionId={params.sessionId} />
            )}
          </Route>
        </>
      ) : (
        <>
          <Route path="/" component={() => <Login onLogin={handleLogin} />} />
          <Route path="/master-login" component={() => <MasterLogin onLogin={handleMasterLogin} />} />
          <Route path="/mobile-login" component={() => <MobileLogin onLogin={handleLogin} />} />
          <Route path="/mobile-debug" component={MobileDebug} />
          <Route path="/debug-auth" component={DebugAuth} />
          <Route path="/tmobile-test" component={TMobileTest} />
          <Route path="/deployment-test" component={DeploymentTest} />
        </>
      )}
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
