import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@/lib/types";
import Navigation from "@/components/shared/navigation";
import StudentList from "@/components/driver/student-list";
import IssueForm from "@/components/driver/issue-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { apiRequest } from "@/lib/queryClient";
import { 
  Navigation as NavigationIcon, 
  AlertTriangle, 
  Clock,
  MapPin,
  Users,
  Car,
  CheckCircle,
  Route as RouteIcon,
  Wrench
} from "lucide-react";

interface DriverDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function DriverDashboard({ user, onLogout }: DriverDashboardProps) {
  const [activeTab, setActiveTab] = useState("routes");
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState<"issue" | "maintenance" | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { location, startTracking, stopTracking } = useGeolocation();
  
  // GPS tracking for active sessions
  useLocationTracking({
    userId: user.id,
    sessionId: activeSession?.id,
    enabled: isTracking && activeSession !== null,
    updateInterval: 30000, // Update every 30 seconds
  });

  // WebSocket connection for real-time updates
  useWebSocket(user.id);

  // Fetch driver's routes with detailed school and student information
  const { data: routes = [], isLoading: routesLoading, refetch: refetchRoutes } = useQuery({
    queryKey: [`/api/drivers/${user.id}/routes`],
  }) as { data: any[], isLoading: boolean, refetch: () => void };

  // Fetch today's sessions
  const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: [`/api/drivers/${user.id}/sessions/today`],
  }) as { data: any[], isLoading: boolean, refetch: () => void };

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
        startTime: new Date().toISOString(),
      });

      setActiveSession(session);
      startTracking();
      refetchSessions();

      toast({
        title: "Route Started",
        description: "You've started the pickup session. Stay safe!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start route",
        variant: "destructive",
      });
    }
  };

  const handleCompleteRoute = async () => {
    if (!currentActiveSession) return;

    try {
      // Use the new completion endpoint that saves to history
      await apiRequest("POST", `/api/pickup-sessions/${currentActiveSession.id}/complete`, {
        notes: "Route completed successfully"
      });

      setActiveSession(null);
      stopTracking();
      refetchSessions();

      // Redirect to route summary page
      setLocation(`/route-summary/${currentActiveSession.id}`);

      toast({
        title: "Route Completed",
        description: "Great job! Your route has been completed and saved to history.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete route",
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
        description: "Failed to mark student as picked up",
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
  // Find the most recent active session
  const activeSessionFromList = (sessions as any[]).find(s => s.status === "in_progress");
  const currentActiveSession = activeSession || activeSessionFromList;
  const hasActiveSession = !!currentActiveSession;
  
  // Debug logging
  console.log('Session debug:', { 
    sessions, 
    activeSession, 
    activeSessionFromList, 
    currentActiveSession, 
    hasActiveSession,
    sessionId: currentActiveSession?.id 
  });

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
                            <StudentList
                              students={schoolData.students}
                              isActive={hasActiveSession}
                              sessionId={currentActiveSession?.id}
                            />
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
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <NavigationIcon className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Route Navigation</h3>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-2" />
                  <p>Map view coming soon...</p>
                  <p className="text-sm mt-2">Use your preferred navigation app for now</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "session" && (
          <div className="p-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Car className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Current Session</h3>
                </div>
                
                {hasActiveSession ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Session Active</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-2xl font-bold text-gray-800">{totalStudents}</div>
                        <div className="text-sm text-gray-600">Total Students</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-2xl font-bold text-green-600">0</div>
                        <div className="text-sm text-gray-600">Picked Up</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Car className="h-12 w-12 mx-auto mb-2" />
                    <p>No active session</p>
                    <p className="text-sm">Start your route to begin tracking</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

        {activeTab === "profile" && (
          <div className="p-4 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Driver Profile</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {user.firstName} {user.lastName}</p>
                      <p><span className="font-medium">Username:</span> {user.username}</p>
                      <p><span className="font-medium">Role:</span> {user.role}</p>
                    </div>
                  </div>

                  {/* Issue Reporting Section */}
                  <div className="pt-4 border-t">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Report Issues</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <Button
                        onClick={() => setShowIssueForm("issue")}
                        className="bg-red-600 hover:bg-red-700 text-white flex items-center justify-center space-x-2"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span>Report Issue</span>
                      </Button>
                      <Button
                        onClick={() => setShowIssueForm("maintenance")}
                        className="bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center space-x-2"
                      >
                        <Wrench className="h-4 w-4" />
                        <span>Van Maintenance</span>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <button
                      onClick={onLogout}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-lg py-2 font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Issue Form Modal */}
      {showIssueForm && showIssueForm !== null && (
        <IssueForm
          driverId={user.id}
          issueType={showIssueForm}
          onClose={() => setShowIssueForm(null)}
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab("routes")}
            className={`flex flex-col items-center py-3 px-2 text-xs ${
              activeTab === "routes" ? "text-blue-600 bg-blue-50" : "text-gray-600"
            }`}
          >
            <RouteIcon className="h-5 w-5 mb-1" />
            Route
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center py-3 px-2 text-xs ${
              activeTab === "map" ? "text-blue-600 bg-blue-50" : "text-gray-600"
            }`}
          >
            <NavigationIcon className="h-5 w-5 mb-1" />
            Navigate
          </button>
          <button
            onClick={() => setActiveTab("session")}
            className={`flex flex-col items-center py-3 px-2 text-xs ${
              activeTab === "session" ? "text-blue-600 bg-blue-50" : "text-gray-600"
            }`}
          >
            <Car className="h-5 w-5 mb-1" />
            Session
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center py-3 px-2 text-xs ${
              activeTab === "profile" ? "text-blue-600 bg-blue-50" : "text-gray-600"
            }`}
          >
            <Users className="h-5 w-5 mb-1" />
            Profile
          </button>
        </div>
      </div>
    </div>
  );
}