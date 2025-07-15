import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import RouteMapViewer from "@/components/leadership/route-map-viewer";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  RefreshCw, 
  Route as RouteIcon,
  History,
  Target,
  Activity,
  ArrowLeft,
  Search,
  Calendar
} from "lucide-react";

interface ActiveDriver {
  id: number;
  driverId: number;
  sessionId: number;
  latitude: string;
  longitude: string;
  timestamp: string;
  driver: {
    firstName: string;
    lastName: string;
  };
  route: {
    name: string;
  };
}

interface RouteSession {
  id: number;
  sessionId: number;
  routeId: number;
  driverId: number;
  status: string;
  date: string;
  route: {
    name: string;
  };
  driver: {
    firstName: string;
    lastName: string;
  };
}

interface AdminGpsTrackingProps {
  userId: number;
}

export default function AdminGpsTracking({ userId }: AdminGpsTrackingProps) {
  const [activeTab, setActiveTab] = useState("live");
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const { isConnected } = useWebSocket();

  // Get active driver locations for real-time tracking
  const { data: driverLocations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ["/api/driver-locations"],
    refetchInterval: isConnected ? 10000 : 30000,
    staleTime: 15000,
    retry: 1,
  });

  // Get recent pickup sessions for route history
  const { data: pickupSessions = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["/api/pickup-sessions/today"],
    staleTime: 30000,
    retry: 1,
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Filter active drivers (drivers with sessions and recent location updates)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const activeDrivers: ActiveDriver[] = driverLocations
    .filter((location: any) => {
      const locationTime = new Date(location.timestamp || location.updatedAt);
      return locationTime >= thirtyMinutesAgo && location.session && location.sessionId;
    })
    .map((location: any) => ({
      id: location.id,
      driverId: location.driverId,
      sessionId: location.sessionId,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp || location.updatedAt,
      driver: {
        firstName: location.driver?.firstName || 'Unknown',
        lastName: location.driver?.lastName || 'Driver'
      },
      route: {
        name: location.session?.route?.name || `Route ${location.session?.routeId || 'Unknown'}`
      }
    }));

  // Filter and prepare route sessions for history
  const filteredSessions = pickupSessions.filter((session: any) => {
    const matchesSearch = searchTerm === "" || 
      session.route?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${session.driver?.firstName} ${session.driver?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter === "" || session.date?.startsWith(dateFilter);
    
    return matchesSearch && matchesDate;
  });

  const openExternalMap = (lat: string, lng: string, label: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=16`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            Route Tracking System
            {isConnected && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-gray-600">
            View current driver locations and detailed route maps with actual stops (3+ minutes)
          </p>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Current Drivers
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Route Maps
          </TabsTrigger>
        </TabsList>

        {/* Live Tracking Tab */}
        <TabsContent value="live" className="space-y-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Active Drivers
                  <Badge variant="outline">{activeDrivers.length}</Badge>
                </div>
                <div className="text-sm text-gray-500">
                  Updates every 10 seconds
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLocations ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                  <p>Loading driver locations...</p>
                </div>
              ) : activeDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No active drivers currently tracking</p>
                  <p className="text-sm text-gray-500">Drivers will appear here when they start route sessions</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeDrivers.map((location) => (
                    <div key={location.id} className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-blue-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="font-medium">
                            {location.driver.firstName} {location.driver.lastName}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {location.route.name}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-gray-500" />
                          <span className="font-mono text-xs">
                            {parseFloat(location.latitude).toFixed(4)}, {parseFloat(location.longitude).toFixed(4)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span>{formatTime(location.timestamp)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => openExternalMap(location.latitude, location.longitude, location.driver.firstName)}
                        >
                          View Location
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => {
                            setSelectedSession(location.sessionId);
                            setActiveTab("history");
                          }}
                        >
                          View Route
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Route History Tab */}
        <TabsContent value="history" className="space-y-6">
          {selectedSession ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSession(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Route List
                </Button>
                <h3 className="text-lg font-semibold">
                  Route Session {selectedSession}
                </h3>
              </div>
              <RouteMapViewer 
                sessionId={selectedSession} 
                isRealTime={activeDrivers.some(d => d.sessionId === selectedSession)}
              />
            </div>
          ) : (
            <>
              {/* Search and Filter Controls */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-600" />
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
                      <Search className="h-4 w-4 text-gray-600" />
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

              {/* Route Sessions List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Route Sessions
                    <Badge variant="outline">{filteredSessions.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingHistory ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                      <p>Loading route history...</p>
                    </div>
                  ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-8">
                      <RouteIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No route sessions found</p>
                      <p className="text-sm text-gray-500">Try adjusting your search filters</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredSessions.map((session: any) => (
                        <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{session.route?.name || `Route ${session.routeId}`}</span>
                              <Badge variant="outline">
                                {session.driver?.firstName} {session.driver?.lastName}
                              </Badge>
                              <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                                {session.status}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSession(session.id)}
                              className="text-xs"
                            >
                              View Route Map
                            </Button>
                          </div>
                          
                          <div className="mt-2 text-sm text-gray-600">
                            Started: {formatTime(session.date)} • {formatDate(session.date)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}