import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, Users, Clock, Route as RouteIcon } from "lucide-react";

interface SimpleLeadershipDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function SimpleLeadershipDashboard({ user, onLogout }: SimpleLeadershipDashboardProps) {
  console.log("SimpleLeadershipDashboard rendering with user:", user);
  
  const [activeTab, setActiveTab] = useState<"dashboard" | "routes">("dashboard");

  // Basic data queries with error handling
  const { data: schools = [], isLoading: schoolsLoading, error: schoolsError } = useQuery({
    queryKey: ['/api/schools'],
    retry: 1,
  });

  const { data: students = [], isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ['/api/students'],
    retry: 1,
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users'],
    retry: 1,
  });

  const { data: routes = [], isLoading: routesLoading, error: routesError } = useQuery({
    queryKey: ['/api/routes'],
    retry: 1,
  });

  console.log("Query states:", {
    schoolsLoading, studentsLoading, usersLoading, routesLoading,
    schoolsError, studentsError, usersError, routesError,
    schools: schools?.length, students: students?.length, users: users?.length, routes: routes?.length
  });

  if (schoolsLoading || studentsLoading || usersLoading || routesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (schoolsError || studentsError || usersError || routesError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">Unable to load dashboard data.</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Route Runner - Admin</h1>
            </div>
            <Button onClick={onLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Button
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              onClick={() => setActiveTab("dashboard")}
              className="py-4 px-6"
            >
              Dashboard
            </Button>
            <Button
              variant={activeTab === "routes" ? "default" : "ghost"}
              onClick={() => setActiveTab("routes")}
              className="py-4 px-6"
            >
              Routes
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Schools</p>
                      <p className="text-2xl font-bold text-gray-900">{schools.length}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{students.length}</p>
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
                      <p className="text-2xl font-bold text-gray-900">
                        {users.filter((u: any) => u.role === 'driver').length}
                      </p>
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
                      <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
                    </div>
                    <RouteIcon className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test Message */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-600 font-medium">✓ Dashboard loaded successfully</p>
                <p className="text-sm text-gray-600 mt-2">
                  Welcome {user.firstName}! The simple dashboard is working properly.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "routes" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Routes Management</h2>
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-600">Routes management section - coming soon</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}