import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bus, Route as RouteIcon, Users, CheckCircle, Clock, MapPin, Phone, AlertTriangle, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DriverWelcome from "./driver-welcome";
import RouteSummary from "./route-summary";

interface SimpleDriverDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function SimpleDriverDashboard({ user, onLogout }: SimpleDriverDashboardProps) {
  const [currentView, setCurrentView] = useState<"routes" | "notify" | "navigation" | "summary" | "welcome">("routes");
  const [activeSession, setActiveSession] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [checklistCompleted, setChecklistCompleted] = useState(false);
  const [completedSessionData, setCompletedSessionData] = useState<any>(null);
  const [completedPickupData, setCompletedPickupData] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch driver's routes with error handling
  const { data: routes = [], isLoading, error: routesError } = useQuery({
    queryKey: [`/api/drivers/${user.id}/routes`],
    retry: 0,
    staleTime: 30000,
  });

  // Fetch today's sessions with error handling
  const { data: sessions = [], refetch: refetchSessions, error: sessionsError } = useQuery({
    queryKey: [`/api/drivers/${user.id}/sessions/today`],
    retry: 0,
    staleTime: 15000,
  });

  // Fetch session pickups for active session
  const activeSessionData = sessions.find((s: any) => s.status === "in_progress");
  const { data: sessionPickups = [], refetch: refetchPickups } = useQuery({
    queryKey: [`/api/student-pickups`, { sessionId: activeSessionData?.id }],
    queryFn: () => 
      activeSessionData 
        ? fetch(`/api/student-pickups?sessionId=${activeSessionData.id}`).then(res => res.json())
        : Promise.resolve([]),
    enabled: !!activeSessionData?.id,
    refetchInterval: 2000, // Update every 2 seconds for real-time updates
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
      setShowWelcome(false); // Hide welcome page after route starts
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

  const handleChecklistComplete = () => {
    setChecklistCompleted(true);
    setShowWelcome(false);
    setCurrentView("routes");
  };

  const openDirections = (school: any) => {
    if (school.latitude && school.longitude) {
      const address = encodeURIComponent(`${school.latitude},${school.longitude}`);
      // Try to open in Apple Maps on iOS, Google Maps otherwise
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        window.open(`maps://maps.apple.com/?daddr=${address}`, '_blank');
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank');
      }
    } else if (school.address) {
      const address = encodeURIComponent(school.address);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        window.open(`maps://maps.apple.com/?daddr=${address}`, '_blank');
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank');
      }
    }
  };

