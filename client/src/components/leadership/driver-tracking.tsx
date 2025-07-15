import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRouteDisplayName } from "@/lib/route-utils";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Users,
  AlertTriangle,
  CheckCircle 
} from "lucide-react";
import { useState } from "react";

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
    schools: Array<{
      id: number;
      schoolId: number;
      orderIndex: number;
      estimatedArrivalTime: string;
      school: {
        id: number;
        name: string;
        address: string;
        dismissalTime: string;
        latitude?: string;
        longitude?: string;
      };
    }>;
  };
  totalStudents: number;
  completedPickups: number;
  progressPercent: number;
}

export default function DriverTracking() {
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  // Fetch active sessions
  const { data: activeSessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['/api/pickup-sessions/today'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch driver locations
  const { data: driverLocations = [], refetch: refetchLocations } = useQuery({
    queryKey: ['/api/driver-locations'],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Fetch GPS route history for comprehensive tracking
  const { data: gpsRouteHistory = [], refetch: refetchGpsHistory } = useQuery({
    queryKey: ['/api/gps/route-history'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch GPS tracks for selected driver if any
  const { data: selectedDriverTracks = [] } = useQuery({
    queryKey: [`/api/gps/drivers/${selectedDriver}/tracks`],
    enabled: !!selectedDriver,
    refetchInterval: 15000,
  });

  // Enhanced filtering to show only active drivers with in-progress sessions
  const inProgressSessions = (activeSessions as ActiveSession[]).filter((session: ActiveSession) => 
    session.status === "in_progress"
  );
  
  // Filter driver locations to show drivers with active sessions OR just show active drivers
  const activeDriverLocations = (driverLocations as any[]).filter((location: any) => {
    // Show drivers who have sessions OR recent location updates (last 30 minutes)
    const hasActiveSession = location.sessionId && inProgressSessions.some(session => 
      session.id === location.sessionId
    );
    
    // Also show drivers with recent location updates (within last 30 minutes)
    const hasRecentLocation = location.updatedAt && 
      (new Date().getTime() - new Date(location.updatedAt).getTime()) < 30 * 60 * 1000;
    
    return hasActiveSession || (hasRecentLocation && location.driverId);
  });

  // Debug logging to verify filtering
  console.log('Debug GPS Filtering:', {
    totalSessions: activeSessions.length,
    inProgressSessions: inProgressSessions.length,
    totalLocations: driverLocations.length,
    activeLocations: activeDriverLocations.length,
    sessionStatuses: activeSessions.map(s => ({ id: s.id, status: s.status }))
  });

  // Get completed sessions for past routes section with their locations
  const completedSessions = (activeSessions as ActiveSession[]).filter((session: ActiveSession) => 
    session.status === "completed"
  );

  // Get historical driver locations for completed routes
  const historicalDriverLocations = (driverLocations as any[]).filter((location: any) => 
    location.sessionId && completedSessions.some(session => session.id === location.sessionId)
  );

  const getDriverLocation = (driverId: number): DriverLocation | null => {
    return (driverLocations as DriverLocation[]).find((loc: DriverLocation) => loc.driverId === driverId) || null;
  };

  const getNextSchool = (session: ActiveSession) => {
    if (!session.route?.schools) return null;
    // Find next school based on estimated arrival times and current time
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    return session.route.schools
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .find(rs => rs.estimatedArrivalTime > currentTime) || session.route.schools[0];
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const checkProximityAlert = (session: ActiveSession, location: DriverLocation) => {
    const nextSchool = getNextSchool(session);
    if (!nextSchool?.school?.latitude || !nextSchool?.school?.longitude) return null;

    const schoolLat = parseFloat(nextSchool.school.latitude);
    const schoolLon = parseFloat(nextSchool.school.longitude);
    const driverLat = parseFloat(location.latitude);
    const driverLon = parseFloat(location.longitude);

    const distance = calculateDistance(driverLat, driverLon, schoolLat, schoolLon);
    const dismissalTime = new Date(`1970-01-01T${nextSchool.school.dismissalTime}:00`);
    const now = new Date();
    const currentTime = new Date(`1970-01-01T${now.toTimeString().slice(0, 8)}`);
    const timeUntilDismissal = (dismissalTime.getTime() - currentTime.getTime()) / (1000 * 60); // minutes

    // Alert if driver is more than 2 miles away and less than 10 minutes until dismissal
    if (distance > 2 && timeUntilDismissal <= 10 && timeUntilDismissal > 0) {
      return {
        type: 'proximity_warning',
        message: `Driver ${session.driver.firstName} ${session.driver.lastName} is ${distance.toFixed(1)} miles from ${nextSchool.school.name}`,
        timeUntilDismissal: Math.round(timeUntilDismissal),
        distance: distance.toFixed(1)
      };
    }

    return null;
  };

  const openGoogleMaps = (latitude: string, longitude: string) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h3 className="text-base sm:text-lg font-semibold">GPS Driver Tracking</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              refetchSessions();
              refetchLocations();
              refetchGpsHistory();
            }}
            className="w-full sm:w-auto"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Drivers Section - Only In-Progress Routes */}
      <div>
        <h4 className="text-sm sm:text-md font-medium mb-3 flex items-center">
          <Users className="h-4 w-4 mr-2 text-blue-600" />
          Active Drivers ({inProgressSessions.length})
        </h4>

        {inProgressSessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Active Routes</h3>
              <p className="text-gray-600">No drivers are currently on pickup routes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {inProgressSessions.map((session: ActiveSession) => {
            const location = getDriverLocation(session.driverId);
            const nextSchool = getNextSchool(session);
            const proximityAlert = location ? checkProximityAlert(session, location) : null;

            return (
              <Card key={session.id} className="relative">
                {proximityAlert && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="destructive" className="animate-pulse">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Alert
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {session.driver.firstName} {session.driver.lastName}
                    </CardTitle>
                    <Badge variant={location ? "default" : "secondary"}>
                      {location ? "Tracking" : "No Signal"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{formatRouteDisplayName({ ...session.route, schools: session.route.schools })}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span>{session.completedPickups}/{session.totalStudents} students</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${session.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(session.progressPercent)}%
                      </span>
                    </div>
                  </div>

                  {/* Location & Next School */}
                  {location && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-700">Current Location</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-2 text-left justify-start"
                          onClick={() => openGoogleMaps(location.latitude, location.longitude)}
                        >
                          <MapPin className="h-3 w-3 mr-1 text-blue-600" />
                          <span className="text-xs">
                            {parseFloat(location.latitude).toFixed(4)}, {parseFloat(location.longitude).toFixed(4)}
                          </span>
                        </Button>
                        <p className="text-xs text-gray-500">
                          Updated: {new Date(location.updatedAt).toLocaleTimeString()}
                        </p>
                      </div>

                      {nextSchool && (
                        <div className="space-y-1">
                          <p className="font-medium text-gray-700">Next School</p>
                          <div className="flex items-start space-x-2">
                            <Clock className="h-3 w-3 mt-0.5 text-orange-600" />
                            <div>
                              <p className="text-xs font-medium">{nextSchool.school.name}</p>
                              <p className="text-xs text-gray-500">
                                Dismissal: {nextSchool.school.dismissalTime}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Proximity Alert */}
                  {proximityAlert && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">
                            Proximity Warning
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            {proximityAlert.message}. Dismissal in {proximityAlert.timeUntilDismissal} minutes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Schools List */}
                  {session.route?.schools && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Route Schools</p>
                      <div className="space-y-1">
                        {session.route.schools
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((routeSchool) => (
                            <div key={routeSchool.id} className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                                  {routeSchool.orderIndex}
                                </div>
                                <span className="font-medium">{routeSchool.school.name}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{routeSchool.school.dismissalTime}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
      </div>

      {/* All Driver Locations - Historical Section */}
      {(completedSessions.length > 0 || historicalDriverLocations.length > 0) && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-gray-600" />
            All Driver Locations (Historical)
          </h3>
          <div className="space-y-4">
            {completedSessions.map((session) => {
              const location = getDriverLocation(session.driverId);
              const nextSchool = getNextSchool(session);
              
              return (
                <Card key={session.id} className="border-green-200 bg-green-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-green-700">
                            {session.driver.firstName.charAt(0)}{session.driver.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-green-900">
                            {session.driver.firstName} {session.driver.lastName}
                          </h4>
                          <p className="text-sm text-green-600">{session.route.name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-green-600 text-green-600">
                        Completed
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Route Progress:</span>
                      <span className="font-medium text-green-600">
                        {session.completedPickups}/{session.totalStudents} students
                      </span>
                    </div>
                    
                    {/* Last Known Location */}
                    {location && (
                      <div className="bg-white border border-green-200 rounded-lg p-3">
                        <div className="flex items-start space-x-3">
                          <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-800">Last Known Location</p>
                            <p className="text-xs text-green-600 mt-1">
                              {location.latitude}, {location.longitude}
                            </p>
                            <p className="text-xs text-green-500 mt-1">
                              Updated: {new Date(location.updatedAt).toLocaleTimeString()}
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
        </div>
      )}

      {/* GPS Route Tracking Section */}
      <div>
        <h4 className="text-md font-medium mb-3 flex items-center">
          <Navigation className="h-4 w-4 mr-2 text-green-600" />
          Route Tracking History ({gpsRouteHistory.length})
        </h4>

        {gpsRouteHistory.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No GPS History</h3>
              <p className="text-gray-600">GPS route tracking data will appear here once drivers complete routes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {gpsRouteHistory.slice(0, 10).map((history: any) => (
              <Card key={history.id} className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {history.driver?.firstName} {history.driver?.lastName}
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Badge variant={history.endTime ? "default" : "secondary"}>
                        {history.endTime ? "Completed" : "In Progress"}
                      </Badge>
                      {history.routeDuration && (
                        <Badge variant="outline">
                          {history.routeDuration} min
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{history.route?.name}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Start/End Times & Distance */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Start:</span>
                        <span>{new Date(history.startTime).toLocaleTimeString()}</span>
                      </div>
                      {history.endTime && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">End:</span>
                          <span>{new Date(history.endTime).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {history.totalDistance && (
                        <div className="flex items-center space-x-2">
                          <Navigation className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Distance:</span>
                          <span>{parseFloat(history.totalDistance).toFixed(1)} miles</span>
                        </div>
                      )}
                      {history.startLatitude && history.startLongitude && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-left justify-start"
                          onClick={() => openGoogleMaps(history.startLatitude, history.startLongitude)}
                        >
                          <MapPin className="h-3 w-3 mr-1 text-blue-600" />
                          <span className="text-xs">Start Location</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* View Track Details */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-gray-500">
                      Session #{history.sessionId}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDriver(selectedDriver === history.driverId ? null : history.driverId)}
                    >
                      {selectedDriver === history.driverId ? 'Hide' : 'View'} Track Details
                    </Button>
                  </div>

                  {/* Selected Driver GPS Tracks */}
                  {selectedDriver === history.driverId && selectedDriverTracks.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium mb-3 flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                        GPS School Arrivals ({selectedDriverTracks.length})
                      </h5>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedDriverTracks.map((track: any) => (
                          <div key={track.id} className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-3 w-3 text-green-600" />
                              <span>School ID: {track.schoolId}</span>
                              <Badge variant="outline" className="text-xs">
                                {track.eventType}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                {new Date(track.timestamp).toLocaleTimeString()}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => openGoogleMaps(track.latitude, track.longitude)}
                              >
                                <MapPin className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}