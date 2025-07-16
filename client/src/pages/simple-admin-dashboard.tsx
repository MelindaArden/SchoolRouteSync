import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Bus, 
  Users, 
  School, 
  AlertTriangle, 
  Clock,
  LogOut,
  RefreshCw
} from "lucide-react";

interface SimpleAdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function SimpleAdminDashboard({ user, onLogout }: SimpleAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "routes" | "users">("overview");
  const { toast } = useToast();

  // Simple data fetching with timeout protection
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users'],
    retry: 1,
    staleTime: 60000, // Cache for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const { data: schools = [], isLoading: schoolsLoading, error: schoolsError } = useQuery({
    queryKey: ['/api/schools'],
    retry: 1,
    staleTime: 60000,
    gcTime: 300000,
  });

  const { data: routes = [], isLoading: routesLoading, error: routesError } = useQuery({
    queryKey: ['/api/routes'],
    retry: 1,
    staleTime: 60000,
    gcTime: 300000,
  });

  const { data: todaySessions = [], isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: ['/api/pickup-sessions/today'],
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000,
  });

  // Calculate basic stats with error handling
  const driverCount = Array.isArray(users) ? users.filter((u: any) => u.role === 'driver').length : 0;
  const schoolCount = Array.isArray(schools) ? schools.length : 0;
  const routeCount = Array.isArray(routes) ? routes.length : 0;
  const activeRoutes = Array.isArray(todaySessions) ? todaySessions.filter((s: any) => s.status === 'in_progress').length : 0;

  const hasErrors = usersError || schoolsError || routesError || sessionsError;
  const isLoading = usersLoading || schoolsLoading || routesLoading || sessionsLoading;

  const refreshData = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bus className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Route Runner</h1>
              <p className="text-sm text-gray-600">Admin Dashboard - {user.firstName} {user.lastName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={onLogout}
              variant="destructive"
              size="sm"
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex space-x-6">
          {[
            { id: "overview", label: "Overview", icon: Bus },
            { id: "routes", label: "Routes", icon: Clock },
            { id: "users", label: "Users", icon: Users }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-3 border-b-2 transition-colors ${
                activeTab === id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {hasErrors && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Connection Issues</h3>
                  <p className="text-yellow-700 text-sm">Some data may not be current due to database timeout issues.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Routes</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {isLoading ? "..." : activeRoutes}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Drivers</p>
                      <p className="text-2xl font-bold text-green-600">
                        {isLoading ? "..." : driverCount}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Schools</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {isLoading ? "..." : schoolCount}
                      </p>
                    </div>
                    <School className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Routes</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {isLoading ? "..." : routeCount}
                      </p>
                    </div>
                    <Bus className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Active Routes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Today's Active Routes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading routes...</p>
                  </div>
                ) : todaySessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Bus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No active routes today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todaySessions.map((session: any) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium">{session.route?.name || `Route ${session.id}`}</h4>
                          <p className="text-sm text-gray-600">
                            Driver: {session.driver?.firstName} {session.driver?.lastName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            session.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : session.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {session.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "routes" && (
          <Card>
            <CardHeader>
              <CardTitle>Routes Management</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading routes...</p>
                </div>
              ) : routes.length === 0 ? (
                <div className="text-center py-8">
                  <Bus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No routes configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {routes.map((route: any) => (
                    <div key={route.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{route.name}</h4>
                          <p className="text-sm text-gray-600">
                            Driver: {route.driver?.firstName} {route.driver?.lastName}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          Route #{route.id}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No users found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((userItem: any) => (
                    <div key={userItem.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{userItem.firstName} {userItem.lastName}</h4>
                          <p className="text-sm text-gray-600">@{userItem.username}</p>
                        </div>
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            userItem.role === 'driver' 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {userItem.role?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}