import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Clock, 
  Navigation, 
  ExternalLink,
  School,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from "lucide-react";

interface SimpleRouteViewerProps {
  sessionId: number;
  onBack: () => void;
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

export default function SimpleRouteViewer({ sessionId, onBack }: SimpleRouteViewerProps) {
  const { data: routeDetail, isLoading, error } = useQuery<RouteDetail>({
    queryKey: [`/api/route-details/${sessionId}`],
    retry: 1,
    staleTime: 30000,
  });

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/New_York'
    });
  };

  const openInGoogleMaps = (lat: number | string, lng: number | string, label?: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=15${label ? `&title=${encodeURIComponent(label)}` : ''}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-xl font-semibold">Loading Route Details...</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-xl font-semibold text-red-600">Error Loading Route</h2>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-2">Failed to load route details for session {sessionId}</p>
            <p className="text-xs text-gray-500">
              {typeof error === 'string' ? error : (error as any)?.message || 'Unknown error'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!routeDetail) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-xl font-semibold">No Route Data</h2>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No route data available for session {sessionId}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-xl font-semibold">Route Map - Session #{sessionId}</h2>
        </div>
        <Badge variant={routeDetail.status === 'in_progress' ? "default" : "secondary"}>
          {routeDetail.status === 'in_progress' ? 'Active' : 'Completed'}
        </Badge>
      </div>

      {/* Route Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {routeDetail.routeName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Driver</p>
              <p className="font-medium">{routeDetail.driverName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">GPS Points</p>
              <p className="font-medium">{routeDetail.routePath.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">School Stops</p>
              <p className="font-medium">{routeDetail.schoolStops.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Start Time</p>
              <p className="font-medium">{formatTime(routeDetail.startTime)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* School Stops */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            School Stops ({routeDetail.schoolStops.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {routeDetail.schoolStops.map((stop, index) => (
              <div key={stop.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      stop.arrivalTime ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{stop.name}</span>
                  </div>
                  {stop.arrivalTime && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
                
                <div className="ml-8 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Arrival:</span>
                    <span className={stop.arrivalTime ? 'text-green-600 font-medium' : 'text-gray-400'}>
                      {formatTime(stop.arrivalTime)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Departure:</span>
                    <span className={stop.departureTime ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                      {formatTime(stop.departureTime)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Address:</span>
                    <span className="text-gray-500 text-xs">{stop.address}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Coordinates:</span>
                    <span className="text-gray-500 text-xs font-mono">
                      {parseFloat(stop.latitude).toFixed(4)}, {parseFloat(stop.longitude).toFixed(4)}
                    </span>
                  </div>
                </div>
                
                <div className="ml-8 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openInGoogleMaps(stop.latitude, stop.longitude, stop.name)}
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open in Maps
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* GPS Route Path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            GPS Route Path ({routeDetail.routePath.length} points)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {routeDetail.routePath.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-4">
                Route tracking from {formatTime(routeDetail.routePath[0]?.timestamp)} to {formatTime(routeDetail.routePath[routeDetail.routePath.length - 1]?.timestamp)}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Start Point</h4>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <div className="font-mono text-xs">
                      {routeDetail.routePath[0]?.latitude.toFixed(6)}, {routeDetail.routePath[0]?.longitude.toFixed(6)}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {formatTime(routeDetail.routePath[0]?.timestamp)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-2">End Point</h4>
                  <div className="bg-red-50 p-3 rounded text-sm">
                    <div className="font-mono text-xs">
                      {routeDetail.routePath[routeDetail.routePath.length - 1]?.latitude.toFixed(6)}, {routeDetail.routePath[routeDetail.routePath.length - 1]?.longitude.toFixed(6)}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {formatTime(routeDetail.routePath[routeDetail.routePath.length - 1]?.timestamp)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const start = routeDetail.routePath[0];
                    const end = routeDetail.routePath[routeDetail.routePath.length - 1];
                    const url = `https://www.google.com/maps/dir/${start.latitude},${start.longitude}/${end.latitude},${end.longitude}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Route in Google Maps
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Navigation className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No GPS tracking data available for this route</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Location */}
      {routeDetail.currentLatitude && routeDetail.currentLongitude && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Current Driver Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-mono text-sm">
                {routeDetail.currentLatitude.toFixed(6)}, {routeDetail.currentLongitude.toFixed(6)}
              </div>
              <div className="text-sm text-gray-600">
                Last updated: {formatTime(routeDetail.lastLocationUpdate)}
              </div>
              <Button
                variant="outline"
                onClick={() => openInGoogleMaps(
                  routeDetail.currentLatitude!,
                  routeDetail.currentLongitude!,
                  'Current Driver Location'
                )}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Current Location in Google Maps
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}