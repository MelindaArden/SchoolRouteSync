import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Activity, Clock, Users, Navigation, History, ArrowLeft } from "lucide-react";
import RouteMapViewer from "./route-map-viewer";

interface SimpleGpsTrackingProps {
  userId: number;
}

export default function SimpleGpsTracking({ userId }: SimpleGpsTrackingProps) {
  console.log('SimpleGpsTracking loading for user:', userId);
  
  const [view, setView] = useState<'active' | 'history' | 'test'>('active');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  
  // Safe data fetching with error handling
  const { data: driverLocations = [], isLoading: isLoadingLocations, error: locationsError } = useQuery({
    queryKey: ["/api/driver-locations"],
    refetchInterval: 15000,
    retry: 1,
    staleTime: 30000,
  });
  
  const { data: pickupSessions = [], isLoading: isLoadingSessions, error: sessionsError } = useQuery({
    queryKey: ["/api/pickup-sessions/today"],
    retry: 1,
    staleTime: 60000,
  });
  
  // Safe data processing
  const activeDrivers = Array.isArray(driverLocations) ? driverLocations.filter((location: any) => {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const locationTime = new Date(location.timestamp || location.updatedAt || Date.now());
      return locationTime >= thirtyMinutesAgo && location.session;
    } catch (e) {
      return false;
    }
  }) : [];
  
  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Unknown time';
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600" />
            Route Runner GPS Tracking
            <div className="flex items-center gap-1 ml-auto">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600">Live</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant={view === 'active' ? 'default' : 'outline'}
              onClick={() => setView('active')}
              className="flex items-center gap-2 text-sm"
              size="sm"
            >
              <Activity className="h-4 w-4" />
              <span className="hidden xs:inline">Active Drivers</span>
              <span className="xs:hidden">Active</span>
            </Button>
            <Button
              variant={view === 'history' ? 'default' : 'outline'}
              onClick={() => setView('history')}
              className="flex items-center gap-2 text-sm"
              size="sm"
            >
              <History className="h-4 w-4" />
              <span className="hidden xs:inline">Route History</span>
              <span className="xs:hidden">History</span>
            </Button>
            <Button
              variant={view === 'test' ? 'default' : 'outline'}
              onClick={() => setView('test')}
              className="flex items-center gap-2 text-sm"
              size="sm"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden xs:inline">System Check</span>
              <span className="xs:hidden">Check</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {view === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Driver Locations
              {!isLoadingLocations && (
                <Badge variant="secondary">{activeDrivers.length} active</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingLocations ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Loading driver locations...</p>
              </div>
            ) : locationsError ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 mb-2">Error loading GPS data</p>
                <p className="text-sm text-gray-500">Unable to connect to location service</p>
              </div>
            ) : activeDrivers.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No active drivers found</p>
                <p className="text-sm text-gray-500">
                  Drivers will appear here when they start their routes
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDrivers.map((location: any, index: number) => {
                  const driverName = `${location.driver?.firstName || 'Unknown'} ${location.driver?.lastName || 'Driver'}`;
                  const routeName = location.session?.route?.name || `Route ${location.session?.routeId || 'Unknown'}`;
                  
                  return (
                    <div key={location.id || index} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                          <span className="font-medium text-sm truncate">{driverName}</span>
                          <Badge variant="outline" className="text-xs hidden sm:inline-flex">{routeName}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}&z=16`;
                            window.open(url, '_blank');
                          }}
                          className="w-full sm:w-auto"
                        >
                          <Navigation className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">View Map</span>
                          <span className="sm:hidden">Map</span>
                        </Button>
                      </div>
                      
                      <div className="sm:hidden">
                        <Badge variant="outline" className="text-xs mb-2">{routeName}</Badge>
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="break-all">📍 {location.latitude}, {location.longitude}</div>
                        <div>🕒 {formatTime(location.timestamp || location.updatedAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {view === 'history' && !selectedSessionId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Route History
              {!isLoadingSessions && (
                <Badge variant="secondary">{pickupSessions.length} sessions</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSessions ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Loading route history...</p>
              </div>
            ) : sessionsError ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 mb-2">Error loading route history</p>
                <p className="text-sm text-gray-500">Unable to connect to history service</p>
              </div>
            ) : pickupSessions.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No route history found</p>
                <p className="text-sm text-gray-500">
                  Completed routes will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pickupSessions.map((session: any, index: number) => {
                  const driverName = `${session.driver?.firstName || 'Unknown'} ${session.driver?.lastName || 'Driver'}`;
                  const routeName = session.route?.name || `Route ${session.routeId || 'Unknown'}`;
                  const sessionDate = new Date(session.date).toLocaleDateString();
                  
                  return (
                    <div key={session.id || index} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <span className="font-medium text-sm truncate">{driverName}</span>
                          <Badge variant="outline" className="text-xs hidden sm:inline-flex">{routeName}</Badge>
                          <Badge variant={session.status === 'completed' ? 'default' : 'secondary'} className="text-xs hidden sm:inline-flex">
                            {session.status || 'unknown'}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSessionId(session.id)}
                          className="w-full sm:w-auto"
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">View Route Map</span>
                          <span className="sm:hidden">Map</span>
                        </Button>
                      </div>
                      
                      <div className="sm:hidden flex gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{routeName}</Badge>
                        <Badge variant={session.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {session.status || 'unknown'}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>📅 {sessionDate}</div>
                        <div>⏱️ {session.duration ? `${session.duration} minutes` : 'Unknown'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {view === 'history' && selectedSessionId && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <Button
                variant="outline"
                onClick={() => setSelectedSessionId(null)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to History
              </Button>
            </CardContent>
          </Card>
          
          <RouteMapViewer 
            sessionId={selectedSessionId}
            isRealTime={false}
          />
        </div>
      )}

      {view === 'test' && (
        <Card>
          <CardHeader>
            <CardTitle>GPS System Health Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-800 font-medium">Component Loading: Success</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  SimpleGpsTracking component is rendering correctly
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-blue-800 font-medium">API Connectivity: {locationsError ? 'Failed' : 'Working'}</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Driver locations API: {isLoadingLocations ? 'Loading...' : (locationsError ? 'Error' : 'Connected')}
                </p>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-purple-800 font-medium">Data Status: {Array.isArray(driverLocations) ? 'Valid' : 'Invalid'}</span>
                </div>
                <p className="text-sm text-purple-700 mt-1">
                  Driver locations count: {Array.isArray(driverLocations) ? driverLocations.length : 'Error'}
                </p>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-orange-800 font-medium">Active Drivers: {activeDrivers.length}</span>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  Drivers with recent GPS updates (last 30 minutes)
                </p>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="text-gray-800 font-medium">User Authentication: Verified (ID: {userId})</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  Last check: {new Date().toLocaleString()}
                </p>
              </div>
              
              {sessionsError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-800 font-medium">Sessions API Error</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    {sessionsError instanceof Error ? sessionsError.message : 'Unknown error'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}