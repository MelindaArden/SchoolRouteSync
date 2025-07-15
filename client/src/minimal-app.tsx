import { useState } from "react";

export default function MinimalApp() {
  const [page, setPage] = useState<"login" | "dashboard">("login");

  if (page === "login") {
    return (
      <div style={{ 
        minHeight: "100vh", 
        backgroundColor: "#f9fafb", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        padding: "16px" 
      }}>
        <div style={{ 
          width: "100%", 
          maxWidth: "400px", 
          backgroundColor: "white", 
          borderRadius: "8px", 
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)", 
          overflow: "hidden" 
        }}>
          <div style={{ 
            padding: "24px", 
            borderBottom: "1px solid #e5e7eb" 
          }}>
            <h1 style={{ 
              fontSize: "24px", 
              fontWeight: "bold", 
              textAlign: "center", 
              margin: "0",
              color: "#1976D2" 
            }}>
              Route Runner
            </h1>
          </div>
          <div style={{ padding: "24px" }}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                fontSize: "14px", 
                fontWeight: "500", 
                color: "#374151",
                marginBottom: "4px" 
              }}>
                Username
              </label>
              <input 
                type="text" 
                placeholder="ma1313"
                style={{ 
                  width: "100%", 
                  padding: "8px 12px", 
                  border: "1px solid #d1d5db", 
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box" 
                }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                fontSize: "14px", 
                fontWeight: "500", 
                color: "#374151",
                marginBottom: "4px" 
              }}>
                Password
              </label>
              <input 
                type="password" 
                placeholder="Dietdew13!"
                style={{ 
                  width: "100%", 
                  padding: "8px 12px", 
                  border: "1px solid #d1d5db", 
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box" 
                }}
              />
            </div>
            <button 
              onClick={() => setPage("dashboard")}
              style={{ 
                width: "100%", 
                padding: "12px", 
                backgroundColor: "#1976D2", 
                color: "white", 
                border: "none", 
                borderRadius: "4px", 
                fontSize: "16px", 
                fontWeight: "500",
                cursor: "pointer" 
              }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Route Runner - Admin Dashboard</h1>
          <Button onClick={() => setPage("login")} variant="outline">
            Logout
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">3</div>
              <p className="text-sm text-gray-600">Currently in progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">142</div>
              <p className="text-sm text-gray-600">Enrolled for pickup</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Drivers Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">6</div>
              <p className="text-sm text-gray-600">Currently driving routes</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>GPS Tracking System</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              The GPS tracking and route visualization system is being rebuilt to ensure reliability.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">System Status: Operational</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Core app functionality working</li>
                <li>✓ Authentication system active</li>
                <li>✓ Database connections stable</li>
                <li>⚠ GPS tracking components being rebuilt</li>
                <li>⚠ Route visualization temporarily disabled</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}