import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";
import Navigation from "@/components/shared/navigation";
import RouteStatus from "@/components/leadership/route-status";
import AlertCard from "@/components/leadership/alert-card";
import { Card, CardContent } from "@/components/ui/card";
import { useWebSocket } from "@/hooks/use-websocket";
import { 
  BarChart3, 
  Route as RouteIcon, 
  FileText, 
  Settings,
  TrendingUp,
  Clock,
  Users,
  AlertTriangle
} from "lucide-react";

interface LeadershipDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function LeadershipDashboard({ user, onLogout }: LeadershipDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "routes" | "reports" | "settings">("dashboard");

  // WebSocket connection for real-time updates
  useWebSocket(user.id);

  // Fetch today's sessions for overview
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['/api/pickup-sessions/today'],
  });

  // Calculate dashboard metrics
  const activeRoutes = sessions.filter((s: any) => s.status === "in_progress").length;
  const totalStudents = sessions.reduce((sum: number, s: any) => sum + s.totalStudents, 0);
  const completedPickups = sessions.reduce((sum: number, s: any) => sum + s.completedPickups, 0);
  const onTimePercentage = totalStudents > 0 ? Math.round((completedPickups / totalStudents) * 100) : 0;
  const activeAlerts = sessions.filter((s: any) => 
    s.status === "in_progress" && s.progressPercent < 50
  ).length;

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

        {activeTab === "routes" && (
          <div className="p-4">
            <Card>
              <CardContent className="p-6 text-center">
                <RouteIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Route Management</h3>
                <p className="text-gray-600">
                  Detailed route configuration and management tools
                </p>
              </CardContent>
            </Card>
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
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Account Settings</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {user.firstName} {user.lastName}</p>
                      <p><span className="font-medium">Username:</span> {user.username}</p>
                      <p><span className="font-medium">Role:</span> {user.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              </CardContent>
            </Card>
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
