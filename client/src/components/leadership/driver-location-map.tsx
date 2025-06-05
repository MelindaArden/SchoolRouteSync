import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, User } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";

interface DriverLocation {
  id: number;
  driverId: number;
  latitude: string;
  longitude: string;
  sessionId?: number;
  updatedAt: string;
  driver?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  session?: {
    id: number;
    routeId: number;
    status: string;
    route?: {
      name: string;
    };
  };
}

export default function DriverLocationMap() {
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch driver locations
  const { data: locations = [], refetch } = useQuery({
    queryKey: ['/api/driver-locations'],
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
  });

  // WebSocket for real-time updates
  useWebSocket(0); // Using 0 as placeholder for admin

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetch();
      }, 15000); // Refresh every 15 seconds for real-time tracking

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetch]);

  const activeLocations = locations.filter((loc: DriverLocation) => 
    loc.session && loc.session.status === 'in_progress'
  );

  const getTimeSinceUpdate = (updatedAt: string) => {
    const now = new Date().getTime();
    const updated = new Date(updatedAt).getTime();
    const diffMinutes = Math.floor((now - updated) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes === 1) return "1 minute ago";
    return `${diffMinutes} minutes ago`;
  };

  const openInMaps = (latitude: string, longitude: string) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Live Driver Tracking</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Live" : "Paused"}
          </Button>
          <Badge variant="secondary">
            {activeLocations.length} Active
          </Badge>
        </div>
      </div>

      {activeLocations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Active Drivers</h3>
            <p className="text-gray-600">
              No drivers are currently on active pickup routes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {activeLocations.map((location: DriverLocation) => (
            <Card key={location.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {location.driver?.firstName} {location.driver?.lastName}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {location.session?.route?.name || 'Unknown Route'}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={location.session?.status === 'in_progress' ? 'default' : 'secondary'}
                  >
                    {location.session?.status === 'in_progress' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    Last updated: {getTimeSinceUpdate(location.updatedAt)}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    Location: {parseFloat(location.latitude).toFixed(6)}, {parseFloat(location.longitude).toFixed(6)}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openInMaps(location.latitude, location.longitude)}
                      className="flex items-center gap-2"
                    >
                      <Navigation className="h-4 w-4" />
                      View on Map
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={selectedDriver === location.driverId ? "default" : "outline"}
                      onClick={() => setSelectedDriver(
                        selectedDriver === location.driverId ? null : location.driverId
                      )}
                    >
                      {selectedDriver === location.driverId ? "Hide Details" : "Show Details"}
                    </Button>
                  </div>
                  
                  {selectedDriver === location.driverId && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Location Details</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Latitude:</span> {location.latitude}
                        </div>
                        <div>
                          <span className="font-medium">Longitude:</span> {location.longitude}
                        </div>
                        <div>
                          <span className="font-medium">Session ID:</span> {location.sessionId || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Route:</span> {location.session?.route?.name || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <div className="text-xs text-gray-500 text-center">
        Locations update automatically every 30 seconds during active routes
      </div>
    </div>
  );
}