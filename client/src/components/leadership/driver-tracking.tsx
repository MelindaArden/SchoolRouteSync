import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, 
  Clock, 
  Users, 
  Navigation,
  Phone,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export default function DriverTracking() {
  // Fetch all active pickup sessions
  const { data: activeSessions = [], isLoading } = useQuery({
    queryKey: ['/api/pickup-sessions/today'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch driver locations
  const { data: driverLocations = [] } = useQuery({
    queryKey: ['/api/driver-locations'],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const inProgressSessions = activeSessions.filter((session: any) => 
    session.status === "in_progress"
  );

  const getDriverLocation = (driverId: number) => {
    return driverLocations.find((loc: any) => loc.driverId === driverId);
  };

  const calculateProgress = (session: any) => {
    if (!session.pickups || session.pickups.length === 0) return 0;
    const pickedUp = session.pickups.filter((p: any) => p.status === "picked_up").length;
    return Math.round((pickedUp / session.pickups.length) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress": return "bg-blue-500";
      case "completed": return "bg-green-500";
      case "pending": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getRouteETA = (session: any) => {
    if (!session.startTime) return "N/A";
    const start = new Date(session.startTime);
    const now = new Date();
    const elapsed = Math.round((now.getTime() - start.getTime()) / (1000 * 60));
    
    // Estimate 45 minutes total route time
    const estimatedTotal = 45;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    
    if (remaining === 0) return "Overdue";
    return `${remaining}m remaining`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Active Driver Tracking</h2>
        <Badge variant="outline">
          {inProgressSessions.length} Active Routes
        </Badge>
      </div>

      {inProgressSessions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Active Routes</h3>
            <p className="text-gray-600">All drivers are currently off duty or have completed their routes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {inProgressSessions.map((session: any) => {
            const location = getDriverLocation(session.driverId);
            const progress = calculateProgress(session);
            const pickedUpCount = session.pickups?.filter((p: any) => p.status === "picked_up").length || 0;
            const totalStudents = session.pickups?.length || 0;
            
            return (
              <Card key={session.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {session.driver?.firstName} {session.driver?.lastName}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Route: {session.route?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(session.status)}>
                        {session.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Started: {session.startTime ? formatTime(session.startTime) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pickup Progress</span>
                      <span>{pickedUpCount}/{totalStudents} students</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{progress}% complete</span>
                      <span>ETA: {getRouteETA(session)}</span>
                    </div>
                  </div>

                  {/* Location Info */}
                  {location && (
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <MapPin className="h-4 w-4 text-gray-600" />
                      <div className="flex-1 text-sm">
                        <span className="font-medium">Last Location: </span>
                        <span className="text-gray-600">
                          {location.latitude}, {location.longitude}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          Updated: {formatTime(location.updatedAt)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Current School */}
                  {session.route?.schools && session.route.schools.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Schools on Route:</h4>
                      <div className="space-y-1">
                        {session.route.schools.map((schoolData: any, index: number) => {
                          const schoolPickups = session.pickups?.filter((p: any) => 
                            p.schoolId === schoolData.schoolId
                          ) || [];
                          const schoolCompleted = schoolPickups.every((p: any) => 
                            p.status === "picked_up" || p.status === "absent"
                          );
                          
                          return (
                            <div key={schoolData.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center space-x-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                  schoolCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {schoolCompleted ? <CheckCircle className="h-3 w-3" /> : index + 1}
                                </div>
                                <span className="text-sm font-medium">
                                  {schoolData.school?.name}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {schoolPickups.filter((p: any) => p.status === "picked_up").length}/
                                {schoolPickups.length} students
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex space-x-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Phone className="h-3 w-3 mr-1" />
                      Call Driver
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      View Map
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}