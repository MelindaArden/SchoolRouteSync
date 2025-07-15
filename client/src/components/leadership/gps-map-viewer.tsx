import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRouteDisplayName } from "@/lib/route-utils";
import StudentPickupDropdown from "./student-pickup-dropdown";
import { 
  MapPin, 
  Activity, 
  Clock, 
  Navigation,
  RefreshCw,
  Car,
  School,
  Route as RouteIcon,
  Target,
  ChevronDown,
  ChevronUp,
  User
} from "lucide-react";

interface GpsMapViewerProps {
  selectedSessionId: number | null;
  onSelectSession: (sessionId: number | null) => void;
}

interface DriverLocation {
  id: number;
  driverId: number;
  sessionId: number | null;
  latitude: string;
  longitude: string;
  timestamp: string;
  driver: {
    id: number;
    firstName: string;
    lastName: string;
  };
  session: {
    id: number;
    routeId: number;
    status: string;
    route: {
      id: number;
      name: string;
    };
  } | null;
}

interface RouteHistory {
  id: number;
  sessionId: number;
  driverId: number;
  routeId: number;
  routeName: string;
  startTime: string;
  endTime: string | null;
  completionStatus: string;
  driver: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export default function GpsMapViewer({ selectedSessionId, onSelectSession }: GpsMapViewerProps) {
  const [expandedRoutes, setExpandedRoutes] = useState<Set<number>>(new Set());

  const toggleRouteExpansion = (sessionId: number) => {
    const newExpanded = new Set(expandedRoutes);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedRoutes(newExpanded);
  };
  // Fetch active driver locations
  const { data: driverLocations = [], refetch: refetchLocations } = useQuery<DriverLocation[]>({
    queryKey: ["/api/driver-locations"],
    refetchInterval: 10000, // Update every 10 seconds
  });

  // Fetch route history
  const { data: routeHistory = [], refetch: refetchHistory } = useQuery<RouteHistory[]>({
    queryKey: ["/api/gps/route-history"],
    refetchInterval: 30000, // Update every 30 seconds
  });



  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const activeDrivers = driverLocations.filter(loc => loc.session?.status === 'in_progress');
  const todayRoutes = routeHistory.filter(route => {
    const routeDate = new Date(route.startTime).toDateString();
    const today = new Date().toDateString();
    return routeDate === today;
  });

  return (
    <div className="space-y-6">
      {/* Map Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Live GPS Tracking Map
            </CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Car className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Active Drivers</span>
              </div>
              <div className="text-lg font-bold text-green-800">{activeDrivers.length}</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <RouteIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600">Today's Routes</span>
              </div>
              <div className="text-lg font-bold text-blue-800">{todayRoutes.length}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <School className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-600">Completed</span>
              </div>
              <div className="text-lg font-bold text-purple-800">
                {todayRoutes.filter(route => route.completionStatus === 'completed').length}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-600">In Progress</span>
              </div>
              <div className="text-lg font-bold text-orange-800">
                {todayRoutes.filter(route => route.completionStatus === 'in_progress').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPS Tracking Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Real-time Driver Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeDrivers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Car className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Active Drivers</h3>
              <p className="mb-4">No drivers are currently on active routes.</p>
              <Button
                variant="outline"
                onClick={async () => {
                  // Try to simulate GPS data for testing
                  try {
                    const response = await fetch('/api/gps/simulate/56', { method: 'POST' });
                    if (response.ok) {
                      setTimeout(() => {
                        refetchLocations();
                        refetchHistory();
                      }, 2000);
                    }
                  } catch (error) {
                    console.error('GPS simulation error:', error);
                  }
                }}
                className="flex items-center gap-2"
              >
                <Activity className="h-4 w-4" />
                Generate Test Data
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeDrivers.map(location => (
                <div
                  key={location.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedSessionId === location.sessionId 
                      ? 'bg-blue-50 border-blue-300 shadow-md' 
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => onSelectSession(location.sessionId)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                        <div>
                          <h4 className="font-semibold text-lg">{location.driver.firstName} {location.driver.lastName}</h4>
                          <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                            <RouteIcon className="h-3 w-3 mr-1" />
                            {formatRouteDisplayName({ 
                              ...location.session?.route, 
                              schools: [] // Will be updated when we get full route data
                            })}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSession(location.sessionId);
                        }}
                        className="text-xs"
                      >
                        <Target className="h-3 w-3 mr-1" />
                        View Route
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-600 font-medium mb-1">GPS Coordinates</p>
                      <p className="font-mono text-xs break-all">
                        {parseFloat(location.latitude).toFixed(6)}, {parseFloat(location.longitude).toFixed(6)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-600 font-medium mb-1">Last Update</p>
                      <p className="font-medium">{formatTime(location.timestamp)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-600 font-medium mb-1">Session Status</p>
                      <Badge variant="secondary" className="text-xs">
                        {location.session?.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Student Pickup Details Dropdown */}
                  {location.sessionId && (
                    <StudentPickupDropdown 
                      sessionId={location.sessionId}
                      isExpanded={expandedRoutes.has(location.sessionId)}
                      onToggle={() => toggleRouteExpansion(location.sessionId)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Drivers List */}
      {activeDrivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Drivers ({activeDrivers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeDrivers.map(location => (
                <div
                  key={location.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedSessionId === location.sessionId ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectSession(location.sessionId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <h4 className="font-medium">{location.driver.firstName} {location.driver.lastName}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <RouteIcon className="h-3 w-3" />
                          {location.session?.route.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        {location.session?.status}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        Updated: {formatTime(location.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">GPS Coordinates:</span>
                      <p className="font-mono text-xs">
                        {parseFloat(location.latitude).toFixed(6)}, {parseFloat(location.longitude).toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Session ID:</span>
                      <p className="font-mono text-xs">#{location.sessionId}</p>
                    </div>
                  </div>
                  
                  {/* Student Pickup Details Dropdown */}
                  {location.sessionId && (
                    <StudentPickupDropdown 
                      sessionId={location.sessionId}
                      isExpanded={expandedRoutes.has(location.sessionId)}
                      onToggle={() => toggleRouteExpansion(location.sessionId)}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Route History */}
      {todayRoutes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Route History ({todayRoutes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayRoutes.map(route => (
                <div
                  key={route.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedSessionId === route.sessionId ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectSession(route.sessionId)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{route.driver.firstName} {route.driver.lastName}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <RouteIcon className="h-3 w-3" />
                        {route.routeName}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={route.completionStatus === 'completed' ? 'default' : 'secondary'}>
                        {route.completionStatus}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(route.startTime)} - {route.endTime ? formatTime(route.endTime) : 'In Progress'}
                      </p>
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
      )}

      {/* No Active Drivers Message */}
      {activeDrivers.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center py-8 text-gray-500">
              <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Active Drivers</h3>
              <p>No drivers are currently on active routes. Use the "Simulate GPS" button to generate test data.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}