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
import NotFound from "@/pages/not-found";

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
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
        {user.role === "driver" ? (
          <DriverDashboard user={user} onLogout={handleLogout} />
        ) : (
          <LeadershipDashboard user={user} onLogout={handleLogout} />
        )}
      </Route>
      <Route path="/driver">
        <DriverDashboard user={user} onLogout={handleLogout} />
      </Route>
      <Route path="/leadership">
        <LeadershipDashboard user={user} onLogout={handleLogout} />
      </Route>
      <Route path="/route-summary/:sessionId">
        {(params) => (
          <RouteSummary user={user} onLogout={handleLogout} sessionId={params.sessionId} />
        )}
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
