import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWebSocket } from "@/hooks/use-websocket";
import ComprehensiveGpsMap from "@/components/leadership/comprehensive-gps-map";
import { formatRouteDisplayName } from "@/lib/route-utils";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Users, 
  RefreshCw, 
  Route as RouteIcon,
  History,
  Target,
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  User,
  ArrowLeft,
  Search,
  Calendar
} from "lucide-react";
import StudentPickupDropdown from "./student-pickup-dropdown";

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
  const [expandedRoutes, setExpandedRoutes] = useState<Set<number>>(new Set());
  
  // WebSocket connection for real-time updates
  useWebSocket(userId);

  // Fetch current driver locations (with reduced load)
  const { data: driverLocations = [], refetch: refetchLocations } = useQuery<DriverLocation[]>({
    queryKey: ['/api/driver-locations'],
    refetchInterval: 15000, // Increased to 15 seconds to reduce load
    retry: 1, // Reduce retries to prevent overwhelming
  });

  // Fetch GPS route history for last 30 days (using simplified endpoint)
  const { data: routeHistory = [], refetch: refetchHistory } = useQuery<GpsRouteHistory[]>({
    queryKey: ['/api/gps/route-history-simple'],
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1, // Reduce retries to prevent overwhelming
  });

  // Fetch GPS tracks for selected session (using simplified endpoint)
  const { data: sessionTracks = [] } = useQuery<GpsRouteTrack[]>({
    queryKey: [`/api/gps/sessions/${selectedSession}/tracks-simple`],
    enabled: !!selectedSession,
    refetchInterval: 15000,
    retry: 1, // Reduce retries to prevent overwhelming
  });

  // Filter active drivers (with in-progress sessions) - handle both simplified and full data
  const activeDrivers = driverLocations.filter(loc => {
    // Handle both simplified data structure and full data structure
    if (loc.session) {
      return loc.session.status === 'in_progress';
    }
    // For simplified structure, check if sessionId exists and is recent
    if (loc.sessionId) {
      const locationTime = new Date(loc.timestamp || loc.updatedAt);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      return locationTime > thirtyMinutesAgo;
    }
    return false;
  });

  // Filter route history based on date and search - handle simplified data
  const filteredHistory = routeHistory.filter(route => {
    // Use startTime or createdAt for date filtering
    const routeDate = route.startTime ? route.startTime.split('T')[0] : route.createdAt.split('T')[0];
    const matchesDate = !dateFilter || routeDate === dateFilter;
    
    // Handle simplified data structure for search
    const routeName = route.routeName || route.status || `Route ${route.routeId || route.id}`;
    const driverName = route.driverName || 
      (route.driver ? `${route.driver.firstName || ''} ${route.driver.lastName || ''}` : `Driver ${route.driverId}`);
    
    const matchesSearch = !searchTerm || 
      routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driverName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  // Group history by date - handle both data structures
  const historyByDate = filteredHistory.reduce((acc, route) => {
    const date = route.startTime ? route.startTime.split('T')[0] : route.createdAt.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(route);
    return acc;
  }, {} as Record<string, any[]>);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
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

  const toggleRouteExpansion = (sessionId: number) => {
    const newExpanded = new Set(expandedRoutes);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedRoutes(newExpanded);
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="real-time">Real-time Tracking</TabsTrigger>
          <TabsTrigger value="route-history">Route History</TabsTrigger>
        </TabsList>

        <TabsContent value="real-time" className="space-y-4">
          {selectedSession ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSession(null)}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Live Tracking
                  </Button>
                  <h3 className="text-lg font-semibold">Real-time Route Tracking</h3>
                </div>
              </div>
              <ComprehensiveGpsMap 
                sessionId={selectedSession} 
                isRealTime={true}
                driverName={activeDrivers.find(d => d.sessionId === selectedSession)?.driver ? 
                  `${activeDrivers.find(d => d.sessionId === selectedSession)?.driver.firstName} ${activeDrivers.find(d => d.sessionId === selectedSession)?.driver.lastName}` : 
                  undefined
                }
                routeName={activeDrivers.find(d => d.sessionId === selectedSession)?.session?.route?.name}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Drivers Section */}
              {activeDrivers.length > 0 ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-800">Active Drivers</h3>
                  <div className="grid gap-4">
                    {activeDrivers.map((location) => (
                      <Card key={location.id} className="bg-white border-green-200 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedSession(location.sessionId)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Activity className="h-5 w-5 text-green-600 animate-pulse" />
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-800">
                                  {location.driver ? `${location.driver.firstName} ${location.driver.lastName}` : `Driver ${location.driverId}`}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {location.session?.route?.name || 'Active Route'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-green-100 text-green-800">Live</Badge>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDistanceTime(location.timestamp || location.updatedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{parseFloat(location.latitude).toFixed(4)}, {parseFloat(location.longitude).toFixed(4)}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openMapsLocation(location.latitude, location.longitude, location.driver?.firstName + ' ' + location.driver?.lastName || 'Driver');
                              }}
                            >
                              View on Map
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <Card className="bg-gray-50">
                  <CardContent className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No active drivers currently tracking</p>
                      <p className="text-sm text-gray-500">Drivers will appear here when they start routes</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="route-history" className="space-y-4">
          {/* Show Route Map if a session is selected */}
          {selectedSession ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSession(null)}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to History
                  </Button>
                  <h3 className="text-lg font-semibold">Route Map View</h3>
                </div>
              </div>
              <ComprehensiveGpsMap 
                sessionId={selectedSession} 
                isRealTime={false}
                driverName={routeHistory.find(r => r.sessionId === selectedSession)?.driver ? 
                  `${routeHistory.find(r => r.sessionId === selectedSession)?.driver.firstName} ${routeHistory.find(r => r.sessionId === selectedSession)?.driver.lastName}` : 
                  undefined
                }
                routeName={routeHistory.find(r => r.sessionId === selectedSession)?.routeName}
              />
            </div>
          ) : (
            <>
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
                                  <span className="font-medium">{formatRouteDisplayName({ 
                                    name: route.routeName, 
                                    schools: new Array(route.schoolsVisited || 0) 
                                  })}</span>
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
                                  <p className="font-medium">{route.totalStudentsPickedUp}/{route.totalStudentsOnRoute || route.totalStudentsPickedUp}</p>
                                </div>
                              </div>
                              
                              {/* Student Pickup Details Dropdown */}
                              <StudentPickupDropdown 
                                sessionId={route.sessionId}
                                isExpanded={expandedRoutes.has(route.sessionId)}
                                onToggle={() => toggleRouteExpansion(route.sessionId)}
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </>
          )}
        </TabsContent>


      </Tabs>
    </div>
  );
}