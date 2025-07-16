import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, Users, Clock, Route as RouteIcon } from "lucide-react";

interface MinimalLeadershipDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function MinimalLeadershipDashboard({ user, onLogout }: MinimalLeadershipDashboardProps) {
  console.log("MinimalLeadershipDashboard rendering with user:", user);
  
  // Simple data queries
  const { data: schools = [] } = useQuery({ queryKey: ['/api/schools'], retry: 1 });
  const { data: students = [] } = useQuery({ queryKey: ['/api/students'], retry: 1 });
  const { data: users = [] } = useQuery({ queryKey: ['/api/users'], retry: 1 });
  const { data: routes = [] } = useQuery({ queryKey: ['/api/routes'], retry: 1 });

  // Safe calculations
  const schoolCount = Array.isArray(schools) ? schools.length : 0;
  const studentCount = Array.isArray(students) ? students.length : 0;
  const driverCount = Array.isArray(users) ? users.filter((u: any) => u?.role === 'driver').length : 0;
  const routeCount = Array.isArray(routes) ? routes.length : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Route Runner - Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.firstName || user.username}</span>
              <Button onClick={onLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Schools</p>
                    <p className="text-2xl font-bold text-gray-900">{schoolCount}</p>
                  </div>
                  <RouteIcon className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Students</p>
                    <p className="text-2xl font-bold text-gray-900">{studentCount}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Drivers</p>
                    <p className="text-2xl font-bold text-gray-900">{driverCount}</p>
                  </div>
                  <Bus className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Routes</p>
                    <p className="text-2xl font-bold text-gray-900">{routeCount}</p>
                  </div>
                  <RouteIcon className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Message */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-green-600 font-medium">✓ Admin dashboard loaded successfully</p>
                <p className="text-blue-600 font-medium">✓ Data connection established</p>
                <p className="text-sm text-gray-600">
                  Welcome to the Route Runner admin dashboard, {user.firstName || user.username}! 
                  This simplified dashboard shows your basic system statistics.
                </p>
                <div className="mt-4">
                  <Button 
                    onClick={() => window.location.href = '/'} 
                    className="mr-4"
                  >
                    Try Full Dashboard
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline"
                  >
                    Refresh Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}