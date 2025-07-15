import { useState, useEffect } from "react";

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  businessName: string;
}

interface GPSLocation {
  driver: { firstName: string; lastName: string; };
  session: { route: { name: string; }; };
  latitude: string;
  longitude: string;
  timestamp: string;
}

function MinimalWorkingApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [username, setUsername] = useState("ma1313");
  const [password, setPassword] = useState("Dietdew13!");
  const [businessName, setBusinessName] = useState("tnt-gymnastics");
  const [error, setError] = useState("");
  
  // Dashboard data
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeRoutes, setActiveRoutes] = useState(0);
  const [driversActive, setDriversActive] = useState(0);
  const [gpsLocations, setGpsLocations] = useState<GPSLocation[]>([]);

  // Check authentication on load
  useEffect(() => {
    const checkAuth = async () => {
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
            }
          }
        }
      } catch (error) {
        console.log("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Load dashboard data
  useEffect(() => {
    if (user && user.role === "leadership") {
      loadDashboardData();
      const interval = setInterval(loadDashboardData, 30000); // Auto-refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load students
      const studentsResponse = await fetch("/api/students", { credentials: "include" });
      if (studentsResponse.ok) {
        const students = await studentsResponse.json();
        setTotalStudents(students.length);
      }

      // Load active sessions
      const sessionsResponse = await fetch("/api/pickup-sessions/today", { credentials: "include" });
      if (sessionsResponse.ok) {
        const sessions = await sessionsResponse.json();
        const activeSessions = sessions.filter((s: any) => s.status === 'in_progress');
        setActiveRoutes(activeSessions.length);
      }

      // Load GPS locations
      const locationsResponse = await fetch("/api/driver-locations", { credentials: "include" });
      if (locationsResponse.ok) {
        const locations = await locationsResponse.json();
        setGpsLocations(locations);
        setDriversActive(locations.length);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password, businessName }),
      });

      const data = await response.json();

      if (data.id) {
        setUser(data);
        console.log("Login successful:", data);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
      console.error("Login error:", error);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (error) {
      console.log("Logout error:", error);
    } finally {
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      }}>
        <div style={{ 
          width: "40px", 
          height: "40px", 
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #1976D2",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px"
      }}>
        <div style={{ 
          background: "white", 
          borderRadius: "12px", 
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
          maxWidth: "400px",
          width: "100%",
          overflow: "hidden"
        }}>
          <div style={{ 
            background: "#1976D2", 
            color: "white", 
            padding: "30px", 
            textAlign: "center" 
          }}>
            <h1 style={{ fontSize: "28px", margin: "0 0 8px 0" }}>Route Runner</h1>
            <p style={{ margin: "0", opacity: "0.9" }}>School Bus Route Management</p>
          </div>
          
          <div style={{ padding: "30px" }}>
            <div style={{ 
              background: "#E3F2FD", 
              color: "#1976D2", 
              padding: "15px", 
              borderRadius: "8px", 
              marginBottom: "20px",
              borderLeft: "4px solid #1976D2"
            }}>
              <strong>System Restored & Working</strong><br />
              Login credentials: ma1313 / Dietdew13!
            </div>
            
            {error && (
              <div style={{ 
                background: "#f44336", 
                color: "white", 
                padding: "12px", 
                borderRadius: "8px", 
                marginBottom: "20px",
                textAlign: "center"
              }}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e1e5e9",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e1e5e9",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e1e5e9",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: loginLoading ? "#ccc" : "#1976D2",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: loginLoading ? "not-allowed" : "pointer"
                }}
              >
                {loginLoading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Leadership Dashboard
  if (user.role === "leadership") {
    return (
      <div style={{ padding: "20px", background: "#f5f5f5", minHeight: "100vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 style={{ margin: "0" }}>Route Runner - Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            style={{
              background: "#f44336",
              color: "white",
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "20px", 
          marginBottom: "20px" 
        }}>
          <div style={{ 
            background: "white", 
            padding: "20px", 
            borderRadius: "8px", 
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ color: "#666", margin: "0 0 10px 0" }}>Active Routes</h3>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#1976D2" }}>
              {activeRoutes}
            </div>
          </div>
          
          <div style={{ 
            background: "white", 
            padding: "20px", 
            borderRadius: "8px", 
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ color: "#666", margin: "0 0 10px 0" }}>Total Students</h3>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#1976D2" }}>
              {totalStudents}
            </div>
          </div>
          
          <div style={{ 
            background: "white", 
            padding: "20px", 
            borderRadius: "8px", 
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ color: "#666", margin: "0 0 10px 0" }}>Drivers Active</h3>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#1976D2" }}>
              {driversActive}
            </div>
          </div>
        </div>
        
        <div style={{ 
          background: "white", 
          padding: "20px", 
          borderRadius: "8px", 
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)" 
        }}>
          <h3 style={{ margin: "0 0 20px 0" }}>GPS Tracking</h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {gpsLocations.length === 0 ? (
              <p style={{ color: "#666", textAlign: "center", padding: "20px" }}>
                No active drivers currently tracking
              </p>
            ) : (
              gpsLocations.map((location, index) => (
                <div key={index} style={{ 
                  border: "1px solid #e5e7eb", 
                  borderRadius: "8px", 
                  padding: "16px", 
                  background: "#f9fafb" 
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                        {location.driver?.firstName || 'Unknown'} {location.driver?.lastName || 'Driver'}
                      </div>
                      <div style={{ fontSize: "14px", color: "#666" }}>
                        Route: {location.session?.route?.name || 'Unknown Route'}
                      </div>
                      <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                        Location: {location.latitude?.substring(0, 7) || 'N/A'}, {location.longitude?.substring(0, 7) || 'N/A'}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ 
                        width: "8px", 
                        height: "8px", 
                        background: "#10b981", 
                        borderRadius: "50%", 
                        marginLeft: "auto", 
                        marginBottom: "4px" 
                      }}></div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {new Date(location.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Driver Dashboard (basic)
  return (
    <div style={{ padding: "20px", background: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ margin: "0" }}>Route Runner - Driver Dashboard</h1>
        <button
          onClick={handleLogout}
          style={{
            background: "#f44336",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </div>
      <div style={{ 
        background: "white", 
        padding: "20px", 
        borderRadius: "8px", 
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)" 
      }}>
        <h3>Welcome, {user.firstName} {user.lastName}</h3>
        <p>Driver dashboard is ready for route management features.</p>
      </div>
    </div>
  );
}

export default MinimalWorkingApp;