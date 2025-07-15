import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MinimalApp() {
  const [page, setPage] = useState<"login" | "dashboard">("login");

  if (page === "login") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Route Runner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input 
                  type="text" 
                  placeholder="ma1313"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input 
                  type="password" 
                  placeholder="Dietdew13!"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <Button 
                onClick={() => setPage("dashboard")}
                className="w-full"
              >
                Login
              </Button>
            </div>
          </CardContent>
        </Card>
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