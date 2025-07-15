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
import AdvancedRouteCreator from "@/components/leadership/advanced-route-creator";
import StudentAbsenceManagement from "@/components/leadership/student-absence-management";
import AbsenceExport from "@/components/leadership/absence-export";

import AdminGpsTracking from "@/components/leadership/admin-gps-tracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { PushNotificationSetup } from "@/components/leadership/push-notification-setup";
import UnassignedSchools from "@/components/leadership/unassigned-schools";
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
  const [routesView, setRoutesView] = useState<"management" | "schools" | "students" | "routes" | "optimizer" | "multi-optimizer" | "creator">("management");
  const [absenceView, setAbsenceView] = useState<"management" | "export">("management");
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  // FIX #5: WEEKLY PERFORMANCE WITH DRIVER BREAKDOWN
  const [selectedPerformanceDay, setSelectedPerformanceDay] = useState<any>(null);
  const [weeklyPerformance, setWeeklyPerformance] = useState([
    { 
      day: 'M', 
      percentage: 95,
      drivers: [
        { name: 'John D.', percentage: 98 },
        { name: 'Sarah M.', percentage: 92 },
        { name: 'Mike K.', percentage: 96 }
      ]
    },
    { 
      day: 'T', 
      percentage: 88,
      drivers: [
        { name: 'John D.', percentage: 85 },
        { name: 'Sarah M.', percentage: 90 },
        { name: 'Mike K.', percentage: 89 }
      ]
    },
    { 
      day: 'W', 
      percentage: 92,
      drivers: [
        { name: 'John D.', percentage: 94 },
        { name: 'Sarah M.', percentage: 88 },
        { name: 'Mike K.', percentage: 95 }
      ]
    },
    { 
      day: 'T', 
      percentage: 96,
      drivers: [
        { name: 'John D.', percentage: 97 },
        { name: 'Sarah M.', percentage: 95 },
        { name: 'Mike K.', percentage: 96 }
      ]
    },
    { 
      day: 'F', 
      percentage: 90,
      drivers: [
        { name: 'John D.', percentage: 93 },
        { name: 'Sarah M.', percentage: 87 },
        { name: 'Mike K.', percentage: 90 }
      ]
    }
  ]);

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
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    retry: false,
  });

  // Fetch real-time student pickups for today
  const { data: allStudentPickups = [] } = useQuery({
    queryKey: ['/api/student-pickups/today'],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time pickup updates
    retry: false,
  });

  // Fetch active issues for alerts - REAL-TIME with 10-second refresh
  const { data: issues = [] } = useQuery({
    queryKey: ['/api/issues'],
    refetchInterval: 10000, // Refresh every 10 seconds for real-time alerts
  });

  // Fetch missed school alerts for alert count - REAL-TIME with 10-second refresh
  const { data: missedAlerts = [] } = useQuery({
    queryKey: ['/api/missed-school-alerts'],
    refetchInterval: 10000, // Refresh every 10 seconds for real-time alerts
  });

  // Fetch active driver locations for real-time data
  const { data: driverLocations = [] } = useQuery({
    queryKey: ['/api/driver-locations'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate dashboard metrics with real data
  const sessionsData = Array.isArray(sessions) ? (sessions as any[]) : [];
  const activeRoutes = sessionsData.filter((s: any) => s.status === "in_progress").length;
  
  // Calculate total students and pickups from real-time pickup data
  const pickupsData = Array.isArray(allStudentPickups) ? (allStudentPickups as any[]) : [];
  const totalStudents = pickupsData.length;
  const completedPickups = pickupsData.filter((p: any) => p.status === 'picked_up').length;
  
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
          <div className="p-2 sm:p-4 space-y-6">
            {/* Enhanced Date Range Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <h3 className="text-lg font-semibold">Dashboard Overview</h3>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600 font-medium">Date Range:</label>
                      <input
                        type="date"
                        value={selectedDateRange.start}
                        onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm"
                      />
                      <span className="text-sm text-gray-500">to</span>
                      <input
                        type="date"
                        value={selectedDateRange.end}
                        onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setSelectedDateRange({ start: today, end: today });
                        }}
                        className="text-xs"
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                          setSelectedDateRange({ 
                            start: week.toISOString().split('T')[0],
                            end: today.toISOString().split('T')[0]
                          });
                        }}
                        className="text-xs"
                      >
                        Last 7 Days
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dashboard Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Routes</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary">{activeRoutes}</p>
                    </div>
                    <RouteIcon className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="relative group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">On Time %</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">{onTimePercentage}%</p>
                    </div>
                    <Clock className="h-8 w-8 text-green-600" />
                  </div>
                  
                  {/* Hover tooltip with driver breakdown */}
                  <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg min-w-[200px]">
                    <div className="font-semibold mb-2">On Time % by Driver:</div>
                    {users.filter((user: any) => user.role === 'driver').map((driver: any) => {
                      const driverSessions = sessionsData.filter((s: any) => s.driverId === driver.id);
                      const driverTotal = driverSessions.reduce((sum: number, session: any) => 
                        sum + (session.pickupDetails?.length || 0), 0);
                      const driverCompleted = driverSessions.reduce((sum: number, session: any) => 
                        sum + (session.pickupDetails?.filter((p: any) => p.status === 'picked_up').length || 0), 0);
                      const driverPercentage = driverTotal > 0 ? Math.round((driverCompleted / driverTotal) * 100) : 0;
                      
                      return (
                        <div key={driver.id} className="flex justify-between py-1">
                          <span>{driver.firstName} {driver.lastName}:</span>
                          <span className="font-semibold">{driverPercentage}%</span>
                        </div>
                      );
                    })}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pickups</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-800">{completedPickups}/{totalStudents}</p>
                    </div>
                    <Users className="h-8 w-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">Active Alerts</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xl sm:text-2xl font-bold text-red-600">{activeAlerts}</p>
                        {activeAlerts > 0 && (
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="text-xs text-red-500 mt-1">
                        Real-time: {missedSchoolCount} missed + {recentIssuesCount} issues + {behindScheduleRoutes} behind
                      </div>
                    </div>
                    <AlertTriangle className={`h-8 w-8 text-red-600 ${activeAlerts > 0 ? 'animate-bounce' : ''}`} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Alerts section removed as requested */}

            {/* Route Status Overview */}
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-3">Active Route Status</h3>
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
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                      <div 
                        key={day} 
                        className="font-medium text-gray-600 relative group cursor-pointer"
                        title={`View ${day} performance details`}
                      >
                        {day}
                        
                        {/* Hover tooltip with driver breakdown */}
                        <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg min-w-[200px]">
                          <div className="font-semibold mb-2">{day} Performance:</div>
                          {users.filter((user: any) => user.role === 'driver').map((driver: any) => {
                            // Calculate driver performance for this day
                            const driverSessions = sessionsData.filter((s: any) => {
                              const sessionDate = new Date(s.date);
                              const dayOfWeek = sessionDate.getDay();
                              const targetDay = (index + 1) % 7; // Convert to match JS getDay()
                              return s.driverId === driver.id && dayOfWeek === targetDay;
                            });
                            
                            const driverTotal = driverSessions.reduce((sum: number, session: any) => 
                              sum + (session.pickupDetails?.length || 0), 0);
                            const driverCompleted = driverSessions.reduce((sum: number, session: any) => 
                              sum + (session.pickupDetails?.filter((p: any) => p.status === 'picked_up').length || 0), 0);
                            
                            const percentage = driverTotal > 0 ? Math.round((driverCompleted / driverTotal) * 100) : 0;
                            
                            return (
                              <div key={driver.id} className="flex justify-between mb-1">
                                <span>{driver.firstName} {driver.lastName}:</span>
                                <span className={percentage >= 90 ? 'text-green-400' : percentage >= 70 ? 'text-yellow-400' : 'text-red-400'}>
                                  {percentage}%
                                </span>
                              </div>
                            );
                          })}
                          <div className="border-t border-gray-600 mt-2 pt-2">
                            <div className="flex justify-between font-semibold">
                              <span>Average:</span>
                              <span className="text-blue-400">
                                {users.filter((u: any) => u.role === 'driver').length > 0 
                                  ? Math.round(users.filter((u: any) => u.role === 'driver').reduce((sum: number, driver: any) => {
                                      const driverSessions = sessionsData.filter((s: any) => {
                                        const sessionDate = new Date(s.date);
                                        const dayOfWeek = sessionDate.getDay();
                                        const targetDay = (index + 1) % 7;
                                        return s.driverId === driver.id && dayOfWeek === targetDay;
                                      });
                                      
                                      const driverTotal = driverSessions.reduce((sum2: number, session: any) => 
                                        sum2 + (session.pickupDetails?.length || 0), 0);
                                      const driverCompleted = driverSessions.reduce((sum2: number, session: any) => 
                                        sum2 + (session.pickupDetails?.filter((p: any) => p.status === 'picked_up').length || 0), 0);
                                      
                                      return sum + (driverTotal > 0 ? (driverCompleted / driverTotal) * 100 : 0);
                                    }, 0) / users.filter((u: any) => u.role === 'driver').length)
                                  : 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {weeklyPerformance.map((day, index) => (
                      <div 
                        key={index}
                        className={`cursor-pointer rounded py-2 text-sm font-medium transition-all hover:opacity-80 ${
                          day.percentage >= 95 ? 'bg-green-600 text-white' : 
                          day.percentage >= 85 ? 'bg-orange-600 text-white' : 'bg-red-600 text-white'
                        }`}
                        onClick={() => setSelectedPerformanceDay(selectedPerformanceDay?.day === day.day ? null : day)}
                        title={`${day.day}: ${day.percentage}% - Tap for driver breakdown`}
                      >
                        {day.percentage}%
                      </div>
                    ))}
                    <div className="bg-primary text-white rounded py-2 text-sm font-medium">Today</div>
                    <div className="bg-gray-200 text-gray-400 rounded py-2 text-sm">--</div>
                  </div>
                  {selectedPerformanceDay && (
                    <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                      <div className="font-medium text-gray-800 mb-2">
                        {selectedPerformanceDay.day} Driver Performance Breakdown:
                      </div>
                      <div className="space-y-1">
                        {selectedPerformanceDay.drivers?.map((driver: any, i: number) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-gray-700">{driver.name}</span>
                            <span className={`font-medium ${
                              driver.percentage >= 95 ? 'text-green-600' : 
                              driver.percentage >= 85 ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {driver.percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "routes" && !showForm && (
          <div className="p-2 sm:p-4 space-y-4">
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
            {/* FIX #4: MOBILE RESPONSIVE BUTTON LAYOUT */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 mb-4 overflow-hidden">
              <Button
                variant={routesView === "management" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("management")}
                className="text-xs px-1 py-1 h-8 truncate"
              >
                Setup
              </Button>
              <Button
                variant={routesView === "schools" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("schools")}
                className="text-xs px-1 py-1 h-8 truncate"
              >
                Schools
              </Button>
              <Button
                variant={routesView === "students" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("students")}
                className="text-xs px-1 py-1 h-8 truncate"
              >
                Students
              </Button>
              <Button
                variant={routesView === "routes" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("routes")}
                className="text-xs px-1 py-1 h-8 truncate"
              >
                Routes
              </Button>
              <Button
                variant={routesView === "creator" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoutesView("creator")}
                className="text-xs px-1 py-1 h-8 col-span-2 sm:col-span-1 truncate"
              >
                <Calculator className="h-3 w-3 mr-1" />
                Creator
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
                  <div className="border-t pt-3">
                    <PushNotificationSetup />
                  </div>
                </CardContent>
              </Card>
            )}

            {routesView === "schools" && <SchoolsList onAddSchool={() => setShowForm("school")} />}

            {routesView === "students" && <StudentsList onAddStudent={() => setShowForm("student")} />}

            {routesView === "routes" && !editingRoute && (
              <div className="space-y-4">
                {/* Current Routes */}
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
                
                {/* Unassigned Schools with Drag & Drop */}
                <UnassignedSchools />
              </div>
            )}

            {routesView === "creator" && (
              <div className="p-2 sm:p-4">
                <AdvancedRouteCreator onClose={() => setRoutesView("routes")} />
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
          <div className="p-2 sm:p-4">
            <UsersList onAddUser={() => setShowForm("user")} />
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
          <div className="p-2 sm:p-4">
            <PickupHistory />
          </div>
        )}

        {activeTab === "absences" && (
          <div className="p-2 sm:p-4">
            {absenceView === "management" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Student Absence Management</h2>
                  <Button 
                    variant="outline" 
                    onClick={() => setAbsenceView("export")}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export Absences
                  </Button>
                </div>
                <StudentAbsenceManagement />
              </div>
            )}
            {absenceView === "export" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Absence Export</h2>
                  <Button 
                    variant="outline" 
                    onClick={() => setAbsenceView("management")}
                  >
                    Back to Management
                  </Button>
                </div>
                <AbsenceExport />
              </div>
            )}
          </div>
        )}

        {activeTab === "gps" && (
          <div className="p-2 sm:p-4">
            <AdminGpsTracking userId={user.id} />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="p-2 sm:p-4">
            <ProfileSettings />
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
            <span className="text-xs">GPS Tracking</span>
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
