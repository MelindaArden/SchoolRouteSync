import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import GpsRouteMap from "@/components/leadership/gps-route-map";
import { MapPin, Target, Navigation, Clock, Users, Activity } from "lucide-react";

interface RouteMapDetailProps {
  sessionId: number;
}

interface RouteDetail {
  sessionId: number;
  routeId: number;
  driverId: number;
  driverName: string;
  routeName: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  routePath: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
  }>;
  schoolStops: Array<{
    id: number;
    name: string;
    address: string;
    latitude: string;
    longitude: string;
    arrivalTime?: string;
    departureTime?: string;
  }>;
  currentLatitude: number | null;
  currentLongitude: number | null;
  lastLocationUpdate: string | null;
}

export default function RouteMapDetail({ sessionId }: RouteMapDetailProps) {
  console.log('🗺️ RouteMapDetail rendered with sessionId:', sessionId);
  
  // Fetch detailed route data with enhanced error handling
  const { data: routeDetail, isLoading, error } = useQuery<RouteDetail>({
    queryKey: [`/api/route-details/${sessionId}`],
    refetchInterval: isLoading ? false : 10000, // Don't refetch while loading
    retry: (failureCount, error) => {
      console.error('🚨 Query failed:', error);
      return failureCount < 2; // Retry only once
    },
    staleTime: 5000,
    queryFn: async () => {
      try {
        console.log('🔄 Fetching route details for session:', sessionId);
        const response = await fetch(`/api/route-details/${sessionId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) {
          if (response.status === 401) {
            // Redirect to login if unauthorized
            window.location.href = '/api/login';
            throw new Error('Authentication required');
          }
          
          const errorText = await response.text();
          console.error('📡 Response error text:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📊 Route detail data received:', data);
        return data;
      } catch (error) {
        console.error('🚨 Fetch error:', error);
        throw error;
      }
    },
  });

  console.log('🗺️ Query state:', { isLoading, error, hasData: !!routeDetail, routeDetail });

  if (error) {
    console.error('🚨 RouteMapDetail error:', error);
    return (
      <div className="bg-white min-h-screen p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center py-8 text-red-500">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-red-300" />
              <h3 className="text-lg font-medium mb-2">Error loading route data</h3>
              <p className="text-sm text-red-600 mb-2">Session ID: {sessionId}</p>
              <p className="text-xs text-red-400 font-mono bg-red-50 p-2 rounded">
                {typeof error === 'string' ? error : (error as any)?.message || 'Unknown error'}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading route details...</p>
        </div>
      </div>
    );
  }

  if (!routeDetail) {
    return (
      <div className="bg-white min-h-screen p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No route data available for this session</p>
              <p className="text-xs text-gray-400 mt-2">Session ID: {sessionId}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const isActive = routeDetail.status === 'in_progress';
  const currentLocation = routeDetail.currentLatitude && routeDetail.currentLongitude ? {
    lat: routeDetail.currentLatitude,
    lng: routeDetail.currentLongitude,
    timestamp: routeDetail.lastLocationUpdate || new Date().toISOString()
  } : undefined;

  // Convert route path to the format expected by GpsRouteMap
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
        arrivalTime: stop.arrivalTime!,
        departureTime: stop.departureTime
      }))
  };

  return (
    <div className="bg-white min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
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
                {formatDuration(routeDetail.durationMinutes)}
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
          
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Driver:</strong> {routeDetail.driverName}</p>
            <p><strong>Route:</strong> {routeDetail.routeName}</p>
            <p><strong>Start Time:</strong> {formatTime(routeDetail.startTime)}</p>
            <p><strong>End Time:</strong> {formatTime(routeDetail.endTime)}</p>
            {routeDetail.lastLocationUpdate && (
              <p><strong>Last Location Update:</strong> {formatTime(routeDetail.lastLocationUpdate)}</p>
            )}
          </div>
        </CardContent>
      </Card>

        {/* GPS Route Map */}
        <GpsRouteMap
          sessionId={sessionId}
          driverId={routeDetail.driverId}
          driverName={routeDetail.driverName}
          routeName={routeDetail.routeName}
          isActive={isActive}
          routePath={routePath}
          schoolStops={routeDetail.schoolStops}
          currentLocation={currentLocation}
        />
      </div>
    </div>
  );
}