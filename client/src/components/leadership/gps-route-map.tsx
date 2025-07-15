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
                <svg
                  width={mapData.mapWidth}
                  height={mapData.mapHeight}
                  className="border rounded-lg bg-gray-50"
                >
                  {/* Route path */}
                  <path
                    d={mapData.pathString}
                    fill="none"
                    stroke={isActive ? "#2563eb" : "#6b7280"}
                    strokeWidth="3"
                    strokeOpacity="0.8"
                  />
                  
                  {/* School markers */}
                  {schoolStops.map((school, index) => {
                    const lat = parseFloat(school.latitude);
                    const lng = parseFloat(school.longitude);
                    if (isNaN(lat) || isNaN(lng)) return null;
                    
                    const position = mapData.coordsToSVG(lat, lng);
                    const timestamp = routePath.schoolTimestamps.find(st => st.schoolId === school.id);
                    const isVisited = !!timestamp?.arrivalTime;
                    
                    return (
                      <g key={school.id}>
                        <circle
                          cx={position.x}
                          cy={position.y}
                          r="8"
                          fill={isVisited ? "#22c55e" : "#ef4444"}
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="cursor-pointer hover:r-10 transition-all"
                          onClick={() => openExternalMap(lat, lng, school.name)}
                        />
                        <text
                          x={position.x}
                          y={position.y - 12}
                          textAnchor="middle"
                          className="text-xs font-medium fill-gray-700"
                        >
                          {index + 1}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Current location marker for active routes */}
                  {isActive && currentLocation && (
                    <circle
                      cx={mapData.coordsToSVG(currentLocation.lat, currentLocation.lng).x}
                      cy={mapData.coordsToSVG(currentLocation.lat, currentLocation.lng).y}
                      r="10"
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth="3"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* GPS tracking points */}
                  {routePath.coordinates.map((coord, index) => {
                    const position = mapData.coordsToSVG(coord.lat, coord.lng);
                    return (
                      <circle
                        key={index}
                        cx={position.x}
                        cy={position.y}
                        r="2"
                        fill="#94a3b8"
                        fillOpacity="0.6"
                      />
                    );
                  })}
                </svg>
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