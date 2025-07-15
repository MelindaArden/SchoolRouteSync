import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Navigation, Target, Route as RouteIcon, Users, Download, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import RouteCompletionImage from "./route-completion-image";

interface RouteMapProps {
  sessionId: number;
  isRealTime?: boolean;
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
    id: number;
    latitude: string;
    longitude: string;
    timestamp: string;
    speed?: number;
  }>;
  schoolStops: Array<{
    schoolId: number;
    schoolName: string;
    latitude: string;
    longitude: string;
    arrivalTime: string;
    departureTime?: string;
    studentsPickedUp: number;
    totalStudents: number;
    duration: number;
  }>;
  currentLocation?: {
    latitude: string;
    longitude: string;
    timestamp: string;
  };
}

export default function RealTimeRouteMap({ sessionId, isRealTime = false }: RouteMapProps) {
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const [showCompletionImage, setShowCompletionImage] = useState(false);
  const [generatedCompletionImage, setGeneratedCompletionImage] = useState<string | null>(null);

  const { data: routeDetail, refetch } = useQuery<RouteDetail>({
    queryKey: ["/api/route-details", sessionId],
    refetchInterval: isRealTime ? 10000 : undefined, // Real-time updates every 10 seconds
  });

  // Query for route completion image if route is completed
  const { data: completionImageData } = useQuery({
    queryKey: [`/api/routes/${sessionId}/completion-image`],
    enabled: routeDetail?.status === 'completed',
    retry: false
  });

  if (!routeDetail) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading route data...</p>
          </div>
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

  // Calculate map bounds for visualization
  const allLatitudes = [
    ...routeDetail.routePath.map(p => parseFloat(p.latitude)),
    ...routeDetail.schoolStops.map(s => parseFloat(s.latitude))
  ];
  const allLongitudes = [
    ...routeDetail.routePath.map(p => parseFloat(p.longitude)),
    ...routeDetail.schoolStops.map(s => parseFloat(s.longitude))
  ];

  const minLat = Math.min(...allLatitudes);
  const maxLat = Math.max(...allLatitudes);
  const minLng = Math.min(...allLongitudes);
  const maxLng = Math.max(...allLongitudes);

  const mapWidth = 800;
  const mapHeight = 600;
  const padding = 50;

  // Convert GPS coordinates to SVG coordinates
  const coordToSVG = (lat: number, lng: number) => {
    const x = padding + ((lng - minLng) / (maxLng - minLng)) * (mapWidth - 2 * padding);
    const y = mapHeight - padding - ((lat - minLat) / (maxLat - minLat)) * (mapHeight - 2 * padding);
    return { x, y };
  };

  // Generate route path for SVG
  const routePathPoints = routeDetail.routePath.map(point => {
    const { x, y } = coordToSVG(parseFloat(point.latitude), parseFloat(point.longitude));
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-6">
      {/* Route Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                {routeDetail.routeName} - {routeDetail.driverName}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant={routeDetail.status === 'completed' ? 'default' : 'secondary'}>
                  {routeDetail.status}
                </Badge>
                {routeDetail.startTime && (
                  <span className="text-sm text-gray-600">
                    Started: {formatTime(routeDetail.startTime)}
                  </span>
                )}
                {routeDetail.endTime && (
                  <span className="text-sm text-gray-600">
                    Completed: {formatTime(routeDetail.endTime)}
                  </span>
                )}
                {routeDetail.durationMinutes && (
                  <Badge variant="outline">
                    {routeDetail.durationMinutes} minutes
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {isRealTime && (
                <Button onClick={() => refetch()} variant="outline" size="sm">
                  <Target className="h-4 w-4 mr-2" />
                  Refresh Location
                </Button>
              )}
              {routeDetail.status === 'completed' && (
                <>
                  {completionImageData && (
                    <Button 
                      onClick={() => setShowCompletionImage(true)} 
                      variant="outline" 
                      size="sm"
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      View Completion Report
                    </Button>
                  )}
                  <Button 
                    onClick={() => setShowCompletionImage(true)} 
                    variant="outline" 
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Interactive Route Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Route Map with GPS Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            <svg width={mapWidth} height={mapHeight} className="w-full h-auto border rounded">
              {/* Background grid pattern */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                </pattern>
                <pattern id="roads" width="80" height="80" patternUnits="userSpaceOnUse">
                  <rect width="80" height="80" fill="none"/>
                  <path d="M0,40 L80,40" stroke="#d1d5db" strokeWidth="2"/>
                  <path d="M40,0 L40,80" stroke="#d1d5db" strokeWidth="2"/>
                </pattern>
              </defs>
              
              <rect width={mapWidth} height={mapHeight} fill="url(#grid)"/>
              <rect width={mapWidth} height={mapHeight} fill="url(#roads)" opacity="0.3"/>
              
              {/* Route path */}
              {routeDetail.routePath.length > 1 && (
                <polyline
                  points={routePathPoints}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                  opacity="0.8"
                />
              )}
              
              {/* School stops */}
              {routeDetail.schoolStops.map((stop, index) => {
                const { x, y } = coordToSVG(parseFloat(stop.latitude), parseFloat(stop.longitude));
                return (
                  <g key={stop.schoolId}>
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="3"
                      className="cursor-pointer"
                      onClick={() => setSelectedStop(selectedStop === index ? null : index)}
                    />
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {index + 1}
                    </text>
                    {/* School label */}
                    <text
                      x={x}
                      y={y - 20}
                      textAnchor="middle"
                      fill="#374151"
                      fontSize="12"
                      fontWeight="500"
                    >
                      {stop.schoolName}
                    </text>
                  </g>
                );
              })}
              
              {/* Route path waypoints with timestamps */}
              {routeDetail.routePath.map((point, index) => {
                if (index % 10 === 0 || index === routeDetail.routePath.length - 1) { // Show every 10th point
                  const { x, y } = coordToSVG(parseFloat(point.latitude), parseFloat(point.longitude));
                  return (
                    <g key={point.id}>
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={x + 8}
                        y={y - 8}
                        fill="#059669"
                        fontSize="10"
                        fontWeight="500"
                      >
                        {formatTime(point.timestamp)}
                      </text>
                    </g>
                  );
                }
                return null;
              })}
              
              {/* Current location (real-time) */}
              {isRealTime && routeDetail.currentLocation && (
                <g>
                  <circle
                    cx={coordToSVG(parseFloat(routeDetail.currentLocation.latitude), parseFloat(routeDetail.currentLocation.longitude)).x}
                    cy={coordToSVG(parseFloat(routeDetail.currentLocation.latitude), parseFloat(routeDetail.currentLocation.longitude)).y}
                    r="8"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="3"
                    className="animate-pulse"
                  />
                  <text
                    x={coordToSVG(parseFloat(routeDetail.currentLocation.latitude), parseFloat(routeDetail.currentLocation.longitude)).x}
                    y={coordToSVG(parseFloat(routeDetail.currentLocation.latitude), parseFloat(routeDetail.currentLocation.longitude)).y - 15}
                    textAnchor="middle"
                    fill="#d97706"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    CURRENT
                  </text>
                </g>
              )}
              
              {/* Start point */}
              {routeDetail.routePath.length > 0 && (
                <g>
                  <circle
                    cx={coordToSVG(parseFloat(routeDetail.routePath[0].latitude), parseFloat(routeDetail.routePath[0].longitude)).x}
                    cy={coordToSVG(parseFloat(routeDetail.routePath[0].latitude), parseFloat(routeDetail.routePath[0].longitude)).y}
                    r="10"
                    fill="#16a34a"
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                  <text
                    x={coordToSVG(parseFloat(routeDetail.routePath[0].latitude), parseFloat(routeDetail.routePath[0].longitude)).x}
                    y={coordToSVG(parseFloat(routeDetail.routePath[0].latitude), parseFloat(routeDetail.routePath[0].longitude)).y + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    START
                  </text>
                </g>
              )}
              
              {/* End point */}
              {routeDetail.routePath.length > 0 && routeDetail.status === 'completed' && (
                <g>
                  <circle
                    cx={coordToSVG(parseFloat(routeDetail.routePath[routeDetail.routePath.length - 1].latitude), parseFloat(routeDetail.routePath[routeDetail.routePath.length - 1].longitude)).x}
                    cy={coordToSVG(parseFloat(routeDetail.routePath[routeDetail.routePath.length - 1].latitude), parseFloat(routeDetail.routePath[routeDetail.routePath.length - 1].longitude)).y}
                    r="10"
                    fill="#dc2626"
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                  <text
                    x={coordToSVG(parseFloat(routeDetail.routePath[routeDetail.routePath.length - 1].latitude), parseFloat(routeDetail.routePath[routeDetail.routePath.length - 1].longitude)).x}
                    y={coordToSVG(parseFloat(routeDetail.routePath[routeDetail.routePath.length - 1].latitude), parseFloat(routeDetail.routePath[routeDetail.routePath.length - 1].longitude)).y + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    END
                  </text>
                </g>
              )}
            </svg>
            
            {/* Map Legend */}
            <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg border">
              <h4 className="font-semibold text-sm mb-2">Legend</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span>Start Point</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>School Stops</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span>GPS Waypoints</span>
                </div>
                {isRealTime && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                    <span>Current Location</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 border-t-2 border-blue-500 border-dashed"></div>
                  <span>Route Path</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* School Stop Details */}
      {selectedStop !== null && routeDetail.schoolStops[selectedStop] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {routeDetail.schoolStops[selectedStop].schoolName} - Stop Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Arrival Time</p>
                <p className="font-semibold">{formatTime(routeDetail.schoolStops[selectedStop].arrivalTime)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Students Picked Up</p>
                <p className="font-semibold">
                  {routeDetail.schoolStops[selectedStop].studentsPickedUp}/{routeDetail.schoolStops[selectedStop].totalStudents}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Stop Duration</p>
                <p className="font-semibold">{routeDetail.schoolStops[selectedStop].duration} minutes</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">GPS Coordinates</p>
                <p className="font-mono text-xs">
                  {formatCoordinate(routeDetail.schoolStops[selectedStop].latitude)}, {formatCoordinate(routeDetail.schoolStops[selectedStop].longitude)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RouteIcon className="h-5 w-5" />
            Route Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600">Total GPS Points</span>
              </div>
              <div className="text-lg font-bold text-blue-800">{routeDetail.routePath.length}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">School Stops</span>
              </div>
              <div className="text-lg font-bold text-red-800">{routeDetail.schoolStops.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Students Picked Up</span>
              </div>
              <div className="text-lg font-bold text-green-800">
                {routeDetail.schoolStops.reduce((sum, stop) => sum + stop.studentsPickedUp, 0)}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-600">Route Duration</span>
              </div>
              <div className="text-lg font-bold text-purple-800">
                {routeDetail.durationMinutes || 'In Progress'} {routeDetail.durationMinutes ? 'min' : ''}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coordinate Details */}
      {isRealTime && routeDetail.currentLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Current Location Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-amber-700">Current GPS Coordinates</p>
                  <p className="font-mono text-sm font-semibold">
                    {formatCoordinate(routeDetail.currentLocation.latitude)}, {formatCoordinate(routeDetail.currentLocation.longitude)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-amber-700">Last Update</p>
                  <p className="font-semibold">{formatTime(routeDetail.currentLocation.timestamp)}</p>
                </div>
                <div>
                  <p className="text-sm text-amber-700">Status</p>
                  <Badge variant="outline" className="bg-amber-100 border-amber-300">
                    Live Tracking
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Completion Image Modal */}
      {showCompletionImage && routeDetail.status === 'completed' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Route Completion Report</h3>
              <Button variant="outline" onClick={() => setShowCompletionImage(false)}>
                Close
              </Button>
            </div>
            <div className="p-6">
              {completionImageData?.completionImage ? (
                <div className="space-y-4">
                  <img 
                    src={completionImageData.completionImage} 
                    alt="Route completion report"
                    className="w-full h-auto border rounded-lg"
                  />
                  <div className="text-center">
                    <Button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = completionImageData.completionImage;
                        link.download = `route-completion-${routeDetail.routeName}-${new Date().toISOString().split('T')[0]}.png`;
                        link.click();
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Completion Report
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <RouteCompletionImage
                    routeName={routeDetail.routeName}
                    driverName={routeDetail.driverName}
                    startTime={routeDetail.startTime || ''}
                    endTime={routeDetail.endTime || ''}
                    routePath={routeDetail.routePath}
                    schoolStops={routeDetail.schoolStops}
                    onImageGenerated={(imageData) => {
                      setGeneratedCompletionImage(imageData);
                      // Optionally save to server
                      fetch(`/api/routes/${sessionId}/complete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ completionImageData: imageData })
                      });
                    }}
                  />
                  {generatedCompletionImage && (
                    <div className="mt-4 text-center">
                      <Button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = generatedCompletionImage;
                          link.download = `route-completion-${routeDetail.routeName}-${new Date().toISOString().split('T')[0]}.png`;
                          link.click();
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Generated Report
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}