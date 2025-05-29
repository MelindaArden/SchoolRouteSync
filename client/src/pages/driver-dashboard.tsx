import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";
import Navigation from "@/components/shared/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useGeolocation } from "@/hooks/use-geolocation";
import { apiRequest } from "@/lib/queryClient";
import { 
  Navigation as NavigationIcon, 
  AlertTriangle, 
  Clock,
  MapPin,
  Users,
  Route as RouteIcon,
  Home,
  User as UserIcon
} from "lucide-react";

interface DriverDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function DriverDashboard({ user, onLogout }: DriverDashboardProps) {
  const [activeTab, setActiveTab] = useState<"routes" | "map" | "students" | "profile">("routes");
  const [activeSession, setActiveSession] = useState<any>(null);
  const { toast } = useToast();
  const { location, startTracking, stopTracking } = useGeolocation();

  // WebSocket connection for real-time updates
  useWebSocket(user.id);

  // Fetch driver's routes with detailed school and student information
  const { data: routes = [], isLoading: routesLoading, refetch: refetchRoutes } = useQuery({
    queryKey: [`/api/drivers/${user.id}/routes`],
  });

  // Fetch today's sessions
  const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: [`/api/drivers/${user.id}/sessions/today`],
  });

  // Get the current active route (first route assigned to driver)
  const currentRoute = routes.length > 0 ? routes[0] : null;

  const handleStartRoute = async () => {
    if (!currentRoute) return;

    try {
      const session = await apiRequest("POST", `/api/pickup-sessions`, {
        routeId: currentRoute.id,
        driverId: user.id,
        date: new Date().toISOString().split('T')[0],
        status: "in_progress",
      });

      setActiveSession(session);
      startTracking();
      refetchSessions();
      
      toast({
        title: "Route Started",
        description: "You can now begin picking up students.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start route. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteRoute = async () => {
    if (!activeSession) return;

    try {
      await apiRequest("PATCH", `/api/pickup-sessions/${activeSession.id}`, {
        status: "completed",
        completedTime: new Date().toISOString(),
      });

      setActiveSession(null);
      stopTracking();
      refetchSessions();
      
      toast({
        title: "Route Completed",
        description: "All pickups have been completed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete route. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMarkStudentPickedUp = async (studentId: number) => {
    if (!activeSession) return;

    try {
      // Find the student pickup record and update it
      const response = await fetch(`/api/student-pickups?sessionId=${activeSession.id}`);
      const studentPickups = await response.json();
      const pickup = studentPickups.find((p: any) => p.studentId === studentId);
      
      if (pickup) {
        await apiRequest("PATCH", `/api/student-pickups/${pickup.id}`, {
          status: "picked_up",
          pickedUpAt: new Date().toISOString(),
        });

        refetchSessions();
        toast({
          title: "Student Picked Up",
          description: "Student has been marked as picked up.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update pickup status.",
        variant: "destructive",
      });
    }
  };

  if (routesLoading || sessionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalStudents = currentRoute?.totalStudents || 0;
  const hasActiveSession = activeSession || (sessions.length > 0 && sessions[0].status === "in_progress");

  if (!currentRoute) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} onLogout={onLogout} role="driver" />
        
        <div className="max-w-md mx-auto pt-20 p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Route Assigned</h3>
              <p className="text-gray-600">
                You don't have any routes assigned yet. Please contact your administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        user={user} 
        onLogout={onLogout}
        role="driver"
      />

      <div className="pb-20">
        {activeTab === "routes" && (
          <div className="p-4 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{currentRoute.name}</h3>
                    <p className="text-sm text-gray-600">
                      {currentRoute.schools?.length || 0} schools • {currentRoute.totalStudents || 0} students
                    </p>
                  </div>
                  {!hasActiveSession ? (
                    <Button onClick={handleStartRoute} className="bg-green-600 hover:bg-green-700">
                      Start Route
                    </Button>
                  ) : (
                    <Button onClick={handleCompleteRoute} variant="outline">
                      Complete Route
                    </Button>
                  )}
                </div>

                {currentRoute.schools && currentRoute.schools.length > 0 && (
                  <div className="space-y-3">
                    {currentRoute.schools.map((schoolData: any, index: number) => (
                      <div key={schoolData.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">{schoolData.school?.name}</h4>
                              <div className="flex items-center space-x-1 text-sm text-gray-600">
                                <MapPin className="h-3 w-3" />
                                <span>{schoolData.school?.address}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <Clock className="h-3 w-3" />
                              <span>Dismissal: {schoolData.school?.dismissalTime}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                              <Users className="h-3 w-3" />
                              <span>{schoolData.students?.length || 0} students</span>
                            </div>
                          </div>
                        </div>

                        {schoolData.students && schoolData.students.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-gray-700">Students to pick up:</h5>
                            <div className="grid gap-2">
                              {schoolData.students.map((student: any) => (
                                <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div>
                                    <span className="font-medium">{student.firstName} {student.lastName}</span>
                                    <span className="text-sm text-gray-600 ml-2">Grade {student.grade}</span>
                                  </div>
                                  {hasActiveSession && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleMarkStudentPickedUp(student.id)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Pick Up
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(!currentRoute.schools || currentRoute.schools.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <RouteIcon className="h-12 w-12 mx-auto mb-2" />
                    <p>No schools assigned to this route yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "map" && (
          <div className="p-4">
            <Card>
              <CardContent className="p-6 text-center">
                <NavigationIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Navigation</h3>
                <p className="text-gray-600">
                  Map integration for route navigation will be available here.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "students" && (
          <div className="p-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Student List</h3>
                <p className="text-gray-600">
                  Complete student roster and pickup history.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="p-4">
            <Card>
              <CardContent className="p-6 text-center">
                <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Profile Settings</h3>
                <p className="text-gray-600">
                  Manage your driver profile and preferences.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          <button
            onClick={() => setActiveTab("routes")}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg ${
              activeTab === "routes" ? "bg-blue-100 text-blue-600" : "text-gray-600"
            }`}
          >
            <RouteIcon className="h-5 w-5" />
            <span className="text-xs">Routes</span>
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg ${
              activeTab === "map" ? "bg-blue-100 text-blue-600" : "text-gray-600"
            }`}
          >
            <NavigationIcon className="h-5 w-5" />
            <span className="text-xs">Map</span>
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg ${
              activeTab === "students" ? "bg-blue-100 text-blue-600" : "text-gray-600"
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Students</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg ${
              activeTab === "profile" ? "bg-blue-100 text-blue-600" : "text-gray-600"
            }`}
          >
            <UserIcon className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}