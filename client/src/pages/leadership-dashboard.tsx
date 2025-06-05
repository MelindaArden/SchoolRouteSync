import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";
import Navigation from "@/components/shared/navigation";
import RouteStatus from "@/components/leadership/route-status";
import AlertCard from "@/components/leadership/alert-card";
import SchoolForm from "@/components/leadership/school-form";
import StudentForm from "@/components/leadership/student-form";
import DriverForm from "@/components/leadership/driver-form";
import RouteForm from "@/components/leadership/route-form";
import SimpleRouteEdit from "@/components/leadership/simple-route-edit";
import SchoolsList from "@/components/leadership/schools-list";
import DriverTracking from "@/components/leadership/driver-tracking";
import ProfileSettings from "@/components/leadership/profile-settings";
import DriverLocationMap from "@/components/leadership/driver-location-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { 
  BarChart3, 
  Route as RouteIcon, 
  FileText, 
  Settings,
  TrendingUp,
  Clock,
  Users,
  AlertTriangle,
  Plus,
  School,
  UserPlus,
  GraduationCap,
  MapPin
} from "lucide-react";

interface LeadershipDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function LeadershipDashboard({ user, onLogout }: LeadershipDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "routes" | "tracking" | "gps" | "reports" | "settings">("dashboard");
  const [showForm, setShowForm] = useState<"school" | "student" | "driver" | "route" | null>(null);
  const [routesView, setRoutesView] = useState<"management" | "schools" | "routes">("management");
  const [editingRoute, setEditingRoute] = useState<any>(null);

  // WebSocket connection for real-time updates
  useWebSocket(user.id);

  // Fetch data for dynamic counts
  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
  });

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['/api/routes'],
  });

  // Fetch today's sessions for overview
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['/api/pickup-sessions/today'],
    retry: false,
  });

  // Calculate dashboard metrics with real data
  const sessionsData = Array.isArray(sessions) ? sessions : [];
  const activeRoutes = sessionsData.filter((s: any) => s.status === "in_progress").length;
  const totalStudents = sessionsData.reduce((sum: number, s: any) => sum + (s.totalStudents || 0), 0);
  const completedPickups = sessionsData.reduce((sum: number, s: any) => sum + (s.completedPickups || 0), 0);
  const onTimePercentage = totalStudents > 0 ? Math.round((completedPickups / totalStudents) * 100) : 95;
  const activeAlerts = sessionsData.filter((s: any) => 
    s.status === "in_progress" && (s.progressPercent || 0) < 50
  ).length;

  // Real counts from database
  const schoolCount = Array.isArray(schools) ? schools.length : 0;
  const studentCount = Array.isArray(students) ? students.length : 0;
  const driverCount = Array.isArray(users) ? users.filter((u: any) => u.role === 'driver').length : 0;
  const routeCount = Array.isArray(routes) ? routes.length : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        user={user} 
        onLogout={onLogout}
        role="leadership"
      />

      <div className="pb-20">
        {activeTab === "dashboard" && (
          <div className="p-4 space-y-6">
            {/* Dashboard Overview */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Routes</p>
                      <p className="text-2xl font-bold text-primary">{activeRoutes}</p>
                    </div>
                    <RouteIcon className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">On Time %</p>
                      <p className="text-2xl font-bold text-green-600">{onTimePercentage}%</p>
                    </div>
                    <Clock className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Students</p>
                      <p className="text-2xl font-bold text-gray-800">{totalStudents}</p>
                    </div>
                    <Users className="h-8 w-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Alerts</p>
                      <p className="text-2xl font-bold text-red-600">{activeAlerts}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Alerts */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Active Alerts</h3>
              <div className="space-y-3">
                {sessions
                  .filter((session: any) => session.status === "in_progress" && session.progressPercent < 50)
                  .map((session: any) => (
                    <AlertCard
                      key={session.id}
                      type="warning"
                      title={`Route ${session.route?.name} - Behind Schedule`}
                      message={`${session.driver?.firstName} ${session.driver?.lastName} has only completed ${session.progressPercent.toFixed(0)}% of pickups`}
                      timestamp="5 minutes ago"
                    />
                  ))}
                
                {activeAlerts === 0 && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-green-800">No active alerts - all routes running smoothly!</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Route Status Overview */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Route Status</h3>
              <div className="space-y-3">
                {sessions.map((session: any) => (
                  <RouteStatus
                    key={session.id}
                    routeName={session.route?.name || `Route ${session.id}`}
                    driverName={`${session.driver?.firstName} ${session.driver?.lastName}`}
                    status={session.status}
                    progress={session.progressPercent}
                    currentLocation={session.status === "in_progress" ? "En route to next school" : "Complete"}
                    studentsPickedUp={session.completedPickups}
                    totalStudents={session.totalStudents}
                  />
                ))}
              </div>
            </div>

            {/* Performance Analytics */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Weekly Performance</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-7 gap-2 text-center text-xs mb-4">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <div key={day} className="font-medium text-gray-600">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center">
                    <div className="bg-green-600 text-white rounded py-2 text-sm font-medium">98%</div>
                    <div className="bg-green-600 text-white rounded py-2 text-sm font-medium">96%</div>
                    <div className="bg-orange-600 text-white rounded py-2 text-sm font-medium">89%</div>
                    <div className="bg-green-600 text-white rounded py-2 text-sm font-medium">94%</div>
                    <div className="bg-primary text-white rounded py-2 text-sm font-medium">Today</div>
                    <div className="bg-gray-200 text-gray-400 rounded py-2 text-sm">--</div>
                    <div className="bg-gray-200 text-gray-400 rounded py-2 text-sm">--</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "routes" && !showForm && (
          <div className="p-4 space-y-4">
            {/* Management Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowForm("school")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <School className="h-4 w-4 mr-2" />
                Add School
              </Button>
              <Button
                onClick={() => setShowForm("student")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Add Student
              </Button>
              <Button
                onClick={() => setShowForm("driver")}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
              <Button
                onClick={() => setShowForm("route")}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Route
              </Button>
            </div>

            {/* Quick Stats - Dynamic counts */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRoutesView("schools")}>
                <CardContent className="p-3 text-center">
                  <School className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-800">{schoolCount}</p>
                  <p className="text-xs text-gray-600">Schools</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <GraduationCap className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-800">{studentCount}</p>
                  <p className="text-xs text-gray-600">Students</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Users className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-800">{driverCount}</p>
                  <p className="text-xs text-gray-600">Drivers</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRoutesView("routes")}>
                <CardContent className="p-3 text-center">
                  <RouteIcon className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-800">{routeCount}</p>
                  <p className="text-xs text-gray-600">Routes</p>
                </CardContent>
              </Card>
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={routesView === "management" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("management")}
                className="flex-1"
              >
                Management
              </Button>
              <Button
                variant={routesView === "schools" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("schools")}
                className="flex-1"
              >
                Schools
              </Button>
              <Button
                variant={routesView === "routes" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("routes")}
                className="flex-1"
              >
                Routes
              </Button>
            </div>

            {/* Conditional content based on view */}
            {routesView === "management" && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-gray-600 text-sm">Use the buttons above to add schools, students, drivers, or create routes.</p>
                </CardContent>
              </Card>
            )}

            {routesView === "schools" && <SchoolsList />}

            {routesView === "routes" && !editingRoute && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Routes ({routeCount})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.isArray(routes) && routes.length > 0 ? routes.map((route: any) => {
                    const driver = Array.isArray(users) ? users.find((u: any) => u.id === route.driverId) : null;
                    return (
                      <div key={route.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{route.name}</p>
                            <p className="text-sm text-gray-600">
                              Driver: {driver ? `${driver.firstName} ${driver.lastName}` : 'Unassigned'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right text-sm text-gray-600">
                              <p>Active: {route.isActive ? 'Yes' : 'No'}</p>
                              <p>Created: {new Date(route.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingRoute(route)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-gray-500 text-center py-4">No routes created yet</p>
                  )}
                </CardContent>
              </Card>
            )}

            {editingRoute && (
              <SimpleRouteEdit
                route={editingRoute}
                onClose={() => setEditingRoute(null)}
              />
            )}
          </div>
        )}

        {showForm === "school" && (
          <div className="p-4">
            <SchoolForm onClose={() => setShowForm(null)} />
          </div>
        )}

        {showForm === "student" && (
          <div className="p-4">
            <StudentForm onClose={() => setShowForm(null)} />
          </div>
        )}

        {showForm === "driver" && (
          <div className="p-4">
            <DriverForm onClose={() => setShowForm(null)} />
          </div>
        )}

        {showForm === "route" && (
          <div className="p-4">
            <RouteForm onClose={() => setShowForm(null)} />
          </div>
        )}

        {activeTab === "tracking" && (
          <div className="p-4">
            <DriverTracking />
          </div>
        )}

        {activeTab === "gps" && (
          <div className="p-4">
            <DriverLocationMap />
          </div>
        )}

        {activeTab === "reports" && (
          <div className="p-4">
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Reports & Analytics</h3>
                <p className="text-gray-600">
                  Comprehensive reporting and performance analytics
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="p-4">
            <ProfileSettings user={user} />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex justify-around py-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "dashboard" ? "text-primary" : "text-gray-500"
            }`}
          >
            <BarChart3 className="h-6 w-6 mb-1" />
            <span className="text-xs">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("routes")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "routes" ? "text-primary" : "text-gray-500"
            }`}
          >
            <RouteIcon className="h-6 w-6 mb-1" />
            <span className="text-xs">Routes</span>
          </button>
          <button
            onClick={() => setActiveTab("tracking")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "tracking" ? "text-primary" : "text-gray-500"
            }`}
          >
            <TrendingUp className="h-6 w-6 mb-1" />
            <span className="text-xs">Tracking</span>
          </button>
          <button
            onClick={() => setActiveTab("gps")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "gps" ? "text-primary" : "text-gray-500"
            }`}
          >
            <MapPin className="h-6 w-6 mb-1" />
            <span className="text-xs">GPS</span>
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "reports" ? "text-primary" : "text-gray-500"
            }`}
          >
            <FileText className="h-6 w-6 mb-1" />
            <span className="text-xs">Reports</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "settings" ? "text-primary" : "text-gray-500"
            }`}
          >
            <Settings className="h-6 w-6 mb-1" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
