import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Navigation, School, AlertTriangle } from "lucide-react";
import StudentPickupDropdown from "./student-pickup-dropdown";

interface RouteMapViewerProps {
  sessionId: number;
  isRealTime?: boolean;
}

interface GpsTrack {
  id: number;
  latitude: string;
  longitude: string;
  timestamp: string;
  eventType?: string;
  speed?: number;
}

interface School {
  id: number;
  name: string;
  address: string;
}

interface RouteMapData {
  path: GpsTrack[];
  stops: Array<{
    id: number;
    latitude: string;
    longitude: string;
    timestamp: string;
    schoolId?: number;
    school?: School;
    duration?: number;
    studentsPickedUp?: number;
    totalStudents?: number;
  }>;
  currentPosition?: {
    latitude: string;
    longitude: string;
    timestamp: string;
  };
}

export default function RouteMapViewer({ sessionId, isRealTime = false }: RouteMapViewerProps) {
  console.log('RouteMapViewer loading for session:', sessionId, 'realTime:', isRealTime);

  // Fetch map data for this session
  const { data: mapData, isLoading: isLoadingMap, error: mapError } = useQuery({
    queryKey: [`/api/routes/${sessionId}/map-data`],
    refetchInterval: isRealTime ? 15000 : false, // Refresh every 15 seconds if real-time
    enabled: !!sessionId,
  }) as { data: RouteMapData | undefined, isLoading: boolean, error: any };

  // Fetch session details
  const { data: sessionDetails, isLoading: isLoadingSession } = useQuery({
    queryKey: [`/api/pickup-sessions/${sessionId}`],
    enabled: !!sessionId,
  });

  if (isLoadingMap || isLoadingSession) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading route map...</p>
        </CardContent>
      </Card>
    );
  }

  if (mapError) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Error loading route map</p>
          <p className="text-sm text-gray-500">Unable to fetch GPS tracking data</p>
        </CardContent>
      </Card>
    );
  }

  if (!mapData || (!mapData.path.length && !mapData.stops.length)) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No GPS data available</p>
          <p className="text-sm text-gray-500">
            {isRealTime ? 'GPS tracking will appear when driver starts route' : 'No GPS data recorded for this route'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCoordinate = (coord: string) => {
    return parseFloat(coord).toFixed(6);
  };

  // Calculate total route duration
  const getRouteDuration = () => {
    if (mapData.path.length < 2) return null;
    const start = new Date(mapData.path[0].timestamp);
    const end = new Date(mapData.path[mapData.path.length - 1].timestamp);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    return durationMinutes;
  };

  const routeDuration = getRouteDuration();

  return (
    <div className="space-y-6">
      {/* Route Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Route Map - Session #{sessionId}
            {isRealTime && (
              <Badge variant="secondary">Live Tracking</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
            <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{mapData.path.length}</div>
              <div className="text-xs sm:text-sm text-blue-800">GPS Points</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{mapData.stops.length}</div>
              <div className="text-xs sm:text-sm text-green-800">School Stops</div>
            </div>
            {routeDuration && (
              <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-purple-600">{routeDuration}</div>
                <div className="text-xs sm:text-sm text-purple-800">Minutes</div>
              </div>
            )}
            {sessionDetails && (
              <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
                <div className="text-sm sm:text-lg font-bold text-orange-600 truncate">
                  {sessionDetails.driver?.firstName} {sessionDetails.driver?.lastName}
                </div>
                <div className="text-xs sm:text-sm text-orange-800">Driver</div>
              </div>
            )}
          </div>

          {/* Route Map Visualization */}
          <div className="border rounded-lg bg-gray-50 p-2 sm:p-4 min-h-[300px] sm:min-h-[400px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-blue-50 to-purple-100">
              {/* Geographic background pattern */}
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%" viewBox="0 0 800 600">
                  {/* Road network pattern */}
                  <defs>
                    <pattern id="roads" patternUnits="userSpaceOnUse" width="40" height="40">
                      <rect width="40" height="40" fill="#f3f4f6"/>
                      <path d="M0,20 L40,20" stroke="#d1d5db" strokeWidth="2"/>
                      <path d="M20,0 L20,40" stroke="#d1d5db" strokeWidth="2"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#roads)"/>
                  
                  {/* Area patches for geographic context */}
                  <ellipse cx="200" cy="150" rx="80" ry="60" fill="#dcfce7" opacity="0.6"/>
                  <ellipse cx="600" cy="300" rx="100" ry="80" fill="#fef3c7" opacity="0.6"/>
                  <ellipse cx="400" cy="450" rx="120" ry="70" fill="#e0e7ff" opacity="0.6"/>
                </svg>
              </div>

              {/* GPS Route Path */}
              {mapData.path.length > 1 && (
                <svg 
                  width="100%" 
                  height="100%" 
                  viewBox="0 0 800 600"
                  className="absolute inset-0"
                >
                  {/* Route path line */}
                  <path
                    d={mapData.path.map((point, index) => {
                      const lat = parseFloat(point.latitude);
                      const lng = parseFloat(point.longitude);
                      // Simple coordinate mapping to SVG space
                      const x = ((lng + 87) * 800) / 2; // Rough Nashville area mapping
                      const y = ((37 - lat) * 600) / 2;
                      return `${index === 0 ? 'M' : 'L'} ${Math.max(50, Math.min(750, x))} ${Math.max(50, Math.min(550, y))}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                    opacity="0.8"
                  />
                  
                  {/* Start point */}
                  {mapData.path.length > 0 && (
                    <g>
                      <circle
                        cx={Math.max(50, Math.min(750, ((parseFloat(mapData.path[0].longitude) + 87) * 800) / 2))}
                        cy={Math.max(50, Math.min(550, ((37 - parseFloat(mapData.path[0].latitude)) * 600) / 2))}
                        r="12"
                        fill="#16a34a"
                        stroke="white"
                        strokeWidth="3"
                      />
                      <text
                        x={Math.max(50, Math.min(750, ((parseFloat(mapData.path[0].longitude) + 87) * 800) / 2))}
                        y={Math.max(30, Math.min(530, ((37 - parseFloat(mapData.path[0].latitude)) * 600) / 2 - 20))}
                        textAnchor="middle"
                        className="text-sm font-bold fill-green-700"
                      >
                        START {formatTime(mapData.path[0].timestamp)}
                      </text>
                    </g>
                  )}
                  
                  {/* End point */}
                  {mapData.path.length > 1 && (
                    <g>
                      <circle
                        cx={Math.max(50, Math.min(750, ((parseFloat(mapData.path[mapData.path.length - 1].longitude) + 87) * 800) / 2))}
                        cy={Math.max(50, Math.min(550, ((37 - parseFloat(mapData.path[mapData.path.length - 1].latitude)) * 600) / 2))}
                        r="12"
                        fill="#dc2626"
                        stroke="white"
                        strokeWidth="3"
                      />
                      <text
                        x={Math.max(50, Math.min(750, ((parseFloat(mapData.path[mapData.path.length - 1].longitude) + 87) * 800) / 2))}
                        y={Math.max(30, Math.min(530, ((37 - parseFloat(mapData.path[mapData.path.length - 1].latitude)) * 600) / 2 - 20))}
                        textAnchor="middle"
                        className="text-sm font-bold fill-red-700"
                      >
                        END {formatTime(mapData.path[mapData.path.length - 1].timestamp)}
                      </text>
                    </g>
                  )}
                  
                  {/* School stops */}
                  {mapData.stops.map((stop, index) => {
                    const x = Math.max(50, Math.min(750, ((parseFloat(stop.longitude) + 87) * 800) / 2));
                    const y = Math.max(50, Math.min(550, ((37 - parseFloat(stop.latitude)) * 600) / 2));
                    
                    return (
                      <g key={stop.id}>
                        <circle
                          cx={x}
                          cy={y}
                          r="15"
                          fill="#f59e0b"
                          stroke="white"
                          strokeWidth="3"
                        />
                        <text
                          x={x}
                          y={y + 5}
                          textAnchor="middle"
                          className="text-sm font-bold fill-white"
                        >
                          {index + 1}
                        </text>
                        <text
                          x={x}
                          y={Math.max(30, y - 25)}
                          textAnchor="middle"
                          className="text-xs font-semibold fill-orange-800"
                        >
                          {stop.school?.name || `Stop ${index + 1}`}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Current position for real-time */}
                  {isRealTime && mapData.currentPosition && (
                    <g>
                      <circle
                        cx={Math.max(50, Math.min(750, ((parseFloat(mapData.currentPosition.longitude) + 87) * 800) / 2))}
                        cy={Math.max(50, Math.min(550, ((37 - parseFloat(mapData.currentPosition.latitude)) * 600) / 2))}
                        r="10"
                        fill="#8b5cf6"
                        stroke="white"
                        strokeWidth="3"
                        className="animate-pulse"
                      />
                      <text
                        x={Math.max(50, Math.min(750, ((parseFloat(mapData.currentPosition.longitude) + 87) * 800) / 2))}
                        y={Math.max(30, Math.min(530, ((37 - parseFloat(mapData.currentPosition.latitude)) * 600) / 2 - 20))}
                        textAnchor="middle"
                        className="text-sm font-bold fill-purple-700"
                      >
                        CURRENT
                      </text>
                    </g>
                  )}
                </svg>
              )}
            </div>

            {/* Map Legend - Mobile optimized */}
            <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-white/90 p-2 sm:p-3 rounded-lg shadow-sm max-w-[45%]">
              <div className="text-xs font-semibold mb-1 sm:mb-2">Legend</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-600 rounded-full flex-shrink-0"></div>
                  <span className="text-xs">Start</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs">Schools</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-600 rounded-full flex-shrink-0"></div>
                  <span className="text-xs">End</span>
                </div>
                {isRealTime && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-600 rounded-full animate-pulse flex-shrink-0"></div>
                    <span className="text-xs">Live</span>
                  </div>
                )}
              </div>
            </div>

            {/* External map link - Mobile optimized */}
            <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (mapData.path.length > 0) {
                    const centerLat = mapData.path[Math.floor(mapData.path.length / 2)].latitude;
                    const centerLng = mapData.path[Math.floor(mapData.path.length / 2)].longitude;
                    const url = `https://www.google.com/maps?q=${centerLat},${centerLng}&z=14`;
                    window.open(url, '_blank');
                  }
                }}
                className="bg-white/90 text-xs p-2"
              >
                <Navigation className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Open in Maps</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPS Timeline */}
      {mapData.path.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              GPS Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mapData.path.filter((_, index) => index % 5 === 0 || index === mapData.path.length - 1).map((point, index) => (
                <div key={point.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{formatTime(point.timestamp)}</div>
                    <div className="text-xs text-gray-600">
                      {formatCoordinate(point.latitude)}, {formatCoordinate(point.longitude)}
                    </div>
                  </div>
                  {point.speed !== undefined && (
                    <Badge variant="outline">{Math.round(point.speed)} mph</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* School Stops Details */}
      {mapData.stops.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              School Stops
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mapData.stops.map((stop, index) => (
                <div key={stop.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{stop.school?.name || `Stop ${index + 1}`}</div>
                        <div className="text-sm text-gray-600">{stop.school?.address}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatTime(stop.timestamp)}</div>
                      {stop.duration && (
                        <div className="text-xs text-gray-600">{stop.duration} min stop</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span>📍 {formatCoordinate(stop.latitude)}, {formatCoordinate(stop.longitude)}</span>
                    {stop.studentsPickedUp !== undefined && stop.totalStudents !== undefined && (
                      <span>👥 {stop.studentsPickedUp}/{stop.totalStudents} students</span>
                    )}
                  </div>
                  
                  {/* Student pickup details dropdown */}
                  <StudentPickupDropdown sessionId={sessionId} schoolId={stop.schoolId} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}