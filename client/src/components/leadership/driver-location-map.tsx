import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Users,
  ExternalLink,
  RefreshCw
} from "lucide-react";

interface DriverLocation {
  id: number;
  driverId: number;
  latitude: string;
  longitude: string;
  sessionId?: number;
  updatedAt: string;
}

interface ActiveSession {
  id: number;
  driverId: number;
  routeId: number;
  status: string;
  startTime: string;
  driver: {
    id: number;
    firstName: string;
    lastName: string;
  };
  route: {
    id: number;
    name: string;
  };
  totalStudents: number;
  completedPickups: number;
  progressPercent: number;
}

export default function DriverLocationMap() {
  // Fetch active sessions
  const { data: activeSessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['/api/pickup-sessions/today'],
    refetchInterval: 30000,
  });

  // Fetch driver locations
  const { data: driverLocations = [], refetch: refetchLocations } = useQuery({
    queryKey: ['/api/driver-locations'],
    refetchInterval: 15000,
  });

  const inProgressSessions = (activeSessions as ActiveSession[]).filter((session: ActiveSession) => 
    session.status === "in_progress"
  );

  const getDriverLocation = (driverId: number): DriverLocation | null => {
    return (driverLocations as DriverLocation[]).find((loc: DriverLocation) => loc.driverId === driverId) || null;
  };

  const openGoogleMaps = (latitude: string, longitude: string, driverName: string) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}&z=15&t=m&hl=en`;
    window.open(url, '_blank');
  };

  const openDirections = (fromLat: string, fromLon: string, toLat: string, toLon: string) => {
    const url = `https://www.google.com/maps/dir/${fromLat},${fromLon}/${toLat},${toLon}`;
    window.open(url, '_blank');
  };

  const formatLastUpdated = (updatedAt: string) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMinutes = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes === 1) return "1 minute ago";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return "1 hour ago";
    return `${diffHours} hours ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Driver GPS Locations</h3>
          <p className="text-sm text-gray-600">Real-time location tracking for active drivers</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            refetchSessions();
            refetchLocations();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {inProgressSessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Active Drivers</h3>
            <p className="text-gray-600">No drivers are currently on pickup routes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {inProgressSessions.map((session: ActiveSession) => {
            const location = getDriverLocation(session.driverId);

            return (
              <Card key={session.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {session.driver.firstName} {session.driver.lastName}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{session.route.name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={location ? "default" : "secondary"}>
                        {location ? "GPS Active" : "No GPS Signal"}
                      </Badge>
                      <Badge variant="outline">
                        {Math.round(session.progressPercent)}% Complete
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span>{session.completedPickups}/{session.totalStudents} students picked up</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>Started: {new Date(session.startTime).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all" 
                        style={{ width: `${session.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Location Information */}
                  {location ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Current Location</p>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="text-xs font-mono text-gray-600">
                                {parseFloat(location.latitude).toFixed(6)}, {parseFloat(location.longitude).toFixed(6)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Updated: {formatLastUpdated(location.updatedAt)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openGoogleMaps(
                                location.latitude, 
                                location.longitude, 
                                `${session.driver.firstName} ${session.driver.lastName}`
                              )}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Quick Actions</p>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => openGoogleMaps(location.latitude, location.longitude, session.driver.firstName)}
                          >
                            <MapPin className="h-3 w-3 mr-2" />
                            View on Map
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                              // Open directions from current location to driver
                              if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition((position) => {
                                  openDirections(
                                    position.coords.latitude.toString(),
                                    position.coords.longitude.toString(),
                                    location.latitude,
                                    location.longitude
                                  );
                                });
                              } else {
                                openGoogleMaps(location.latitude, location.longitude, session.driver.firstName);
                              }
                            }}
                          >
                            <Navigation className="h-3 w-3 mr-2" />
                            Get Directions
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-yellow-600" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">
                            GPS Signal Lost
                          </p>
                          <p className="text-xs text-yellow-700">
                            Driver's location is not currently available
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Map Integration Note */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-800">Location Tracking</h4>
              <p className="text-xs text-gray-600 mt-1">
                GPS locations are updated every 30 seconds while drivers are on active routes. 
                Click "View on Map" to see precise locations in Google Maps.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}