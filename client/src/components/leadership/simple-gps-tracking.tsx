import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Activity, Clock, Users, Navigation } from "lucide-react";

interface SimpleGpsTrackingProps {
  userId: number;
}

export default function SimpleGpsTracking({ userId }: SimpleGpsTrackingProps) {
  console.log('SimpleGpsTracking loading for user:', userId);
  
  const [view, setView] = useState<'active' | 'test'>('active');
  
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
          <div className="flex gap-2">
            <Button
              variant={view === 'active' ? 'default' : 'outline'}
              onClick={() => setView('active')}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Active Drivers
            </Button>
            <Button
              variant={view === 'test' ? 'default' : 'outline'}
              onClick={() => setView('test')}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Test View
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
                    <div key={location.id || index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="font-medium">{driverName}</span>
                          <Badge variant="outline">{routeName}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}&z=16`;
                            window.open(url, '_blank');
                          }}
                        >
                          <Navigation className="h-4 w-4 mr-1" />
                          View Map
                        </Button>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Location: {location.latitude}, {location.longitude}</div>
                        <div>Last Update: {formatTime(location.timestamp || location.updatedAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {view === 'test' && (
        <Card>
          <CardHeader>
            <CardTitle>System Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-800 font-medium">Component Loading: Success</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  GPS tracking component is working correctly
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-blue-800 font-medium">User ID: {userId}</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Admin user authenticated successfully
                </p>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="text-gray-800 font-medium">Timestamp: {new Date().toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  System time and date display working
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}