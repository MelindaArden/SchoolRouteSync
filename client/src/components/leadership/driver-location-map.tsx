import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { MapPin, Navigation, Clock, Users, RefreshCw } from "lucide-react";

interface DriverLocation {
  id: number;
  driverId: number;
  sessionId: number | null;
  latitude: string;
  longitude: string;
  timestamp: string;
  updatedAt: string;
  driver: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  session: {
    id: number;
    routeId: number;
    status: string;
    date: string;
    route: {
      id: number;
      name: string;
    };
  } | null;
}

interface DriverLocationMapProps {
  userId: number;
}

export default function DriverLocationMap({ userId }: DriverLocationMapProps) {
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  
  // WebSocket connection for real-time updates
  useWebSocket(userId);

  // Fetch all driver locations
  const { data: driverLocations = [], refetch: refetchLocations } = useQuery<DriverLocation[]>({
    queryKey: ['/api/driver-locations'],
    queryFn: () => fetch('/api/driver-locations').then(res => res.json()),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDistanceTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const openMapsLocation = (lat: string, lng: string, driverName: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=15`;
    window.open(url, '_blank');
  };

  // Debug logging to see what's happening with the sessions
  console.log('DriverLocationMap Debug:', {
    totalLocations: driverLocations.length,
    locationsWithSessions: driverLocations.filter(loc => loc.session).length,
    sessionStatuses: driverLocations.filter(loc => loc.session).map(loc => ({ 
      driverId: loc.driverId, 
      sessionId: loc.sessionId, 
      status: loc.session?.status 
    })),
    filteredActiveDrivers: driverLocations.filter(loc => loc.session && loc.session.status === 'in_progress').length
  });

  // CRITICAL FIX: Only show drivers with in_progress sessions as active
  const activeDrivers = driverLocations.filter(loc => {
    const hasSession = loc.session && loc.session.status === 'in_progress';
    console.log(`Driver ${loc.driverId}: has session=${!!loc.session}, status=${loc.session?.status}, isActive=${hasSession}`);
    return hasSession;
  });
  
  const allDrivers = driverLocations;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Driver Locations</h2>
          <p className="text-gray-600">Real-time tracking of drivers on active routes</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchLocations()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Active Drivers Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Navigation className="h-5 w-5 text-green-600" />
          Active Drivers ({activeDrivers.length})
        </h3>
        
        {activeDrivers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h4 className="text-lg font-medium text-gray-600 mb-2">No Active Drivers</h4>
              <p className="text-gray-500">No drivers are currently on active routes</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeDrivers.map((location) => (
              <Card key={location.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {location.driver.firstName} {location.driver.lastName}
                    </CardTitle>
                    <Badge variant="default" className="bg-green-600">
                      Active
                    </Badge>
                  </div>
                  {location.session && (
                    <p className="text-sm text-gray-600">
                      Route: {location.session.route.name}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        {parseFloat(location.latitude).toFixed(4)}, {parseFloat(location.longitude).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        Updated {formatDistanceTime(location.updatedAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openMapsLocation(location.latitude, location.longitude, `${location.driver.firstName} ${location.driver.lastName}`)}
                      className="flex items-center gap-1 flex-1"
                    >
                      <MapPin className="h-3 w-3" />
                      View on Map
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* All Drivers Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          All Driver Locations ({allDrivers.length})
        </h3>
        
        <Card>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">Driver</th>
                    <th className="text-left p-4 font-medium text-gray-700">Status</th>
                    <th className="text-left p-4 font-medium text-gray-700">Route</th>
                    <th className="text-left p-4 font-medium text-gray-700">Last Update</th>
                    <th className="text-left p-4 font-medium text-gray-700">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {allDrivers.map((location) => (
                    <tr key={location.id} className="border-t hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-800">
                            {location.driver.firstName} {location.driver.lastName}
                          </p>
                          <p className="text-sm text-gray-500">@{location.driver.username}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={location.session?.status === 'in_progress' ? 'default' : 'secondary'}
                          className={location.session?.status === 'in_progress' ? 'bg-green-600' : ''}
                        >
                          {location.session?.status === 'in_progress' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {location.session ? (
                          <span className="text-gray-700">{location.session.route.name}</span>
                        ) : (
                          <span className="text-gray-400">No active route</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p className="text-gray-700">{formatTime(location.updatedAt)}</p>
                          <p className="text-gray-500">{formatDistanceTime(location.updatedAt)}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMapsLocation(location.latitude, location.longitude, `${location.driver.firstName} ${location.driver.lastName}`)}
                          className="flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {allDrivers.length === 0 && (
                <div className="p-8 text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No driver location data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}