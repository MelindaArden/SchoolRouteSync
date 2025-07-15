import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import GpsRouteMap from "@/components/leadership/gps-route-map";
import { MapPin, Target, Navigation, Clock, Users, Activity } from "lucide-react";

interface RouteMapDetailProps {
  sessionId: number;
}

export default function RouteMapDetail({ sessionId }: RouteMapDetailProps) {
  const { data: routeDetail, isLoading, error } = useQuery({
    queryKey: [`/api/route-details/${sessionId}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !routeDetail) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Unable to load route details</p>
        <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isActive = routeDetail.status === 'in_progress';
  const currentLocation = routeDetail.currentLatitude && routeDetail.currentLongitude ? {
    lat: routeDetail.currentLatitude,
    lng: routeDetail.currentLongitude,
    timestamp: routeDetail.lastLocationUpdate || new Date().toISOString()
  } : undefined;

  const routePath = {
    coordinates: routeDetail.routePath.map(point => ({
      lat: point.latitude,
      lng: point.longitude,
      timestamp: point.timestamp,
      speed: point.speed
    })),
    schoolTimestamps: routeDetail.schoolStops
      .filter(stop => stop.arrivalTime)
      .map(stop => ({
        schoolId: stop.id,
        schoolName: stop.name,
        arrivalTime: stop.arrivalTime,
        departureTime: stop.departureTime
      }))
  };

  return (
    <div className="space-y-6">
      {/* Route Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Route Details - Session #{sessionId}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600">Status</span>
              </div>
              <div className="text-lg font-bold text-blue-800">
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Active" : "Completed"}
                </Badge>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Duration</span>
              </div>
              <div className="text-lg font-bold text-green-800">
                {routeDetail.durationMinutes ? `${routeDetail.durationMinutes}m` : "N/A"}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-600">GPS Points</span>
              </div>
              <div className="text-lg font-bold text-purple-800">
                {routeDetail.routePath.length}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-600">Schools</span>
              </div>
              <div className="text-lg font-bold text-orange-800">
                {routeDetail.schoolStops.length}
              </div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Driver:</span>
              <span className="font-medium ml-2">{routeDetail.driverName}</span>
            </div>
            <div>
              <span className="text-gray-600">Route:</span>
              <span className="font-medium ml-2">{routeDetail.routeName}</span>
            </div>
            <div>
              <span className="text-gray-600">Start Time:</span>
              <span className="font-medium ml-2">{formatTime(routeDetail.startTime)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPS Route Map */}
      <GpsRouteMap 
        routePath={routePath}
        currentLocation={currentLocation}
        schools={routeDetail.schoolStops.map(stop => ({
          id: stop.id,
          name: stop.name,
          latitude: parseFloat(stop.latitude),
          longitude: parseFloat(stop.longitude),
          address: stop.address
        }))}
        title={`Route Map - ${routeDetail.routeName}`}
      />

      {/* School Stops Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            School Stops & Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {routeDetail.schoolStops.map((stop) => (
              <div key={stop.id} className="border-l-4 border-blue-200 pl-4 pb-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg">{stop.name}</h4>
                  <Badge variant={stop.arrivalTime ? "default" : "secondary"}>
                    {stop.arrivalTime ? "Visited" : "Pending"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{stop.address}</p>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Arrival:</span>
                    <span className="font-medium ml-2">
                      {stop.arrivalTime ? formatTime(stop.arrivalTime) : "Not yet"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Departure:</span>
                    <span className="font-medium ml-2">
                      {stop.departureTime ? formatTime(stop.departureTime) : "Not yet"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Coordinates:</span>
                    <span className="font-medium ml-2">{stop.latitude}, {stop.longitude}</span>
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://www.google.com/maps?q=${stop.latitude},${stop.longitude}`, '_blank')}
                    >
                      View on Map
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}