import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bus, Route as RouteIcon, Users, CheckCircle, Clock, MapPin, Phone, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DriverWelcome from "./driver-welcome";

interface SimpleDriverDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function SimpleDriverDashboard({ user, onLogout }: SimpleDriverDashboardProps) {
  const [currentView, setCurrentView] = useState<"welcome" | "routes" | "notify">("welcome");
  const [activeSession, setActiveSession] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch driver's routes
  const { data: routes = [], isLoading } = useQuery({
    queryKey: [`/api/drivers/${user.id}/routes`],
  });

  // Fetch today's sessions
  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: [`/api/drivers/${user.id}/sessions/today`],
  });

  // Fetch session pickups for active session
  const activeSessionData = sessions.find((s: any) => s.status === "in_progress");
  const { data: sessionPickups = [] } = useQuery({
    queryKey: [`/api/student-pickups?sessionId=${activeSessionData?.id}`],
    enabled: !!activeSessionData?.id,
    refetchInterval: 5000, // Update every 5 seconds
  });

  const handleStartRoute = async () => {
    const currentRoute = routes[0];
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
      refetchSessions();

      toast({
        title: "Route Started",
        description: "You've started your pickup session. Stay safe!",
      });

      setCurrentView("routes");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start route",
        variant: "destructive",
      });
    }
  };

  const handleCompleteRoute = async () => {
    if (!activeSessionData) return;

    try {
      await apiRequest("PATCH", `/api/pickup-sessions/${activeSessionData.id}`, {
        status: "completed",
        endTime: new Date().toISOString(),
      });

      setActiveSession(null);
      refetchSessions();

      toast({
        title: "Route Completed",
        description: "Great job! Your route has been completed.",
      });

      setCurrentView("welcome");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete route",
        variant: "destructive",
      });
    }
  };

  const markStudentPickup = async (studentId: number, status: string) => {
    if (!activeSessionData) return;

    try {
      await apiRequest("POST", `/api/student-pickups`, {
        sessionId: activeSessionData.id,
        studentId,
        status,
        pickedUpAt: status === 'picked_up' ? new Date().toISOString() : null,
      });

      // Refresh the pickup data
      queryClient.invalidateQueries({ queryKey: [`/api/student-pickups?sessionId=${activeSessionData.id}`] });

      toast({
        title: "Student Updated",
        description: `Student marked as ${status.replace('_', ' ')}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update student status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't show separate welcome screen - integrate it into the navigation

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Route Runner</h1>
            </div>
            <Button onClick={onLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 pb-20">
        {currentView === "welcome" && (
          <DriverWelcome 
            user={user} 
            onLogout={onLogout}
            onProceedToRoute={() => {
              toast({
                title: "Safety Checklist Complete",
                description: "Use the Routes tab below to start your pickup session.",
              });
            }}
          />
        )}

        {currentView === "routes" && (
          <div className="space-y-4">
            {/* Route Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Your Route</h2>
              {activeSessionData ? (
                <Button onClick={handleCompleteRoute} variant="outline">
                  Complete Route
                </Button>
              ) : (
                <Button onClick={handleStartRoute} className="bg-green-600 hover:bg-green-700">
                  Start Route
                </Button>
              )}
            </div>

            {/* Route Information */}
            {routes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <RouteIcon className="h-5 w-5 mr-2 text-blue-600" />
                    {routes[0].name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-gray-600" />
                      <span>{routes[0].totalStudents || 0} students</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      <span>{routes[0].schools?.length || 0} schools</span>
                    </div>
                  </div>

                  {/* Schools and Students */}
                  {routes[0].schools && routes[0].schools.map((schoolData: any, index: number) => (
                    <div key={schoolData.id} className="border rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium">{schoolData.school?.name}</h4>
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <Clock className="h-3 w-3" />
                              <span>Dismissal: {schoolData.school?.dismissalTime}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {schoolData.students?.length || 0} students
                          </div>
                        </div>
                      </div>

                      {/* Students List */}
                      {schoolData.students && schoolData.students.map((student: any) => {
                        const pickup = sessionPickups.find((p: any) => p.studentId === student.id);
                        const isPickedUp = pickup?.status === 'picked_up';
                        const isNotPresent = pickup?.status === 'no_show';

                        return (
                          <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{student.name}</div>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <span>Grade: {student.grade}</span>
                                {student.phone && (
                                  <>
                                    <span>•</span>
                                    <div className="flex items-center">
                                      <Phone className="h-3 w-3 mr-1" />
                                      <span>{student.phone}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {activeSessionData && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant={isPickedUp ? "default" : "outline"}
                                  onClick={() => markStudentPickup(student.id, 'picked_up')}
                                  disabled={isPickedUp}
                                  className={isPickedUp ? "bg-green-600 hover:bg-green-700" : ""}
                                >
                                  {isPickedUp ? "Picked Up" : "Pick Up"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={isNotPresent ? "destructive" : "outline"}
                                  onClick={() => markStudentPickup(student.id, 'no_show')}
                                  disabled={isNotPresent}
                                >
                                  {isNotPresent ? "Not Present" : "Not Present"}
                                </Button>
                              </div>
                            )}
                            
                            {!activeSessionData && (
                              <Badge variant="secondary">Ready</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {currentView === "notify" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Report Issues</h3>
                <p className="text-gray-600 mb-4">
                  Need to report a vehicle issue or maintenance concern? Contact your administrator.
                </p>
                <Button variant="outline">
                  Contact Admin
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation - Enhanced for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
        <div className="flex justify-around py-3 px-2">
          <Button
            variant={currentView === "routes" ? "default" : "ghost"}
            onClick={() => setCurrentView("routes")}
            className="flex-1 flex flex-col items-center py-4 mx-1 text-xs font-medium"
          >
            <RouteIcon className="h-6 w-6 mb-1" />
            <span>Routes</span>
          </Button>
          <Button
            variant={currentView === "notify" ? "default" : "ghost"}
            onClick={() => setCurrentView("notify")}
            className="flex-1 flex flex-col items-center py-4 mx-1 text-xs font-medium"
          >
            <AlertTriangle className="h-6 w-6 mb-1" />
            <span>Notify</span>
          </Button>
          <Button
            variant={currentView === "welcome" ? "default" : "ghost"}
            onClick={() => setCurrentView("welcome")}
            className="flex-1 flex flex-col items-center py-4 mx-1 text-xs font-medium"
          >
            <Users className="h-6 w-6 mb-1" />
            <span>Welcome</span>
          </Button>
        </div>
      </div>
    </div>
  );
}