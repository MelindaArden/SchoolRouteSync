import { useState, useEffect } from "react";
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
import StudentsList from "@/components/leadership/students-list";
import UsersList from "@/components/leadership/users-list";
import UserForm from "@/components/leadership/user-form";
import ExpandableRouteCard from "@/components/leadership/expandable-route-card";

import ProfileSettings from "@/components/leadership/profile-settings";
import DriverLocationMap from "@/components/leadership/driver-location-map";
import PickupHistory from "@/components/leadership/pickup-history";
import RouteOptimizer from "@/components/leadership/route-optimizer";
import MultiDriverRouteOptimizer from "@/components/leadership/multi-driver-route-optimizer";
import StudentAbsenceManagement from "@/components/leadership/student-absence-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { PushNotificationSetup } from "@/components/leadership/push-notification-setup";
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
  MapPin,
  Calculator
} from "lucide-react";

interface LeadershipDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function LeadershipDashboard({ user, onLogout }: LeadershipDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "routes" | "gps" | "users" | "reports" | "history" | "absences" | "settings">("dashboard");
  const [showForm, setShowForm] = useState<"school" | "student" | "driver" | "route" | "user" | null>(null);
  const [routesView, setRoutesView] = useState<"management" | "schools" | "students" | "routes" | "optimizer" | "multi-optimizer">("management");
  const [editingRoute, setEditingRoute] = useState<any>(null);

  // WebSocket connection for real-time updates
  useWebSocket(user.id);

  // Push notifications for browser alerts
  const { showDriverAlert, canNotify } = usePushNotifications({ 
    enabled: true,
    onNotificationClick: (data) => {
      // Focus on alerts/issues when notification is clicked
      setActiveTab("dashboard");
    }
  });

  // Set up global push notification dispatcher for WebSocket
  useEffect(() => {
    if (canNotify) {
      (window as any).dispatchPushNotification = showDriverAlert;
    } else {
      (window as any).dispatchPushNotification = null;
    }

    return () => {
      (window as any).dispatchPushNotification = null;
    };
  }, [canNotify, showDriverAlert]);

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

  // Fetch active issues for alerts
  const { data: issues = [] } = useQuery({
    queryKey: ['/api/issues'],
  });

  // Fetch missed school alerts  
  const { data: missedSchoolAlerts = [] } = useQuery({
    queryKey: ['/api/missed-school-alerts'],
  });

  // Fetch missed school alerts for alert count
  const { data: missedAlerts = [] } = useQuery({
    queryKey: ['/api/missed-school-alerts'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch active driver locations for real-time data
  const { data: driverLocations = [] } = useQuery({
    queryKey: ['/api/driver-locations'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate dashboard metrics with real data
  const sessionsData = Array.isArray(sessions) ? (sessions as any[]) : [];
  const activeRoutes = sessionsData.filter((s: any) => s.status === "in_progress").length;
  
  // Calculate total students and pickups from sessions
  let totalStudents = 0;
  let completedPickups = 0;
  
  sessionsData.forEach((session: any) => {
    if (session.pickupDetails && Array.isArray(session.pickupDetails)) {
      totalStudents += session.pickupDetails.length;
      completedPickups += session.pickupDetails.filter((p: any) => p.status === 'picked_up').length;
    }
  });

  // Calculate on-time percentage based on completed pickups
  const onTimePercentage = totalStudents > 0 ? Math.round((completedPickups / totalStudents) * 100) : 0;
  
  // Count all active alerts: missed schools + driver issues + behind schedule routes
  const alertsData = Array.isArray(missedAlerts) ? missedAlerts : [];
  const missedSchoolCount = alertsData.filter((alert: any) => 
    alert.status === 'active' || alert.status === 'pending'
  ).length;
  
  const behindScheduleRoutes = sessionsData.filter((session: any) => 
    session.status === "in_progress" && session.progressPercent < 50
  ).length;
  
  const recentIssuesData = Array.isArray(issues) ? issues : [];
  const recentIssuesCount = recentIssuesData.filter((issue: any) => {
    const issueDate = new Date(issue.createdAt);
    const today = new Date();
    return issueDate.toDateString() === today.toDateString() && issue.status !== 'resolved';
  }).length;
  
  const activeAlerts = missedSchoolCount + behindScheduleRoutes + recentIssuesCount;

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
                      <p className="text-sm text-gray-600">Pickups</p>
                      <p className="text-2xl font-bold text-gray-800">{completedPickups}/{totalStudents}</p>
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
                {/* Behind Schedule Routes */}
                {sessionsData
                  .filter((session: any) => session.status === "in_progress" && session.progressPercent < 50)
                  .map((session: any) => (
                    <AlertCard
                      key={`route-${session.id}`}
                      type="warning"
                      title={`Route ${session.route?.name} - Behind Schedule`}
                      message={`${session.driver?.firstName} ${session.driver?.lastName} has only completed ${session.progressPercent.toFixed(0)}% of pickups`}
                      timestamp="5 minutes ago"
                    />
                  ))}

                {/* Missed School Alerts */}
                {alertsData
                  .filter((alert: any) => alert.status === 'active' || alert.status === 'pending')
                  .map((alert: any) => (
                    <AlertCard
                      key={`missed-${alert.id}`}
                      type="error"
                      title={`Missed School Alert`}
                      message={`Driver late to ${alert.schoolName || 'school'} - Expected arrival time passed`}
                      timestamp={new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    />
                  ))}

                {/* Driver Issues */}
                {recentIssuesData
                  .filter((issue: any) => {
                    const issueDate = new Date(issue.createdAt);
                    const today = new Date();
                    return issueDate.toDateString() === today.toDateString() && issue.status !== 'resolved';
                  })
                  .map((issue: any) => (
                    <AlertCard
                      key={`issue-${issue.id}`}
                      type="error"
                      title={`Driver Issue - ${issue.type?.replace('_', ' ').toUpperCase() || 'General'}`}
                      message={issue.description || 'Driver reported an issue during route'}
                      timestamp={new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              <h3 className="text-lg font-medium text-gray-800 mb-3">Active Route Status</h3>
              <div className="space-y-3">
                {sessionsData
                  .filter((session: any) => session.status === "in_progress")
                  .map((session: any) => (
                    <RouteStatus
                      key={session.id}
                      routeName={session.route?.name || `Route ${session.id}`}
                      driverName={`${session.driver?.firstName} ${session.driver?.lastName}`}
                      status={session.status}
                      progress={session.progressPercent}
                      currentLocation="En route to next school"
                      studentsPickedUp={session.completedPickups}
                      totalStudents={session.totalStudents}
                    />
                  ))}
                {sessionsData.filter((session: any) => session.status === "in_progress").length === 0 && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-blue-800">No active routes in progress</p>
                    </CardContent>
                  </Card>
                )}
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
              <Button
                onClick={() => setRoutesView("optimizer")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Single Route
              </Button>
              <Button
                onClick={() => setRoutesView("multi-optimizer")}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Multi-Route
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
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRoutesView("students")}>
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
                variant={routesView === "students" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("students")}
                className="flex-1"
              >
                Students
              </Button>
              <Button
                variant={routesView === "routes" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("routes")}
                className="flex-1"
              >
                Routes
              </Button>
              <Button
                variant={routesView === "optimizer" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("optimizer")}
                className="flex-1"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Single Route
              </Button>
              <Button
                variant={routesView === "multi-optimizer" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("multi-optimizer")}
                className="flex-1"
              >
                <Calculator className="h-4 w-4 mr-1" />
                Multi-Route
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

            {routesView === "schools" && <SchoolsList onAddSchool={() => setShowForm("school")} />}

            {routesView === "students" && <StudentsList onAddStudent={() => setShowForm("student")} />}

            {routesView === "routes" && !editingRoute && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Routes ({routeCount})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.isArray(routes) && routes.length > 0 ? routes.map((route: any) => {
                    const driver = Array.isArray(users) ? users.find((u: any) => u.id === route.driverId) : null;
                    return (
                      <ExpandableRouteCard
                        key={route.id}
                        route={route}
                        driver={driver}
                        onEdit={() => setEditingRoute(route)}
                      />
                    );
                  }) : (
                    <p className="text-gray-500 text-center py-4">No routes created yet</p>
                  )}
                </CardContent>
              </Card>
            )}

            {routesView === "optimizer" && (
              <div className="p-4">
                <RouteOptimizer onSave={() => setRoutesView("routes")} />
              </div>
            )}

            {routesView === "multi-optimizer" && (
              <div className="p-4">
                <MultiDriverRouteOptimizer />
              </div>
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

        {showForm === "user" && (
          <div className="p-4">
            <UserForm onClose={() => setShowForm(null)} />
          </div>
        )}

        {activeTab === "users" && (
          <div className="p-4">
            <UsersList onAddUser={() => setShowForm("user")} />
          </div>
        )}



        {activeTab === "gps" && (
          <div className="p-4">
            <DriverLocationMap userId={user.id} />
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

        {activeTab === "history" && (
          <div className="p-4">
            <PickupHistory />
          </div>
        )}

        {activeTab === "absences" && (
          <div className="p-4">
            <StudentAbsenceManagement />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="p-4 space-y-6">
            <PushNotificationSetup />
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
            <span className="text-xs">Route Setup</span>
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
            onClick={() => setActiveTab("users")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "users" ? "text-primary" : "text-gray-500"
            }`}
          >
            <Users className="h-6 w-6 mb-1" />
            <span className="text-xs">Users</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "history" ? "text-primary" : "text-gray-500"
            }`}
          >
            <FileText className="h-6 w-6 mb-1" />
            <span className="text-xs">History</span>
          </button>
          <button
            onClick={() => setActiveTab("absences")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "absences" ? "text-primary" : "text-gray-500"
            }`}
          >
            <GraduationCap className="h-6 w-6 mb-1" />
            <span className="text-xs">Absences</span>
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
