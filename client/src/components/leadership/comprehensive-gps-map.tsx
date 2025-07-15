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
  Play,
  Square,
  ExternalLink,
  CheckCircle,
  XCircle,
  Users
} from "lucide-react";

interface GpsTrack {
  id: number;
  sessionId: number;
  driverId: number;
  routeId: number;
  schoolId: number | null;
  latitude: string;
  longitude: string;
  speed: number | null;
  bearing: number | null;
  accuracy: number | null;
  eventType: string;
  arrivalTime: string | null;
  departureTime: string | null;
  timestamp: string;
  school: {
    id: number;
    name: string;
    address: string;
  } | null;
}

interface ComprehensiveGpsMapProps {
  sessionId: number;
  driverName?: string;
  routeName?: string;
  isRealTime?: boolean;
}

export default function ComprehensiveGpsMap({ 
  sessionId, 
  driverName, 
  routeName, 
  isRealTime = false 
}: ComprehensiveGpsMapProps) {
  const [selectedTrack, setSelectedTrack] = useState<GpsTrack | null>(null);

  // Fetch GPS tracks for this session
  const { data: tracks = [], isLoading, error } = useQuery<GpsTrack[]>({
    queryKey: [`/api/gps/sessions/${sessionId}/tracks-simple`],
    enabled: !!sessionId,
    refetchInterval: isRealTime ? 10000 : undefined, // Refresh every 10 seconds for real-time
    retry: 1,
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openMapsLocation = (lat: string, lng: string, name: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=15`;
    window.open(url, '_blank');
  };

  // Create a visual route map using SVG
  const createRouteVisualization = () => {
    if (!tracks || tracks.length === 0) return null;

    // Get coordinates from tracks
    const coordinates = tracks.map(track => ({
      lat: parseFloat(track.latitude),
      lng: parseFloat(track.longitude),
      timestamp: track.timestamp,
      eventType: track.eventType,
      school: track.school,
      speed: track.speed
    })).filter(coord => !isNaN(coord.lat) && !isNaN(coord.lng));

    if (coordinates.length === 0) return null;

    // Calculate bounds
    const lats = coordinates.map(coord => coord.lat);
    const lngs = coordinates.map(coord => coord.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding to bounds
    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;
    const padding = 0.1;

    const bounds = {
      minLat: minLat - latRange * padding,
      maxLat: maxLat + latRange * padding,
      minLng: minLng - lngRange * padding,
      maxLng: maxLng + lngRange * padding
    };

    // Convert coordinates to SVG positions
    const mapWidth = 600;
    const mapHeight = 400;
    const svgPadding = 40;

    const scaleX = (mapWidth - 2 * svgPadding) / (bounds.maxLng - bounds.minLng);
    const scaleY = (mapHeight - 2 * svgPadding) / (bounds.maxLat - bounds.minLat);

    const coordsToSVG = (lat: number, lng: number) => ({
      x: svgPadding + (lng - bounds.minLng) * scaleX,
      y: mapHeight - (svgPadding + (lat - bounds.minLat) * scaleY)
    });

    // Create path string for route
    const pathCoords = coordinates.map(coord => coordsToSVG(coord.lat, coord.lng));
    const pathString = pathCoords.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    // Get school stops
    const schoolStops = coordinates.filter(coord => coord.school && coord.eventType === 'school_arrival');

    return (
      <div className="space-y-4">
        {/* Route Map Visualization */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RouteIcon className="h-5 w-5 text-blue-600" />
              Route Visualization
              {isRealTime && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Activity className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <svg 
                width={mapWidth} 
                height={mapHeight} 
                className="w-full h-auto border border-gray-200 rounded bg-gradient-to-br from-green-50 to-blue-50"
                viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              >
                {/* Grid pattern for geographic context */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Route path */}
                {pathString && (
                  <path
                    d={pathString}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                  />
                )}
                
                {/* Start point */}
                {coordinates.length > 0 && (
                  <g>
                    {(() => {
                      const startPoint = coordsToSVG(coordinates[0].lat, coordinates[0].lng);
                      return (
                        <circle
                          cx={startPoint.x}
                          cy={startPoint.y}
                          r="8"
                          fill="#10b981"
                          stroke="white"
                          strokeWidth="2"
                          className="drop-shadow-md"
                        />
                      );
                    })()}
                  </g>
                )}
                
                {/* End point */}
                {coordinates.length > 1 && (
                  <g>
                    {(() => {
                      const endPoint = coordsToSVG(
                        coordinates[coordinates.length - 1].lat, 
                        coordinates[coordinates.length - 1].lng
                      );
                      return (
                        <circle
                          cx={endPoint.x}
                          cy={endPoint.y}
                          r="8"
                          fill="#ef4444"
                          stroke="white"
                          strokeWidth="2"
                          className="drop-shadow-md"
                        />
                      );
                    })()}
                  </g>
                )}
                
                {/* School stops */}
                {schoolStops.map((stop, index) => {
                  const point = coordsToSVG(stop.lat, stop.lng);
                  return (
                    <g key={index}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="6"
                        fill="#f59e0b"
                        stroke="white"
                        strokeWidth="2"
                        className="cursor-pointer drop-shadow-md"
                        onClick={() => openMapsLocation(stop.lat.toString(), stop.lng.toString(), stop.school?.name || 'School')}
                      />
                      <text
                        x={point.x}
                        y={point.y - 15}
                        textAnchor="middle"
                        className="text-xs font-medium fill-gray-700"
                      >
                        {stop.school?.name || 'School'}
                      </text>
                    </g>
                  );
                })}
                
                {/* Coordinate labels */}
                <text x="10" y="20" className="text-xs fill-gray-500">
                  {bounds.maxLat.toFixed(4)}°N
                </text>
                <text x="10" y={mapHeight - 10} className="text-xs fill-gray-500">
                  {bounds.minLat.toFixed(4)}°N
                </text>
                <text x={mapWidth - 80} y={mapHeight - 10} className="text-xs fill-gray-500">
                  {bounds.maxLng.toFixed(4)}°W
                </text>
              </svg>
              
              {/* Map Legend */}
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  <span>Start</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-500 rounded-full border-2 border-white"></div>
                  <span>School Stop</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                  <span>End</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 bg-blue-500 rounded"></div>
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
            <span>Loading GPS data...</span>
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
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Failed to load GPS data</p>
            <p className="text-sm text-gray-500">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No GPS tracking data available</p>
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
              <div className="text-sm text-gray-600">
                {tracks.length} GPS points tracked
              </div>
              <div className="text-xs text-gray-500">
                Last update: {formatTime(tracks[tracks.length - 1]?.timestamp || '')}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Route Visualization */}
      {createRouteVisualization()}

      {/* GPS Tracking Timeline */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            GPS Tracking Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {tracks.map((track, index) => (
              <div 
                key={track.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => setSelectedTrack(track)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {track.eventType === 'school_arrival' ? (
                      <Target className="h-4 w-4 text-amber-600" />
                    ) : track.eventType === 'route_start' ? (
                      <Play className="h-4 w-4 text-green-600" />
                    ) : track.eventType === 'route_end' ? (
                      <Square className="h-4 w-4 text-red-600" />
                    ) : (
                      <MapPin className="h-4 w-4 text-blue-600" />
                    )}
                    <span className="text-sm font-medium">
                      {formatTime(track.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {track.school ? `${track.school.name} - ${track.eventType.replace('_', ' ')}` : track.eventType.replace('_', ' ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {parseFloat(track.latitude).toFixed(4)}, {parseFloat(track.longitude).toFixed(4)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMapsLocation(track.latitude, track.longitude, track.school?.name || 'Location');
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

      {/* Selected Track Details */}
      {selectedTrack && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              GPS Point Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Timestamp</label>
                <p className="text-sm">{formatDate(selectedTrack.timestamp)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Event Type</label>
                <p className="text-sm capitalize">{selectedTrack.eventType.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Location</label>
                <p className="text-sm">{parseFloat(selectedTrack.latitude).toFixed(6)}, {parseFloat(selectedTrack.longitude).toFixed(6)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Speed</label>
                <p className="text-sm">{selectedTrack.speed ? `${selectedTrack.speed} mph` : 'Unknown'}</p>
              </div>
              {selectedTrack.school && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">School</label>
                    <p className="text-sm">{selectedTrack.school.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="text-sm">{selectedTrack.school.address}</p>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openMapsLocation(selectedTrack.latitude, selectedTrack.longitude, selectedTrack.school?.name || 'Location')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Maps
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTrack(null)}
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