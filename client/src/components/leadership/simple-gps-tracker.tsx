import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, RefreshCw, Navigation, Users, Car, Route as RouteIcon } from "lucide-react";

interface DriverLocation {
  id: number;
  driverId: number;
  sessionId: number | null;
  latitude: string;
  longitude: string;
  timestamp: string;
  driver: {
    firstName: string;
    lastName: string;
  };
  session: {
    id: number;
    routeId: number;
    status: string;
    route: {
      name: string;
    };
  } | null;
}

interface RouteStop {
  id: number;
  sessionId: number;
  schoolId: number;
  arrivalTime: string;
  departureTime: string | null;
  studentsPickedUp: number;
  totalStudents: number;
  latitude: string;
  longitude: string;
  school: {
    name: string;
    address: string;
  };
}

export default function SimpleGpsTracker() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  // Fetch active driver locations
  const { data: activeDrivers, isLoading: driversLoading } = useQuery({
    queryKey: ["/api/driver-locations", refreshKey],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch route stops for selected driver
  const { data: routeStops } = useQuery({
    queryKey: ["/api/route-stops", selectedDriver],
    enabled: selectedDriver !== null,
  });

  // Manual refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const openExternalMap = (lat: string, lng: string, label: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}&t=m&z=16&marker=${lat},${lng}&title=${encodeURIComponent(label)}`;
    window.open(url, '_blank');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDistance = (lat1: string, lng1: string, lat2: string, lng2: string) => {
    const R = 6371; // Earth's radius in km
    const dLat = (parseFloat(lat2) - parseFloat(lat1)) * Math.PI / 180;
    const dLng = (parseFloat(lng2) - parseFloat(lng1)) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(parseFloat(lat1) * Math.PI / 180) * Math.cos(parseFloat(lat2) * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  if (driversLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading GPS tracking data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">GPS Route Tracking</h2>
          <p className="text-gray-600 mt-1">Real-time driver locations and route history</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Active Drivers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Car className="h-5 w-5 mr-2" />
            Active Drivers ({activeDrivers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activeDrivers?.length ? (
            <div className="text-center py-8 text-gray-500">
              <Navigation className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active drivers currently tracking</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeDrivers.map((driver: DriverLocation) => (
                <div
                  key={driver.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedDriver === driver.driverId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedDriver(driver.driverId)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="font-medium">
                          {driver.driver.firstName} {driver.driver.lastName}
                        </span>
                        {driver.session && (
                          <Badge variant="secondary">
                            {driver.session.route.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{driver.latitude.substring(0, 7)}, {driver.longitude.substring(0, 7)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatTime(driver.timestamp)}</span>
                        </div>
                        {driver.session && (
                          <Badge variant={driver.session.status === 'in_progress' ? 'default' : 'secondary'}>
                            {driver.session.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openExternalMap(driver.latitude, driver.longitude, 
                            `${driver.driver.firstName} ${driver.driver.lastName}`);
                        }}
                      >
                        <Navigation className="h-4 w-4" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route Stops for Selected Driver */}
      {selectedDriver && routeStops && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RouteIcon className="h-5 w-5 mr-2" />
              Route Stops & Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {routeStops.map((stop: RouteStop, index: number) => (
                <div key={stop.id} className="flex items-start space-x-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full ${
                      stop.departureTime ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    {index < routeStops.length - 1 && (
                      <div className="w-px h-8 bg-gray-300 mt-2" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{stop.school.name}</h4>
                        <p className="text-sm text-gray-600">{stop.school.address}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {stop.studentsPickedUp}/{stop.totalStudents}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openExternalMap(stop.latitude, stop.longitude, stop.school.name)}
                        >
                          <Navigation className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Arrived: {formatTime(stop.arrivalTime)}</span>
                      </div>
                      {stop.departureTime && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Departed: {formatTime(stop.departureTime)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}