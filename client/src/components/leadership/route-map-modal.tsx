import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MapPin, 
  Clock, 
  Navigation, 
  Target, 
  Activity, 
  ExternalLink,
  Users,
  Truck,
  School,
  CheckCircle,
  XCircle
} from "lucide-react";

interface RouteMapModalProps {
  sessionId: number | null;
  onClose: () => void;
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

export default function RouteMapModal({ sessionId, onClose }: RouteMapModalProps) {
  const [selectedStop, setSelectedStop] = useState<number | null>(null);

  // Fetch route details
  const { data: routeDetail, isLoading, error } = useQuery<RouteDetail>({
    queryKey: [`/api/route-details/${sessionId}`],
    enabled: !!sessionId,
    retry: 1,
    staleTime: 30000,
  });

  console.log('🗺️ RouteMapModal - sessionId:', sessionId, 'isLoading:', isLoading, 'error:', error, 'data available:', !!routeDetail);
  if (routeDetail) {
    console.log('🗺️ Route data:', {
      routePath: routeDetail.routePath?.length || 0,
      schoolStops: routeDetail.schoolStops?.length || 0,
      status: routeDetail.status
    });
  }

  if (!sessionId) return null;

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/New_York'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York'
    });
  };

  const openInGoogleMaps = (lat: number | string, lng: number | string, label?: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=15${label ? `&title=${encodeURIComponent(label)}` : ''}`;
    window.open(url, '_blank');
  };

  const getPathBounds = () => {
    if (!routeDetail?.routePath.length) return null;
    
    const lats = routeDetail.routePath.map(p => p.latitude);
    const lngs = routeDetail.routePath.map(p => p.longitude);
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      centerLat: (Math.min(...lats) + Math.max(...lats)) / 2,
      centerLng: (Math.min(...lngs) + Math.max(...lngs)) / 2
    };
  };

  return (
    <Dialog open={!!sessionId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Route Map - Session #{sessionId}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-2">
          <div className="text-sm text-gray-600">
            Debug: Loading: {isLoading ? 'Yes' : 'No'} | 
            Error: {error ? 'Yes' : 'No'} | 
            Data: {routeDetail ? 'Available' : 'None'}
            {routeDetail && ` | GPS Points: ${routeDetail.routePath?.length || 0}`}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-64 p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading route details for session {sessionId}...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-red-500">
                  <XCircle className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Error Loading Route Data</p>
                  <p className="text-sm text-red-600">Session ID: {sessionId}</p>
                  <p className="text-xs text-red-400 font-mono bg-red-50 p-2 rounded mt-2">
                    {typeof error === 'string' ? error : (error as any)?.message || 'Unknown error'}
                  </p>
                  <Button onClick={onClose} className="mt-4">Close</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && !error && routeDetail && (
          <div className="flex h-full">
            {/* Left Panel - Route Info */}
            <div className="w-1/3 border-r bg-gray-50">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  {/* Route Overview */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {routeDetail.routeName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Driver:</span>
                        <span className="font-medium">{routeDetail.driverName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge variant={routeDetail.status === 'in_progress' ? "default" : "secondary"}>
                          {routeDetail.status === 'in_progress' ? 'Active' : 'Completed'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">GPS Points:</span>
                        <span className="font-medium">{routeDetail.routePath.length}</span>
                      </div>
                      {routeDetail.startTime && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Started:</span>
                          <span className="font-medium">{formatTime(routeDetail.startTime)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* School Stops */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <School className="h-4 w-4" />
                        School Stops ({routeDetail.schoolStops.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {routeDetail.schoolStops.map((stop, index) => (
                        <div 
                          key={stop.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedStop === index ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedStop(selectedStop === index ? null : index)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                stop.arrivalTime ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {index + 1}
                              </div>
                              <span className="font-medium text-sm">{stop.name}</span>
                            </div>
                            {stop.arrivalTime ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center justify-between">
                              <span>Arrival:</span>
                              <span className={stop.arrivalTime ? 'text-green-600 font-medium' : ''}>
                                {formatTime(stop.arrivalTime)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Departure:</span>
                              <span className={stop.departureTime ? 'text-blue-600 font-medium' : ''}>
                                {formatTime(stop.departureTime)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                openInGoogleMaps(stop.latitude, stop.longitude, stop.name);
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Maps
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Current Location */}
                  {routeDetail.currentLatitude && routeDetail.currentLongitude && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Current Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Coordinates:</span>
                            <span className="font-mono text-xs">
                              {routeDetail.currentLatitude.toFixed(6)}, {routeDetail.currentLongitude.toFixed(6)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Last Update:</span>
                            <span className="text-xs">
                              {routeDetail.lastLocationUpdate ? formatTime(routeDetail.lastLocationUpdate) : 'N/A'}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => openInGoogleMaps(
                              routeDetail.currentLatitude!, 
                              routeDetail.currentLongitude!, 
                              'Current Driver Location'
                            )}
                          >
                            <ExternalLink className="h-3 w-3 mr-2" />
                            View Current Location
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - Map Visualization */}
            <div className="flex-1 p-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Route Path Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <div className="h-full bg-gray-50 rounded-lg p-4 relative overflow-hidden">
                    {/* Geographic Map Background */}
                    <div className="absolute inset-0 opacity-10">
                      <svg className="w-full h-full">
                        <defs>
                          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ccc" strokeWidth="0.5"/>
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                      </svg>
                    </div>

                    {/* Route Path Display */}
                    {routeDetail.routePath.length > 0 && (
                      <div className="relative h-full">
                        <svg className="w-full h-full" viewBox="0 0 400 300">
                          {/* Route path */}
                          {routeDetail.routePath.map((point, index) => {
                            const bounds = getPathBounds();
                            if (!bounds) return null;

                            const x = ((point.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 360 + 20;
                            const y = ((bounds.maxLat - point.latitude) / (bounds.maxLat - bounds.minLat)) * 260 + 20;

                            return (
                              <g key={index}>
                                {/* Path line */}
                                {index > 0 && (
                                  <line
                                    x1={((routeDetail.routePath[index-1].longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 360 + 20}
                                    y1={((bounds.maxLat - routeDetail.routePath[index-1].latitude) / (bounds.maxLat - bounds.minLat)) * 260 + 20}
                                    x2={x}
                                    y2={y}
                                    stroke="#3b82f6"
                                    strokeWidth="2"
                                    opacity="0.7"
                                  />
                                )}
                                
                                {/* GPS point */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill={index === 0 ? "#10b981" : index === routeDetail.routePath.length - 1 ? "#ef4444" : "#3b82f6"}
                                  stroke="white"
                                  strokeWidth="1"
                                />
                                
                                {/* Timestamp tooltip */}
                                <title>
                                  {`${formatTime(point.timestamp)} - ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`}
                                </title>
                              </g>
                            );
                          })}

                          {/* School markers */}
                          {routeDetail.schoolStops.map((stop, index) => {
                            const bounds = getPathBounds();
                            if (!bounds) return null;

                            const x = ((parseFloat(stop.longitude) - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 360 + 20;
                            const y = ((bounds.maxLat - parseFloat(stop.latitude)) / (bounds.maxLat - bounds.minLat)) * 260 + 20;

                            return (
                              <g key={`school-${index}`}>
                                <rect
                                  x={x - 8}
                                  y={y - 8}
                                  width="16"
                                  height="16"
                                  fill={stop.arrivalTime ? "#10b981" : "#f59e0b"}
                                  stroke="white"
                                  strokeWidth="2"
                                  rx="2"
                                />
                                <text
                                  x={x}
                                  y={y + 2}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fill="white"
                                  fontWeight="bold"
                                >
                                  {index + 1}
                                </text>
                                <title>{`${stop.name} - ${stop.arrivalTime ? 'Visited' : 'Pending'}`}</title>
                              </g>
                            );
                          })}
                        </svg>

                        {/* Legend */}
                        <div className="absolute bottom-4 left-4 bg-white border rounded-lg p-3 shadow-lg">
                          <div className="text-xs font-medium mb-2">Legend</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span>Start Point</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span>GPS Track</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded"></div>
                              <span>Visited School</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                              <span>Pending School</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <span>End Point</span>
                            </div>
                          </div>
                        </div>

                        {/* Map Controls */}
                        <div className="absolute top-4 right-4 space-y-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white"
                            onClick={() => {
                              const bounds = getPathBounds();
                              if (bounds) {
                                openInGoogleMaps(bounds.centerLat, bounds.centerLng, 'Route Overview');
                              }
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Full Route
                          </Button>
                        </div>
                      </div>
                    )}

                    {routeDetail.routePath.length === 0 && (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No GPS tracking data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}