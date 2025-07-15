import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWebSocket } from "@/hooks/use-websocket";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Users, 
  RefreshCw, 
  Route as RouteIcon,
  History,
  Target,
  Activity
} from "lucide-react";

interface GpsRouteHistory {
  id: number;
  sessionId: number;
  driverId: number;
  routeId: number;
  routeName: string;
  startTime: string;
  endTime: string | null;
  totalDistance: number | null;
  averageSpeed: number | null;
  maxSpeed: number | null;
  schoolsVisited: number;
  totalStudentsPickedUp: number;
  routePath: {
    coordinates: { lat: number; lng: number; timestamp: string; speed?: number }[];
    schoolTimestamps: { schoolId: number; schoolName: string; arrivalTime: string; departureTime?: string }[];
  };
  completionStatus: string;
  createdAt: string;
  driver: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
}

interface DriverLocation {
  id: number;
  driverId: number;
  sessionId: number | null;
  latitude: string;
  longitude: string;
  timestamp: string;
  updatedAt: string;
  driver: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  session: {
    id: number;
    routeId: number;
    status: string;
    date: string;
    route: {
      id: number;
      name: string;
    };
  } | null;
}

interface GpsRouteTrack {
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

interface AdminGpsTrackingProps {
  userId: number;
}

export default function AdminGpsTracking({ userId }: AdminGpsTrackingProps) {
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // WebSocket connection for real-time updates
  useWebSocket(userId);

  // Fetch current driver locations
  const { data: driverLocations = [], refetch: refetchLocations } = useQuery<DriverLocation[]>({
    queryKey: ['/api/driver-locations'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch GPS route history for last 30 days
  const { data: routeHistory = [], refetch: refetchHistory } = useQuery<GpsRouteHistory[]>({
    queryKey: ['/api/gps/route-history'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch GPS tracks for selected session
  const { data: sessionTracks = [] } = useQuery<GpsRouteTrack[]>({
    queryKey: [`/api/gps/sessions/${selectedSession}/tracks`],
    enabled: !!selectedSession,
    refetchInterval: 15000,
  });

  // Filter active drivers (with in-progress sessions)
  const activeDrivers = driverLocations.filter(loc => 
    loc.session && loc.session.status === 'in_progress'
  );

  // Filter route history based on date and search
  const filteredHistory = routeHistory.filter(route => {
    const matchesDate = !dateFilter || route.createdAt.startsWith(dateFilter);
    const matchesSearch = !searchTerm || 
      route.routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${route.driver.firstName} ${route.driver.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  // Group history by date
  const historyByDate = filteredHistory.reduce((acc, route) => {
    const date = route.createdAt.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(route);
    return acc;
  }, {} as Record<string, GpsRouteHistory[]>);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatDistanceTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const openMapsLocation = (lat: string, lng: string, driverName: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=15`;
    window.open(url, '_blank');
  };

  const getDateCategory = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 7) return "This Week";
    if (daysDiff <= 30) return "Last 30 Days";
    return "Older";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">GPS Tracking Dashboard</h2>
          <p className="text-gray-600">Real-time driver locations and 30-day route history</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchLocations();
              refetchHistory();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="real-time" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="real-time">Real-time Tracking</TabsTrigger>
          <TabsTrigger value="route-history">Route History</TabsTrigger>
          <TabsTrigger value="detailed-view">Detailed View</TabsTrigger>
        </TabsList>

        <TabsContent value="real-time" className="space-y-4">
          {/* Active Drivers Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Active Drivers ({activeDrivers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeDrivers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Navigation className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No active drivers currently tracking</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {activeDrivers.map((location) => (
                    <div key={location.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-medium">
                              {location.driver.firstName} {location.driver.lastName}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-green-50">
                            {location.session?.route.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDriver(location.driverId)}
                            className="text-xs"
                          >
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMapsLocation(location.latitude, location.longitude, `${location.driver.firstName} ${location.driver.lastName}`)}
                            className="text-xs"
                          >
                            <Navigation className="h-3 w-3 mr-1" />
                            Maps
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Location</p>
                          <p className="font-mono text-xs">{parseFloat(location.latitude).toFixed(6)}, {parseFloat(location.longitude).toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Last Update</p>
                          <p className="font-medium">{formatDistanceTime(location.timestamp)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Route Status</p>
                          <Badge variant="secondary">{location.session?.status}</Badge>
                        </div>
                        <div>
                          <p className="text-gray-600">Session ID</p>
                          <p className="font-mono text-xs">#{location.sessionId}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="route-history" className="space-y-4">
          {/* Search and Filter Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-40"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter("")}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <RouteIcon className="h-4 w-4 text-gray-600" />
                  <Input
                    type="text"
                    placeholder="Search routes, drivers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route History by Date */}
          <div className="space-y-4">
            {Object.entries(historyByDate)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, routes]) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <History className="h-5 w-5" />
                      {getDateCategory(date)} - {formatDate(date)}
                      <Badge variant="outline">{routes.length} routes</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {routes.map((route) => (
                        <div key={route.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{route.routeName}</span>
                              <Badge variant="outline">
                                {route.driver.firstName} {route.driver.lastName}
                              </Badge>
                              <Badge variant={route.completionStatus === 'completed' ? 'default' : 'secondary'}>
                                {route.completionStatus}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSession(route.sessionId)}
                              className="text-xs"
                            >
                              View Route
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Start Time</p>
                              <p className="font-medium">{formatTime(route.startTime)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">End Time</p>
                              <p className="font-medium">{route.endTime ? formatTime(route.endTime) : 'In Progress'}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Distance</p>
                              <p className="font-medium">{route.totalDistance ? `${route.totalDistance} km` : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Schools</p>
                              <p className="font-medium">{route.schoolsVisited}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Students</p>
                              <p className="font-medium">{route.totalStudentsPickedUp}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed-view" className="space-y-4">
          {selectedSession && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Route Details - Session #{selectedSession}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionTracks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No GPS tracking data available for this session</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Route Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-600">Total GPS Points</p>
                        <p className="text-lg font-bold text-blue-800">{sessionTracks.length}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-green-600">School Arrivals</p>
                        <p className="text-lg font-bold text-green-800">
                          {sessionTracks.filter(t => t.eventType === 'school_arrival').length}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm text-purple-600">Location Updates</p>
                        <p className="text-lg font-bold text-purple-800">
                          {sessionTracks.filter(t => t.eventType === 'location_update').length}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-sm text-orange-600">Avg Accuracy</p>
                        <p className="text-lg font-bold text-orange-800">
                          {Math.round(sessionTracks.filter(t => t.accuracy).reduce((acc, t) => acc + (t.accuracy || 0), 0) / sessionTracks.filter(t => t.accuracy).length || 0)}m
                        </p>
                      </div>
                    </div>

                    {/* GPS Tracking Timeline */}
                    <div className="space-y-2">
                      <h4 className="font-medium">GPS Tracking Timeline</h4>
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {sessionTracks
                          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                          .map((track) => (
                            <div key={track.id} className="border rounded-lg p-3 text-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant={track.eventType === 'school_arrival' ? 'default' : 'outline'}>
                                    {track.eventType.replace('_', ' ')}
                                  </Badge>
                                  {track.school && (
                                    <span className="text-gray-600">at {track.school.name}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">{formatTime(track.timestamp)}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMapsLocation(track.latitude, track.longitude, `GPS Point ${track.id}`)}
                                    className="text-xs"
                                  >
                                    <MapPin className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                                <div>
                                  <span className="text-gray-600">Coordinates:</span>
                                  <span className="font-mono ml-1">{parseFloat(track.latitude).toFixed(6)}, {parseFloat(track.longitude).toFixed(6)}</span>
                                </div>
                                {track.speed && (
                                  <div>
                                    <span className="text-gray-600">Speed:</span>
                                    <span className="ml-1">{track.speed} km/h</span>
                                  </div>
                                )}
                                {track.accuracy && (
                                  <div>
                                    <span className="text-gray-600">Accuracy:</span>
                                    <span className="ml-1">{track.accuracy}m</span>
                                  </div>
                                )}
                                {track.bearing && (
                                  <div>
                                    <span className="text-gray-600">Bearing:</span>
                                    <span className="ml-1">{track.bearing}°</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}