  const handleCompleteRoute = async () => {
    if (!activeSessionData) return;

    // Get all students from the route
    const allStudents: any[] = [];
    routes[0]?.schools?.forEach((schoolData: any) => {
      if (schoolData.students) {
        allStudents.push(...schoolData.students);
      }
    });

    // Check if every student has a pickup record with a valid status
    const allStudentsMarked = allStudents.every((student: any) => {
      const pickup = sessionPickups.find((p: any) => p.studentId === student.id);
      return pickup && (pickup.status === 'picked_up' || pickup.status === 'no_show' || pickup.status === 'absent');
    });

    if (!allStudentsMarked) {
      const unmarkedStudents = allStudents.filter((student: any) => {
        const pickup = sessionPickups.find((p: any) => p.studentId === student.id);
        return !pickup || (pickup.status !== 'picked_up' && pickup.status !== 'no_show' && pickup.status !== 'absent');
      });
      
      console.log('Unmarked students:', unmarkedStudents.map(s => s.name));
      toast({
        title: "Cannot Complete Route",
        description: `Please mark all students as 'Picked Up' or 'Not Present' before completing the route. ${unmarkedStudents.length} students still need to be marked.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("PATCH", `/api/pickup-sessions/${activeSessionData.id}`, {
        status: "completed",
        endTime: new Date().toISOString(),
      });

      setActiveSession(null);
      refetchSessions();

      // Store completed session data for summary page with enhanced data
      const now = new Date().toISOString();
      const enhancedSessionData = {
        ...activeSessionData,
        startedAt: activeSessionData.startTime || activeSessionData.startedAt || activeSessionData.createdAt || now,
        completedAt: now,
        route: routes[0] // Include route information
      };
      
      // Enhance pickup data with student information
      const enhancedPickupData = sessionPickups.map((pickup: any) => {
        // Find student data from routes
        let studentData = null;
        routes[0]?.schools?.forEach((school: any) => {
          const student = school.students?.find((s: any) => s.id === pickup.studentId);
          if (student) {
            studentData = student;
          }
        });
        
        return {
          ...pickup,
          student: studentData
        };
      });
      
      setCompletedSessionData(enhancedSessionData);
      setCompletedPickupData(enhancedPickupData);

      toast({
        title: "Route Completed",
        description: "Great job! Your route has been completed.",
      });

      console.log('Setting summary view with data:', { 
        sessionData: activeSessionData, 
        pickupData: sessionPickups 
      });
      setCurrentView("summary");
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
      // Find existing pickup record
      const existingPickup = sessionPickups.find((p: any) => p.studentId === studentId);
      
      if (existingPickup) {
        // Update existing record
        await apiRequest("PATCH", `/api/student-pickups/${existingPickup.id}`, {
          status,
          pickedUpAt: status === 'picked_up' ? new Date().toISOString() : null,
        });
      } else {
        // Create new record if none exists
        await apiRequest("POST", `/api/student-pickups`, {
          sessionId: activeSessionData.id,
          studentId,
          status,
          pickedUpAt: status === 'picked_up' ? new Date().toISOString() : null,
        });
      }

      // Refresh the pickup data immediately
      await queryClient.invalidateQueries({ queryKey: [`/api/student-pickups`, { sessionId: activeSessionData.id }] });
      
      // Also refetch to ensure we have latest data
      refetchPickups();

      toast({
        title: "Student Updated",
        description: `Student marked as ${status.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating student pickup:', error);
      toast({
        title: "Error",
        description: "Failed to update student status",
        variant: "destructive",
      });
    }
  };

  // Show error state if queries fail
  if (routesError || sessionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Connection Issue</h3>
            <p className="text-gray-600 mb-4">
              Unable to load your route data. Please check your connection and try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has active session to determine if welcome should show
  const hasActiveSession = sessions.some((s: any) => s.status === "in_progress");

  // Show welcome page only if user hasn't completed safety checklist for today
  const shouldShowWelcome = showWelcome;

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
        {currentView === "routes" && (
          <div className="space-y-4">
            {/* Show Welcome/Safety Checklist First */}
            {showWelcome && !checklistCompleted && (
              <div className="mb-6">
                <DriverWelcome 
                  user={user} 
                  onLogout={() => {}} // Empty function since header handles logout
                  onProceedToRoute={() => {
                    setShowWelcome(false);
                    setChecklistCompleted(true);
                    handleStartRoute();
                    toast({
                      title: "Safety Checklist Complete",
                      description: "Route started! Begin picking up students.",
                    });
                  }}
                  hideHeader={true} // Hide header to prevent duplication
                />
              </div>
            )}

            {/* Route Content - only show after checklist is complete */}
            {(!showWelcome || checklistCompleted) && (
              <>
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
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              {schoolData.students?.length || 0} students
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDirections(schoolData.school)}
                            className="flex items-center space-x-1"
                          >
                            <Navigation className="h-4 w-4" />
                            <span className="hidden sm:inline">Directions</span>
                          </Button>
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
                              <div className="font-medium text-gray-900">{student.first_name} {student.last_name}</div>
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
                                  onClick={() => markStudentPickup(student.id, isPickedUp ? 'pending' : 'picked_up')}
                                  className={isPickedUp ? "bg-green-600 hover:bg-green-700 text-white" : "hover:bg-green-100"}
                                >
                                  {isPickedUp ? "✓ Picked Up" : "Pick Up"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={isNotPresent ? "default" : "outline"}
                                  onClick={() => markStudentPickup(student.id, isNotPresent ? 'pending' : 'no_show')}
                                  className={isNotPresent ? "bg-red-600 hover:bg-red-700 text-white" : "hover:bg-red-100"}
                                >
                                  {isNotPresent ? "✗ Not Present" : "Not Present"}
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
              </>
            )}
          </div>
        )}

        {currentView === "summary" && completedSessionData && (
          <RouteSummary
            sessionData={completedSessionData}
            pickupData={completedPickupData}
            onStartNewRoute={() => {
              setCurrentView("routes");
              setShowWelcome(true);
              setChecklistCompleted(false);
              setCompletedSessionData(null);
              setCompletedPickupData([]);
            }}
            onBackToDashboard={() => {
              setCurrentView("routes");
              setCompletedSessionData(null);
              setCompletedPickupData([]);
            }}
            onNavigate={(view) => {
              setCurrentView(view);
              if (view === "routes") {
                setCompletedSessionData(null);
                setCompletedPickupData([]);
              }
            }}
          />
        )}

        {currentView === "summary" && !completedSessionData && (
          <div className="max-w-4xl mx-auto p-4">
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Route Completed</h3>
                <p className="text-gray-600 mb-4">Your route has been completed successfully!</p>
                <div className="flex space-x-3 justify-center">
                  <Button
                    onClick={() => {
                      setCurrentView("routes");
                      setShowWelcome(true);
                      setChecklistCompleted(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Start New Route
                  </Button>
                  <Button
                    onClick={() => setCurrentView("routes")}
                    variant="outline"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
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

        {currentView === "navigation" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Navigation</h2>
            
            {/* Current Route Navigation */}
            {routes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Navigation className="h-5 w-5 mr-2 text-blue-600" />
                    Route Navigation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {routes[0].schools && routes[0].schools.map((schoolData: any, index: number) => (
                      <div key={schoolData.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
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
                              {schoolData.school?.address && (
                                <div className="flex items-center space-x-1 text-sm text-gray-600">
                                  <MapPin className="h-3 w-3" />
                                  <span>{schoolData.school?.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button
                              size="sm"
                              onClick={() => openDirections(schoolData.school)}
                              className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-1"
                            >
                              <Navigation className="h-4 w-4" />
                              <span>Navigate</span>
                            </Button>
                            {schoolData.school?.phone && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`tel:${schoolData.school?.phone}`, '_self')}
                                className="flex items-center space-x-1"
                              >
                                <Phone className="h-4 w-4" />
                                <span>Call</span>
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Student Count */}
                        <div className="mt-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            <span>{schoolData.students?.length || 0} students to pick up</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Quick Navigation Options */}
                  <div className="mt-6 border-t pt-4">
                    <h4 className="font-medium mb-3">Quick Navigation</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Navigate to first school
                          if (routes[0]?.schools?.[0]?.school) {
                            openDirections(routes[0].schools[0].school);
                          }
                        }}
                        className="flex items-center justify-start space-x-2"
                      >
                        <Navigation className="h-4 w-4" />
                        <span>Navigate to First School</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Open turn-by-turn for entire route
                          const allSchools = routes[0]?.schools?.map((s: any) => s.school) || [];
                          if (allSchools.length > 0) {
                            // Create multi-destination navigation
                            const waypoints = allSchools.map((school: any) => {
                              if (school.latitude && school.longitude) {
                                return `${school.latitude},${school.longitude}`;
                              }
                              return encodeURIComponent(school.address || school.name);
                            }).join('|');
                            
                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                            if (isIOS) {
                              window.open(`maps://maps.apple.com/?daddr=${waypoints}`, '_blank');
                            } else {
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${waypoints}`, '_blank');
                            }
                          }
                        }}
                        className="flex items-center justify-start space-x-2"
                      >
                        <RouteIcon className="h-4 w-4" />
                        <span>Navigate Entire Route</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {routes.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No Route Assigned</h3>
                  <p className="text-gray-600">
                    You don't have any routes assigned. Contact your administrator for route assignment.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation - Enhanced for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
        <div className="flex justify-around py-2 px-1">
          <Button
            variant={currentView === "routes" ? "default" : "ghost"}
            onClick={() => setCurrentView("routes")}
            className="flex-1 flex flex-col items-center py-3 mx-1 text-xs font-medium"
          >
            <RouteIcon className="h-5 w-5 mb-1" />
            <span>Routes</span>
          </Button>
          <Button
            variant={currentView === "notify" ? "default" : "ghost"}
            onClick={() => setCurrentView("notify")}
            className="flex-1 flex flex-col items-center py-3 mx-1 text-xs font-medium"
          >
            <AlertTriangle className="h-5 w-5 mb-1" />
            <span>Notify</span>
          </Button>
          <Button
            variant={currentView === "navigation" ? "default" : "ghost"}
            onClick={() => setCurrentView("navigation")}
            className="flex-1 flex flex-col items-center py-3 mx-1 text-xs font-medium"
          >
            <Navigation className="h-5 w-5 mb-1" />
            <span>Navigation</span>
          </Button>
        </div>
      </div>
    </div>
  );
}