import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Route as RouteIcon,
  Target,
  Activity,
  ExternalLink,
  Play,
  Square,
  Pause
} from "lucide-react";

interface RouteStop {
  id: number;
  latitude: string;
  longitude: string;
  timestamp: string;
  arrivalTime: string | null;
  departureTime: string | null;
  duration: number; // in minutes
  eventType: string;
  school: {
    id: number;
    name: string;
    address: string;
  } | null;
}

interface RouteMapViewerProps {
  sessionId: number;
  driverName?: string;
  routeName?: string;
  isRealTime?: boolean;
}

export default function RouteMapViewer({ 
  sessionId, 
  driverName, 
  routeName, 
  isRealTime = false 
}: RouteMapViewerProps) {
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [hoveredStop, setHoveredStop] = useState<RouteStop | null>(null);

  // Fetch route path data with actual stops (filtered for 3+ minute stops)
  const { data: routeData, isLoading, error } = useQuery({
    queryKey: [`/api/routes/${sessionId}/map-data`],
    enabled: !!sessionId,
    refetchInterval: isRealTime ? 15000 : undefined,
    retry: 1,
    staleTime: 30000,
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const openInMaps = (lat: string, lng: string, name: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=16`;
    window.open(url, '_blank');
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span>Loading route map data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-white border-red-200">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Unable to load route map</p>
            <p className="text-sm text-gray-500">
              {error instanceof Error ? error.message : "Please try again later"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!routeData || (!routeData.path && !routeData.stops)) {
    return (
      <Card className="bg-white">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No route data available</p>
            <p className="text-sm text-gray-500">
              Session {sessionId} may not have GPS tracking data yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const createRouteVisualization = () => {
    if (!routeData?.path || routeData.path.length === 0) return null;

    const coordinates = routeData.path.map((point: any) => ({
      lat: parseFloat(point.latitude),
      lng: parseFloat(point.longitude),
      timestamp: point.timestamp
    })).filter((coord: any) => !isNaN(coord.lat) && !isNaN(coord.lng));

    const stops = routeData.stops || [];

    if (coordinates.length === 0) return null;

    // Calculate bounds
    const lats = coordinates.map((coord: any) => coord.lat);
    const lngs = coordinates.map((coord: any) => coord.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding
    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;
    const padding = 0.1;

    const bounds = {
      minLat: minLat - latRange * padding,
      maxLat: maxLat + latRange * padding,
      minLng: minLng - lngRange * padding,
      maxLng: maxLng + lngRange * padding
    };

    // SVG dimensions
    const mapWidth = 800;
    const mapHeight = 500;
    const svgPadding = 40;

    const scaleX = (mapWidth - 2 * svgPadding) / (bounds.maxLng - bounds.minLng);
    const scaleY = (mapHeight - 2 * svgPadding) / (bounds.maxLat - bounds.minLat);

    const coordsToSVG = (lat: number, lng: number) => ({
      x: svgPadding + (lng - bounds.minLng) * scaleX,
      y: mapHeight - (svgPadding + (lat - bounds.minLat) * scaleY)
    });

    // Create smooth path
    const pathCoords = coordinates.map((coord: any) => coordsToSVG(coord.lat, coord.lng));
    const pathString = pathCoords.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    return (
      <div className="space-y-4">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RouteIcon className="h-5 w-5 text-blue-600" />
              Driver Route Map
              {isRealTime && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Activity className="h-3 w-3 mr-1" />
                  Live Tracking
                </Badge>
              )}
            </CardTitle>
            <div className="text-sm text-gray-600">
              {driverName && `Driver: ${driverName}`} • {routeName && `Route: ${routeName}`}
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <svg 
                width={mapWidth} 
                height={mapHeight} 
                className="w-full h-auto border border-gray-200 rounded bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50"
                viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              >
                {/* Map grid background */}
                <defs>
                  <pattern id="mapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                  </pattern>
                  <pattern id="roads" width="60" height="60" patternUnits="userSpaceOnUse">
                    <rect width="60" height="60" fill="#f9fafb"/>
                    <path d="M0 30 L60 30 M30 0 L30 60" stroke="#d1d5db" strokeWidth="1"/>
                  </pattern>
                </defs>
                
                {/* Background with road pattern */}
                <rect width="100%" height="100%" fill="url(#roads)" />
                <rect width="100%" height="100%" fill="url(#mapGrid)" opacity="0.5" />
                
                {/* Route path */}
                {pathString && (
                  <path
                    d={pathString}
                    stroke="#2563eb"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                    strokeDasharray={isRealTime ? "10,5" : "none"}
                  />
                )}
                
                {/* Start point */}
                {coordinates.length > 0 && (
                  <g>
                    {(() => {
                      const startPoint = coordsToSVG(coordinates[0].lat, coordinates[0].lng);
                      return (
                        <g>
                          <circle
                            cx={startPoint.x}
                            cy={startPoint.y}
                            r="12"
                            fill="#10b981"
                            stroke="white"
                            strokeWidth="3"
                            className="drop-shadow-lg cursor-pointer"
                            onClick={() => openInMaps(coordinates[0].lat.toString(), coordinates[0].lng.toString(), 'Start')}
                          />
                          <text
                            x={startPoint.x}
                            y={startPoint.y - 20}
                            textAnchor="middle"
                            className="text-sm font-bold fill-green-700"
                          >
                            START
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}
                
                {/* Route stops with 3+ minute duration */}
                {stops.map((stop: RouteStop, index: number) => {
                  const point = coordsToSVG(parseFloat(stop.latitude), parseFloat(stop.longitude));
                  const isHovered = hoveredStop?.id === stop.id;
                  
                  return (
                    <g key={stop.id}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={isHovered ? "14" : "10"}
                        fill={stop.school ? "#f59e0b" : "#ef4444"}
                        stroke="white"
                        strokeWidth="3"
                        className="cursor-pointer drop-shadow-lg transition-all duration-200"
                        onClick={() => setSelectedStop(stop)}
                        onMouseEnter={() => setHoveredStop(stop)}
                        onMouseLeave={() => setHoveredStop(null)}
                      />
                      
                      {/* Stop label */}
                      <text
                        x={point.x}
                        y={point.y - (isHovered ? 25 : 20)}
                        textAnchor="middle"
                        className={`text-xs font-medium transition-all duration-200 ${
                          isHovered ? 'fill-gray-800 text-sm' : 'fill-gray-600'
                        }`}
                      >
                        {stop.school ? stop.school.name : `Stop ${index + 1}`}
                      </text>
                      
                      {/* Hover tooltip */}
                      {isHovered && (
                        <g>
                          <rect
                            x={point.x - 80}
                            y={point.y + 15}
                            width="160"
                            height="50"
                            fill="rgba(0,0,0,0.8)"
                            stroke="white"
                            strokeWidth="1"
                            rx="4"
                            className="drop-shadow-lg"
                          />
                          <text
                            x={point.x}
                            y={point.y + 30}
                            textAnchor="middle"
                            className="text-xs fill-white font-medium"
                          >
                            Arrived: {formatTime(stop.arrivalTime || stop.timestamp)}
                          </text>
                          <text
                            x={point.x}
                            y={point.y + 45}
                            textAnchor="middle"
                            className="text-xs fill-white"
                          >
                            Duration: {formatDuration(stop.duration)}
                          </text>
                          {stop.departureTime && (
                            <text
                              x={point.x}
                              y={point.y + 60}
                              textAnchor="middle"
                              className="text-xs fill-white"
                            >
                              Left: {formatTime(stop.departureTime)}
                            </text>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })}
                
                {/* End point */}
                {coordinates.length > 1 && !isRealTime && (
                  <g>
                    {(() => {
                      const endPoint = coordsToSVG(
                        coordinates[coordinates.length - 1].lat, 
                        coordinates[coordinates.length - 1].lng
                      );
                      return (
                        <g>
                          <circle
                            cx={endPoint.x}
                            cy={endPoint.y}
                            r="12"
                            fill="#ef4444"
                            stroke="white"
                            strokeWidth="3"
                            className="drop-shadow-lg cursor-pointer"
                            onClick={() => openInMaps(
                              coordinates[coordinates.length - 1].lat.toString(), 
                              coordinates[coordinates.length - 1].lng.toString(), 
                              'End'
                            )}
                          />
                          <text
                            x={endPoint.x}
                            y={endPoint.y - 20}
                            textAnchor="middle"
                            className="text-sm font-bold fill-red-700"
                          >
                            END
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}
                
                {/* Current position for real-time */}
                {isRealTime && routeData.currentPosition && (
                  <g>
                    {(() => {
                      const currentPoint = coordsToSVG(
                        parseFloat(routeData.currentPosition.latitude), 
                        parseFloat(routeData.currentPosition.longitude)
                      );
                      return (
                        <g>
                          <circle
                            cx={currentPoint.x}
                            cy={currentPoint.y}
                            r="8"
                            fill="#3b82f6"
                            className="animate-pulse"
                          />
                          <circle
                            cx={currentPoint.x}
                            cy={currentPoint.y}
                            r="15"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            className="animate-ping"
                          />
                          <text
                            x={currentPoint.x}
                            y={currentPoint.y - 25}
                            textAnchor="middle"
                            className="text-sm font-bold fill-blue-700"
                          >
                            DRIVER
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}
                
                {/* Coordinate labels */}
                <text x="15" y="25" className="text-xs fill-gray-500 font-mono">
                  {bounds.maxLat.toFixed(4)}°N
                </text>
                <text x="15" y={mapHeight - 15} className="text-xs fill-gray-500 font-mono">
                  {bounds.minLat.toFixed(4)}°N
                </text>
                <text x={mapWidth - 100} y={mapHeight - 15} className="text-xs fill-gray-500 font-mono">
                  {bounds.maxLng.toFixed(4)}°W
                </text>
              </svg>
              
              {/* Map Legend */}
              <div className="flex items-center justify-center gap-6 mt-4 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow"></div>
                  <span>Start</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-amber-500 rounded-full border-2 border-white shadow"></div>
                  <span>School Stop</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow"></div>
                  <span>Other Stop</span>
                </div>
                {isRealTime && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow animate-pulse"></div>
                    <span>Current Location</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-blue-600 rounded"></div>
                  <span>Route Path</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span>Loading route data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border-red-200">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Failed to load route data</p>
            <p className="text-sm text-gray-500">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!routeData || (!routeData.path && !routeData.currentPosition)) {
    return (
      <Card className="bg-white">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No route data available</p>
            <p className="text-sm text-gray-500">Driver may not have started tracking yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Route Information Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-600" />
                {routeName || `Route Session ${sessionId}`}
              </CardTitle>
              {driverName && (
                <p className="text-sm text-gray-600 mt-1">Driver: {driverName}</p>
              )}
            </div>
            <div className="text-right">
              {routeData.stops && (
                <div className="text-sm text-gray-600">
                  {routeData.stops.length} stops • {routeData.totalDistance || 'N/A'} total
                </div>
              )}
              {routeData.lastUpdate && (
                <div className="text-xs text-gray-500">
                  Last update: {formatTime(routeData.lastUpdate)}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Route Map */}
      {createRouteVisualization()}

      {/* Stops Timeline */}
      {routeData.stops && routeData.stops.length > 0 && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              Route Stops Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {routeData.stops.map((stop: RouteStop, index: number) => (
                <div 
                  key={stop.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedStop?.id === stop.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedStop(selectedStop?.id === stop.id ? null : stop)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {stop.school ? (
                        <Target className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Pause className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">
                        {formatTime(stop.arrivalTime || stop.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {stop.school ? stop.school.name : `Stop ${index + 1}`}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatDuration(stop.duration)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {parseFloat(stop.latitude).toFixed(4)}, {parseFloat(stop.longitude).toFixed(4)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInMaps(stop.latitude, stop.longitude, stop.school?.name || 'Stop');
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Stop Details */}
      {selectedStop && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Stop Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Arrival Time</label>
                <p className="text-sm">{formatTime(selectedStop.arrivalTime || selectedStop.timestamp)}</p>
              </div>
              {selectedStop.departureTime && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Departure Time</label>
                  <p className="text-sm">{formatTime(selectedStop.departureTime)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">Duration</label>
                <p className="text-sm">{formatDuration(selectedStop.duration)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Location</label>
                <p className="text-sm">{parseFloat(selectedStop.latitude).toFixed(6)}, {parseFloat(selectedStop.longitude).toFixed(6)}</p>
              </div>
              {selectedStop.school && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">School</label>
                    <p className="text-sm">{selectedStop.school.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="text-sm">{selectedStop.school.address}</p>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openInMaps(selectedStop.latitude, selectedStop.longitude, selectedStop.school?.name || 'Stop')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Maps
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStop(null)}
              >
                Close Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}