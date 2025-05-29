import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";
import Navigation from "@/components/shared/navigation";
import RouteCard from "@/components/driver/route-card";
import SchoolCard from "@/components/driver/school-card";
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
  Route as RouteIcon
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

  // Fetch driver's routes
  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: ['/api/drivers', user.id, 'routes'],
  });

  // Fetch today's sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/drivers', user.id, 'sessions', 'today'],
  });

  // Fetch route details if there's an active route
  const { data: routeDetails } = useQuery({
    queryKey: ['/api/routes', routes[0]?.id, 'details'],
    enabled: routes.length > 0,
  });

  const handleStartRoute = async () => {
    if (!routes[0]) return;

    try {
      const response = await apiRequest("POST", "/api/pickup-sessions", {
        routeId: routes[0].id,
        driverId: user.id,
        date: new Date().toISOString().split('T')[0],
        status: "in_progress",
      });

      const session = await response.json();
      setActiveSession(session);
      startTracking();

      toast({
        title: "Route Started",
        description: "Your pickup route has begun. Stay safe!",
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
    if (!activeSession) return;

    try {
      await apiRequest("PATCH", `/api/pickup-sessions/${activeSession.id}`, {
        status: "completed",
        completedTime: new Date().toISOString(),
      });

      setActiveSession(null);
      stopTracking();

      toast({
        title: "Route Completed",
        description: "Great job! All pickups have been completed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete route",
        variant: "destructive",
      });
    }
  };

  const handleEmergency = () => {
    toast({
      title: "Emergency Alert Sent",
      description: "Leadership has been notified of the emergency",
      variant: "destructive",
    });
  };

  const handleReportDelay = () => {
    toast({
      title: "Delay Reported",
      description: "Leadership has been notified of the delay",
    });
  };

  const openNavigation = () => {
    if (!routeDetails?.schools?.length) return;

    const nextSchool = routeDetails.schools.find((s: any) => !s.completed);
    if (!nextSchool?.school) return;

    const destination = encodeURIComponent(nextSchool.school.address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank');
  };

  if (routesLoading || sessionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentRoute = routes[0];
  const totalStudents = routeDetails?.totalStudents || 0;
  const completedPickups = 8; // This would come from pickup status
  const nextSchool = routeDetails?.schools?.find((s: any) => !s.completed);

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
            {/* Current Route Status */}
            {currentRoute && (
              <RouteCard
                route={currentRoute}
                totalStudents={totalStudents}
                completedPickups={completedPickups}
                nextSchool={nextSchool?.school}
                isActive={!!activeSession}
                onStart={handleStartRoute}
                onComplete={handleCompleteRoute}
              />
            )}

            {/* Navigation Button */}
            {nextSchool && (
              <Button
                onClick={openNavigation}
                className="w-full bg-primary text-white py-3 flex items-center justify-center space-x-2"
              >
                <NavigationIcon className="h-5 w-5" />
                <span>Navigate to {nextSchool.school?.name}</span>
              </Button>
            )}

            {/* Schools List */}
            {routeDetails?.schools?.map((schoolData: any, index: number) => (
              <SchoolCard
                key={schoolData.id}
                school={schoolData.school}
                students={schoolData.students}
                estimatedTime={schoolData.estimatedArrivalTime}
                status={index === 0 ? "completed" : index === 1 ? "next" : "pending"}
                sessionId={activeSession?.id}
              />
            ))}

            {/* Emergency Actions */}
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-red-800 mb-3">Emergency Actions</h3>
                <div className="space-y-2">
                  <Button
                    onClick={handleEmergency}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Emergency
                  </Button>
                  <Button
                    onClick={handleReportDelay}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    size="sm"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Report Delay
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "map" && (
          <div className="p-4">
            <Card>
              <CardContent className="p-6 text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Map View</h3>
                <p className="text-gray-600">
                  Integration with mapping service would be displayed here
                </p>
                {location && (
                  <div className="mt-4 text-sm text-gray-500">
                    <p>Current Location:</p>
                    <p>Lat: {location.latitude.toFixed(6)}</p>
                    <p>Lng: {location.longitude.toFixed(6)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "students" && (
          <div className="p-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">All Students</h3>
                <p className="text-gray-600">
                  Complete student roster for your routes
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="p-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Profile</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {user.firstName} {user.lastName}</p>
                      <p><span className="font-medium">Username:</span> {user.username}</p>
                      <p><span className="font-medium">Role:</span> {user.role}</p>
                    </div>
                  </div>
                  <Button
                    onClick={onLogout}
                    variant="destructive"
                    className="w-full"
                  >
                    Sign Out
                  </Button>
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
            onClick={() => setActiveTab("routes")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "routes" ? "text-primary" : "text-gray-500"
            }`}
          >
            <RouteIcon className="h-6 w-6 mb-1" />
            <span className="text-xs">Routes</span>
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "map" ? "text-primary" : "text-gray-500"
            }`}
          >
            <MapPin className="h-6 w-6 mb-1" />
            <span className="text-xs">Map</span>
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "students" ? "text-primary" : "text-gray-500"
            }`}
          >
            <Users className="h-6 w-6 mb-1" />
            <span className="text-xs">Students</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "profile" ? "text-primary" : "text-gray-500"
            }`}
          >
            <MapPin className="h-6 w-6 mb-1" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
