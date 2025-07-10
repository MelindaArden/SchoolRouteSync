import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { User } from "@/lib/types";
import Navigation from "@/components/shared/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  Users, 
  AlertTriangle,
  Home,
  Calendar,
  MapPin
} from "lucide-react";

interface StudentPickup {
  id: number;
  status: "pending" | "picked_up" | "absent" | "no_show";
  student: {
    id: number;
    firstName: string;
    lastName: string;
    grade: string;
  };
  school: {
    id: number;
    name: string;
  };
  pickedUpAt?: string;
  driverNotes?: string;
}

interface SessionDetails {
  id: number;
  routeId: number;
  driverId: number;
  date: string;
  status: string;
  startTime?: string;
  completedTime?: string;
  notes?: string;
  pickups: StudentPickup[];
  route: {
    id: number;
    name: string;
  };
  driver: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface RouteSummaryProps {
  user: User;
  onLogout: () => void;
  sessionId: string;
}

export default function RouteSummary({ user, onLogout, sessionId }: RouteSummaryProps) {
  const [, setLocation] = useLocation();

  // Fetch session details with pickup information
  const { data: sessionDetails, isLoading } = useQuery<SessionDetails>({
    queryKey: [`/api/pickup-sessions/${sessionId}`],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!sessionDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} onLogout={onLogout} role="driver" />
        <div className="max-w-md mx-auto pt-20 p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Session Not Found</h3>
              <p className="text-gray-600 mb-4">Could not load route summary.</p>
              <Button onClick={() => setLocation("/")}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Return early if no session details
  if (!sessionDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Session not found</p>
          <Button onClick={() => setLocation("/")} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const pickedUpStudents = sessionDetails.pickups?.filter((p: StudentPickup) => p.status === "picked_up") || [];
  const absentStudents = sessionDetails.pickups?.filter((p: StudentPickup) => p.status === "absent" || p.status === "no_show") || [];
  const pendingStudents = sessionDetails.pickups?.filter((p: StudentPickup) => p.status === "pending") || [];
  
  const totalStudents = sessionDetails.pickups?.length || 0;
  const completionRate = totalStudents > 0 ? Math.round((pickedUpStudents.length / totalStudents) * 100) : 100;

  const startTime = sessionDetails.startTime ? new Date(sessionDetails.startTime) : null;
  const completedTime = sessionDetails.completedTime ? new Date(sessionDetails.completedTime) : null;
  const routeDuration = sessionDetails.durationMinutes || 
    (startTime && completedTime ? Math.round((completedTime.getTime() - startTime.getTime()) / (1000 * 60)) : null);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} role="driver" />
      
      <div className="max-w-2xl mx-auto pt-20 p-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Route Completed!</h1>
          <p className="text-gray-600">Great job finishing your pickup route</p>
        </div>

        {/* Route Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{pickedUpStudents.length}</div>
              <div className="text-sm text-gray-600">Students Picked Up</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {routeDuration ? `${routeDuration}m` : '--'}
              </div>
              <div className="text-sm text-gray-600">Route Duration</div>
            </CardContent>
          </Card>
        </div>

        {/* Route Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Route Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'America/New_York'
                })}
              </span>
            </div>
            
            {startTime && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Start Time:</span>
                <span className="font-medium">{formatTime(startTime)}</span>
              </div>
            )}
            
            {completedTime && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completed Time:</span>
                <span className="font-medium">{formatTime(completedTime)}</span>
              </div>
            )}
            
            {routeDuration && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Route Duration:</span>
                <span className="font-medium">{routeDuration} minutes</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completion Rate:</span>
              <Badge variant={completionRate === 100 ? "default" : "secondary"}>
                {completionRate}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Student Lists */}
        {pickedUpStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>Students Picked Up ({pickedUpStudents.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pickedUpStudents.map((pickup: any) => (
                  <div key={pickup.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <div>
                      <span className="font-medium">
                        {pickup.student?.firstName} {pickup.student?.lastName}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        Grade {pickup.student?.grade}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {pickup.school?.name}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {absentStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Absent Students ({absentStudents.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {absentStudents.map((pickup: any) => (
                  <div key={pickup.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <div>
                      <span className="font-medium">
                        {pickup.student?.firstName} {pickup.student?.lastName}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        Grade {pickup.student?.grade}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {pickup.school?.name}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {pendingStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-600">
                <Clock className="h-5 w-5" />
                <span>Not Picked Up ({pendingStudents.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingStudents.map((pickup: any) => (
                  <div key={pickup.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">
                        {pickup.student?.firstName} {pickup.student?.lastName}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        Grade {pickup.student?.grade}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {pickup.school?.name}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex space-x-4">
          <Button 
            onClick={() => setLocation("/")} 
            className="flex-1"
            variant="outline"
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
          <Button 
            onClick={() => setLocation("/")} 
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Start New Route
          </Button>
        </div>
      </div>
    </div>
  );
}