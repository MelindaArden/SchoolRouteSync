import { useEffect, useRef, useState } from "react";
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
  Square
} from "lucide-react";

interface GpsRouteMapProps {
  sessionId: number;
  driverId: number;
  driverName: string;
  routeName: string;
  isActive: boolean;
  routePath: {
    coordinates: { lat: number; lng: number; timestamp: string; speed?: number }[];
    schoolTimestamps: { schoolId: number; schoolName: string; arrivalTime: string; departureTime?: string }[];
  };
  schoolStops: {
    id: number;
    name: string;
    address: string;
    latitude: string;
    longitude: string;
    arrivalTime?: string;
    departureTime?: string;
  }[];
  currentLocation?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
}

export default function GpsRouteMap({ 
  sessionId, 
  driverId, 
  driverName, 
  routeName, 
  isActive, 
  routePath, 
  schoolStops, 
  currentLocation 
}: GpsRouteMapProps) {
  
  // Create a simple coordinate-based map without Google Maps
  const createSimpleMap = () => {
    if (!routePath.coordinates || routePath.coordinates.length === 0) return null;

    // Calculate bounds
    const lats = routePath.coordinates.map(coord => coord.lat);
    const lngs = routePath.coordinates.map(coord => coord.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Convert coordinates to SVG positions
    const mapWidth = 400;
    const mapHeight = 300;
    const padding = 20;

    const scaleX = (mapWidth - 2 * padding) / (maxLng - minLng);
    const scaleY = (mapHeight - 2 * padding) / (maxLat - minLat);

    const coordsToSVG = (lat: number, lng: number) => ({
      x: padding + (lng - minLng) * scaleX,
      y: mapHeight - (padding + (lat - minLat) * scaleY)
    });

    const pathPoints = routePath.coordinates.map(coord => coordsToSVG(coord.lat, coord.lng));
    const pathString = pathPoints.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    return { pathString, coordsToSVG, mapWidth, mapHeight };
  };

  const mapData = createSimpleMap();

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const openExternalMap = (lat: number, lng: number, label: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=15`;
    window.open(url, '_blank');
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return "In Progress";
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const visitedSchools = routePath.schoolTimestamps.length;
  const totalSchools = schoolStops.length;

  return (
    <div className="space-y-4">
      {/* Route Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <RouteIcon className="h-5 w-5" />
                {routeName}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Driver: {driverName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? (
                  <>
                    <Activity className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <Square className="h-3 w-3 mr-1" />
                    Completed
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Schools Visited</div>
              <div className="text-lg font-bold text-blue-600">{visitedSchools}/{totalSchools}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">GPS Points</div>
              <div className="text-lg font-bold text-green-600">{routePath.coordinates.length}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Current Status</div>
              <div className="text-lg font-bold text-purple-600">
                {isActive ? "En Route" : "Completed"}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Last Update</div>
              <div className="text-lg font-bold text-orange-600">
                {currentLocation ? formatTime(currentLocation.timestamp) : "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Route Map
            <Badge variant="outline" className="ml-2">
              {isActive ? "Live Tracking" : "Completed Route"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mapData ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="relative overflow-hidden rounded-lg border">
                  <svg
                    width={mapData.mapWidth}
                    height={mapData.mapHeight}
                    className="w-full bg-gradient-to-br from-green-50 via-blue-50 to-gray-100"
                    viewBox={`0 0 ${mapData.mapWidth} ${mapData.mapHeight}`}
                  >
                    {/* Geographic Background Patterns */}
                    <defs>
                      <pattern 
                        id="geographic-grid" 
                        width="40" 
                        height="40" 
                        patternUnits="userSpaceOnUse"
                      >
                        <path 
                          d="M 40 0 L 0 0 0 40" 
                          fill="none" 
                          stroke="#d1d5db" 
                          strokeWidth="0.5"
                          opacity="0.6"
                        />
                      </pattern>
                      <pattern 
                        id="roads-pattern" 
                        width="80" 
                        height="80" 
                        patternUnits="userSpaceOnUse"
                      >
                        <line x1="0" y1="40" x2="80" y2="40" stroke="#9ca3af" strokeWidth="1.5" opacity="0.4" />
                        <line x1="40" y1="0" x2="40" y2="80" stroke="#9ca3af" strokeWidth="1.5" opacity="0.4" />
                      </pattern>
                    </defs>
                    
                    {/* Map Background Layers */}
                    <rect width="100%" height="100%" fill="url(#geographic-grid)" />
                    <rect width="100%" height="100%" fill="url(#roads-pattern)" />
                    
                    {/* Geographic Area Patches */}
                    <rect x="0" y="0" width="140" height="120" fill="#dcfce7" opacity="0.3" rx="8" />
                    <rect x="260" y="180" width="140" height="120" fill="#fef3c7" opacity="0.3" rx="8" />
                    <rect x="120" y="100" width="160" height="80" fill="#f0f9ff" opacity="0.4" rx="6" />
                    
                    {/* Route path with enhanced styling */}
                    <path
                      d={mapData.pathString}
                      fill="none"
                      stroke={isActive ? "#2563eb" : "#6b7280"}
                      strokeWidth="4"
                      strokeOpacity="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                    />
                    
                    {/* GPS tracking points with timestamps */}
                    {routePath.coordinates.map((coord, index) => {
                      const position = mapData.coordsToSVG(coord.lat, coord.lng);
                      const isKeyPoint = index % 8 === 0 || index === routePath.coordinates.length - 1;
                      return (
                        <g key={index}>
                          <circle
                            cx={position.x}
                            cy={position.y}
                            r={isKeyPoint ? "3" : "1.5"}
                            fill="#059669"
                            fillOpacity="0.8"
                            stroke="white"
                            strokeWidth="0.5"
                          />
                          {isKeyPoint && (
                            <text
                              x={position.x + 8}
                              y={position.y - 8}
                              className="text-xs fill-gray-600 font-medium"
                            >
                              {formatTime(coord.timestamp)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    
                    {/* School markers with enhanced styling */}
                    {schoolStops.map((school, index) => {
                      const lat = parseFloat(school.latitude);
                      const lng = parseFloat(school.longitude);
                      if (isNaN(lat) || isNaN(lng)) return null;
                      
                      const position = mapData.coordsToSVG(lat, lng);
                      const timestamp = routePath.schoolTimestamps.find(st => st.schoolId === school.id);
                      const isVisited = !!timestamp?.arrivalTime;
                      
                      return (
                        <g key={school.id}>
                          {/* School building representation */}
                          <rect
                            x={position.x - 12}
                            y={position.y - 12}
                            width="24"
                            height="24"
                            fill={isVisited ? "#22c55e" : "#ef4444"}
                            stroke="#ffffff"
                            strokeWidth="2"
                            rx="4"
                            className="cursor-pointer hover:opacity-80 transition-all"
                            onClick={() => openExternalMap(lat, lng, school.name)}
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                          />
                          <text
                            x={position.x}
                            y={position.y + 2}
                            textAnchor="middle"
                            className="text-sm font-bold fill-white cursor-pointer"
                            onClick={() => openExternalMap(lat, lng, school.name)}
                          >
                            {index + 1}
                          </text>
                          {/* School name label */}
                          <text
                            x={position.x}
                            y={position.y - 20}
                            textAnchor="middle"
                            className="text-xs font-medium fill-gray-700"
                          >
                            {school.name.length > 12 ? school.name.substring(0, 12) + '...' : school.name}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* Current location marker with enhanced styling */}
                    {isActive && currentLocation && (
                      <g>
                        <circle
                          cx={mapData.coordsToSVG(currentLocation.lat, currentLocation.lng).x}
                          cy={mapData.coordsToSVG(currentLocation.lat, currentLocation.lng).y}
                          r="12"
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth="3"
                          className="animate-pulse"
                          filter="drop-shadow(0 2px 6px rgba(0,0,0,0.3))"
                        />
                        <text
                          x={mapData.coordsToSVG(currentLocation.lat, currentLocation.lng).x}
                          y={mapData.coordsToSVG(currentLocation.lat, currentLocation.lng).y + 22}
                          textAnchor="middle"
                          className="text-xs font-bold fill-blue-600"
                        >
                          LIVE
                        </text>
                      </g>
                    )}
                  </svg>
                  
                  {/* Coordinate Display Overlay */}
                  <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded px-3 py-2 text-xs font-mono shadow-sm">
                    {routePath.coordinates.length > 0 && (
                      <div className="space-y-1">
                        <div>Start: {routePath.coordinates[0].lat.toFixed(4)}, {routePath.coordinates[0].lng.toFixed(4)}</div>
                        {currentLocation ? (
                          <div className="text-blue-600 font-semibold">Live: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</div>
                        ) : routePath.coordinates.length > 1 ? (
                          <div>End: {routePath.coordinates[routePath.coordinates.length - 1].lat.toFixed(4)}, {routePath.coordinates[routePath.coordinates.length - 1].lng.toFixed(4)}</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Route Map Legend */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-blue-600 rounded"></div>
                  <span>Route Path</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  <span>Visited School</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                  <span>Pending School</span>
                </div>
                {isActive && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white animate-pulse"></div>
                    <span>Current Location</span>
                  </div>
                )}
              </div>
              
              {/* External Map Links */}
              <div className="flex justify-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const firstCoord = routePath.coordinates[0];
                    if (firstCoord) {
                      openExternalMap(firstCoord.lat, firstCoord.lng, `${routeName} - Route Start`);
                    }
                  }}
                  className="text-xs"
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  View in Google Maps
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const coords = routePath.coordinates.map(c => `${c.lat},${c.lng}`).join('|');
                    const url = `https://www.google.com/maps/dir/${coords}`;
                    window.open(url, '_blank');
                  }}
                  className="text-xs"
                >
                  <Target className="h-3 w-3 mr-1" />
                  Get Directions
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No route data available</p>
              <p className="text-sm">GPS tracking will appear here when available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* School Stops Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            School Stops Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schoolStops.map((school, index) => {
              const timestamp = routePath.schoolTimestamps.find(st => st.schoolId === school.id);
              const isVisited = !!timestamp?.arrivalTime;
              
              return (
                <div key={school.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isVisited ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{school.name}</div>
                    <div className="text-sm text-gray-600">{school.address}</div>
                  </div>
                  <div className="text-right">
                    {isVisited ? (
                      <div className="text-sm">
                        <div className="font-medium text-green-600">
                          Arrived: {formatTime(timestamp.arrivalTime)}
                        </div>
                        {timestamp.departureTime && (
                          <div className="text-gray-600">
                            Departed: {formatTime(timestamp.departureTime)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}