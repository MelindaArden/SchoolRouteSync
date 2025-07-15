import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Clock, Route, Users, Navigation, Calendar, Timer, School, Activity, Target, X, Eye, Map } from 'lucide-react';
import RouteMapViewer from '@/components/maps/RouteMapViewer';
import { format, isToday, isYesterday, isThisWeek, differenceInDays } from 'date-fns';

interface RouteMap {
  id: number;
  sessionId: number;
  routeId: number;
  driverId: number;
  startTime: string;
  endTime?: string;
  totalDurationMinutes?: number;
  totalDistanceMiles?: number;
  routePath: Array<{ latitude: number; longitude: number; timestamp: string }>;
  schoolStops: Array<{ 
    schoolId: number; 
    schoolName: string; 
    arrivalTime: string; 
    studentsPickedUp: number; 
    totalStudents: number;
    latitude: number;
    longitude: number;
  }>;
  completionStatus: string;
  routeName: string;
  firstName: string;
  lastName: string;
  pathPointsCount: number;
  stopsCount: number;
  sessionDate: string;
  sessionStatus: string;
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: string;
}

interface RouteStop {
  id: number;
  sessionId: number;
  schoolId: number;
  arrivalTime: string;
  departureTime?: string;
  latitude: number;
  longitude: number;
  studentsPickedUp: number;
  totalStudents: number;
  notes?: string;
  schoolName: string;
  schoolAddress: string;
}

export default function AdminMap() {
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [detailRouteId, setDetailRouteId] = useState<number | null>(null);

  const { data: routeMapsRaw = [], isLoading: loadingMaps, error: mapsError } = useQuery({
    queryKey: ['/api/gps/route-history-simple'],
    refetchInterval: 15000, // Refresh every 15 seconds to reduce load
    retry: 1, // Reduce retries to prevent overwhelming
  });

  // Fetch active pickup sessions for real-time tracking
  const { data: activeSessions = [] } = useQuery({
    queryKey: ['/api/pickup-sessions/today'],
    refetchInterval: 5000, // Refresh every 5 seconds for active session updates
  });

  // Fetch driver locations for real-time positioning
  const { data: driverLocations = [] } = useQuery({
    queryKey: ['/api/driver-locations'],
    refetchInterval: 10000, // Refresh every 10 seconds for real-time location updates
  });

  // Transform snake_case API response to camelCase for frontend with proper null handling
  const routeMaps = routeMapsRaw.map((map: any) => ({
    id: map.id,
    sessionId: map.session_id,
    routeId: map.route_id,
    driverId: map.driver_id,
    startTime: map.start_time,
    endTime: map.end_time,
    totalDurationMinutes: map.total_duration_minutes,
    totalDistanceMiles: map.total_distance_miles,
    routePath: map.route_path || [],
    schoolStops: map.school_stops || [],
    completionStatus: map.completion_status || 'in_progress',
    routeName: map.route_name,
    firstName: map.first_name,
    lastName: map.last_name,
    pathPointsCount: map.path_points_count || 0,
    stopsCount: map.stops_count || 0,
    sessionDate: map.session_date || map.created_at,
    sessionStatus: map.session_status || 'in_progress',
    currentLatitude: map.current_latitude,
    currentLongitude: map.current_longitude,
    lastLocationUpdate: map.last_location_update,
  }));

  // Debug logging for mobile users
  console.log('Admin Map - Raw data:', routeMapsRaw);
  console.log('Admin Map - Loading:', loadingMaps);
  console.log('Admin Map - Error:', mapsError);
  console.log('Admin Map - Route maps length:', routeMaps?.length);
  console.log('Admin Map - Transformed data:', routeMaps.slice(0, 2));
  console.log('Admin Map - Active sessions:', activeSessions?.filter((s: any) => s.status === 'in_progress'));
  console.log('Admin Map - Driver locations:', driverLocations);
  
  // Handle errors early
  if (mapsError) {
    console.error('Route maps error:', mapsError);
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-red-500 mb-4">Error loading route data</div>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: routeStopsRaw = [], isLoading: loadingStops } = useQuery({
    queryKey: ['/api/route-stops', selectedRoute],
    enabled: !!selectedRoute,
  });

  // Fetch detailed route data for the modal
  const { data: detailRouteData, isLoading: loadingDetailRoute, error: detailRouteError } = useQuery({
    queryKey: [`/api/route-details/${detailRouteId}`],
    enabled: !!detailRouteId,
  });

  // Log the detailed route data for debugging
  console.log('Detail route ID:', detailRouteId);
  console.log('Detail route data:', detailRouteData);
  console.log('Detail route loading:', loadingDetailRoute);
  console.log('Detail route error:', detailRouteError);

  // Transform snake_case API response to camelCase for route stops
  const routeStops = routeStopsRaw.map((stop: any) => ({
    id: stop.id,
    sessionId: stop.session_id,
    schoolId: stop.school_id,
    arrivalTime: stop.arrival_time,
    departureTime: stop.departure_time,
    latitude: stop.latitude,
    longitude: stop.longitude,
    studentsPickedUp: stop.students_picked_up,
    totalStudents: stop.total_students,
    notes: stop.notes,
    schoolName: stop.school_name,
    schoolAddress: stop.school_address,
  }));

  // Merge route maps with active sessions and driver locations for real-time tracking
  const mergedRouteData = [...routeMaps];
  
  // Add active sessions that don't have corresponding route maps yet
  const activeSessionsData = Array.isArray(activeSessions) ? activeSessions : [];
  const activeInProgress = activeSessionsData.filter((session: any) => session.status === 'in_progress');
  
  activeInProgress.forEach((session: any) => {
    const existingRoute = mergedRouteData.find(r => r.sessionId === session.id);
    if (!existingRoute) {
      // Add current active session as a route map entry
      const driverLocation = Array.isArray(driverLocations) ? driverLocations.find((loc: any) => loc.driverId === session.driverId) : null;
      
      mergedRouteData.push({
        id: session.id + 1000, // Temporary ID for active session
        sessionId: session.id,
        routeId: session.routeId,
        driverId: session.driverId,
        startTime: session.startTime || new Date().toISOString(),
        endTime: undefined,
        totalDurationMinutes: undefined,
        totalDistanceMiles: undefined,
        routePath: driverLocation ? [{
          latitude: parseFloat(driverLocation.latitude || 0),
          longitude: parseFloat(driverLocation.longitude || 0),
          timestamp: driverLocation.timestamp || new Date().toISOString()
        }] : [],
        schoolStops: [],
        completionStatus: 'in_progress',
        routeName: session.route?.name || `Route ${session.routeId}`,
        firstName: session.driver?.firstName || 'Unknown',
        lastName: session.driver?.lastName || 'Driver',
        pathPointsCount: driverLocation ? 1 : 0,
        stopsCount: 0,
        sessionDate: session.date || new Date().toISOString().split('T')[0],
        sessionStatus: 'in_progress',
        currentLatitude: driverLocation ? parseFloat(driverLocation.latitude || 0) : undefined,
        currentLongitude: driverLocation ? parseFloat(driverLocation.longitude || 0) : undefined,
        lastLocationUpdate: driverLocation?.timestamp,
      });
    } else {
      // Update existing route with current driver location
      const driverLocation = Array.isArray(driverLocations) ? driverLocations.find((loc: any) => loc.driverId === session.driverId) : null;
      if (driverLocation) {
        existingRoute.currentLatitude = parseFloat(driverLocation.latitude || 0);
        existingRoute.currentLongitude = parseFloat(driverLocation.longitude || 0);
        existingRoute.lastLocationUpdate = driverLocation.timestamp;
        existingRoute.sessionStatus = 'in_progress';
      }
    }
  });

  // Enhanced filtering with detailed logging for debugging
  const filteredMaps = mergedRouteData.filter((map: RouteMap) => {
    const isActive = map.sessionStatus === 'in_progress' || map.completionStatus === 'in_progress';
    const isCompleted = map.sessionStatus === 'completed' || map.completionStatus === 'completed';
    
    if (viewFilter === 'active') {
      console.log(`Route ${map.id}: sessionStatus=${map.sessionStatus}, completionStatus=${map.completionStatus}, isActive=${isActive}`);
      return isActive;
    }
    if (viewFilter === 'completed') return isCompleted;
    return true;
  });

  console.log('Admin Map - Merged route data:', mergedRouteData.length);
  console.log('Admin Map - Filtered maps:', filteredMaps.length);
  console.log('Admin Map - Active in progress sessions:', activeInProgress.length);
  console.log('Admin Map - Current view filter:', viewFilter);
  console.log('Admin Map - Full merged data:', mergedRouteData.map(r => ({
    id: r.id,
    sessionId: r.sessionId,
    sessionStatus: r.sessionStatus,
    completionStatus: r.completionStatus,
    driverName: `${r.firstName} ${r.lastName}`,
    hasGPS: !!(r.currentLatitude && r.currentLongitude)
  })));

  // Group maps by date for historical organization
  const groupedMaps = filteredMaps.reduce((groups: any, map: RouteMap) => {
    try {
      const date = new Date(map.sessionDate || map.startTime);
      let groupKey = '';
      
      if (isToday(date)) {
        groupKey = 'Today';
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday';
      } else if (isThisWeek(date)) {
        groupKey = 'This Week';
      } else {
        const daysAgo = differenceInDays(new Date(), date);
        if (daysAgo <= 7) {
          groupKey = 'This Week';
        } else if (daysAgo <= 30) {
          groupKey = `${Math.ceil(daysAgo / 7)} weeks ago`;
        } else {
          groupKey = 'Older';
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(map);
    } catch (error) {
      console.error('Error processing route map date:', error, map);
      // Put in "Older" category as fallback
      if (!groups['Older']) {
        groups['Older'] = [];
      }
      groups['Older'].push(map);
    }
    return groups;
  }, {});

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error, timestamp);
      return 'Invalid time';
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error, timestamp);
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };



  const openRouteDetails = (sessionId: number) => {
    setDetailRouteId(sessionId);
    setShowRouteDetails(true);
  };

  const closeRouteDetails = () => {
    setShowRouteDetails(false);
    setDetailRouteId(null);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  // Add error handling for the entire component
  if (mapsError) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg mb-4">Error Loading Route Maps</div>
          <p className="text-gray-600 mb-4">There was an error loading the route tracking data.</p>
          <pre className="text-sm bg-gray-100 p-4 rounded text-left">{JSON.stringify(mapsError, null, 2)}</pre>
        </div>
      </div>
    );
  }

  // Mobile-friendly route summary if complex view fails
  if (routeMaps.length === 0 && !loadingMaps) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Route Maps & Real-time Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No route data available.</p>
              <p className="text-sm text-gray-500 mb-4">
                Routes will appear here once drivers begin pickup sessions.
              </p>
              <div className="text-xs text-gray-400 mt-4 p-2 bg-gray-50 rounded">
                Debug: Raw data count: {routeMapsRaw.length}
              </div>
              <Button 
                className="mt-4" 
                onClick={() => window.location.reload()}
              >
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Route Maps</h1>
          <p className="text-gray-600">Real-time driver tracking and route history</p>
          <div className="text-xs text-gray-400 mt-1">
            Showing {routeMaps.length} routes | Updates every 10 seconds
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
          <Select value={viewFilter} onValueChange={(value: any) => setViewFilter(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Routes</SelectItem>
              <SelectItem value="active">Active Routes</SelectItem>
              <SelectItem value="completed">Completed Routes</SelectItem>
            </SelectContent>
          </Select>
          
          <Badge variant="outline" className="px-3 py-1 w-fit">
            <Timer className="w-4 h-4 mr-1" />
            {filteredMaps.length} Routes
          </Badge>
        </div>
      </div>

      {/* Real-time Active Drivers Section */}
      {activeInProgress.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-green-600" />
              <span className="text-green-700">Live Active Drivers ({activeInProgress.length})</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeInProgress.map((session: any) => {
                const driverLocation = Array.isArray(driverLocations) ? driverLocations.find((loc: any) => loc.driverId === session.driverId) : null;
                return (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <div className="font-medium text-green-800">
                          {session.driver?.firstName || 'Unknown'} {session.driver?.lastName || 'Driver'}
                        </div>
                        <div className="text-sm text-green-600">
                          Route: {session.route?.name || `Route ${session.routeId}`}
                        </div>
                        {driverLocation && (
                          <div className="text-xs text-green-500">
                            Live GPS: {parseFloat(driverLocation.latitude || 0).toFixed(4)}, {parseFloat(driverLocation.longitude || 0).toFixed(4)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        Active Now
                      </Badge>
                      {driverLocation?.timestamp && (
                        <div className="text-xs text-green-500 mt-1">
                          Updated: {formatTime(driverLocation.timestamp)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile-First Route Display */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5" />
              Available Routes ({filteredMaps.length})
              <Badge variant="outline" className="ml-2">
                <Activity className="w-3 h-3 mr-1" />
                Real-time Data
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMaps ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading route data...</p>
              </div>
            ) : filteredMaps.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No routes found</p>
                <p className="text-sm text-gray-400">Routes will appear here when drivers start pickup sessions</p>
                <div className="text-xs text-gray-400 mt-4 p-2 bg-gray-50 rounded">
                  Debug: Raw data count: {routeMapsRaw.length}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMaps.map((route: RouteMap) => (
                  <div
                    key={route.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedRoute === route.sessionId
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedRoute(route.sessionId)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">{route.firstName} {route.lastName}</span>
                        {(route.sessionStatus === 'in_progress' || route.completionStatus === 'in_progress') && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                            Live Active
                          </Badge>
                        )}
                        {route.currentLatitude && route.currentLongitude && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 text-xs ml-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            GPS Live
                          </Badge>
                        )}
                      </div>
                      <Badge 
                        variant={route.sessionStatus === 'completed' ? 'default' : 'secondary'}
                        className={getStatusColor(route.sessionStatus)}
                      >
                        {getStatusText(route.sessionStatus)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{route.routeName}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Started: {formatTime(route.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4" />
                        <span>Duration: {formatDuration(route.totalDurationMinutes)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{route.pathPointsCount} GPS points</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <School className="w-4 h-4" />
                        <span>{route.stopsCount} school stops</span>
                      </div>
                    </div>
                    
                    {/* Real-time location indicator */}
                    {route.currentLatitude && route.currentLongitude && (
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">Live GPS Location</span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>Lat: {parseFloat(route.currentLatitude || 0).toFixed(6)}</div>
                          <div>Lng: {parseFloat(route.currentLongitude || 0).toFixed(6)}</div>
                          {route.lastLocationUpdate && (
                            <div className="text-gray-500">
                              Updated: {formatTime(route.lastLocationUpdate)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-blue-600">
                        {selectedRoute === route.sessionId ? 'Tap to collapse details' : 'Tap to view detailed tracking info'}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRouteDetails(route.sessionId);
                        }}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        <Map className="w-3 h-3 mr-1" />
                        View Route Map
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        {/* Route List */}
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5" />
                Route History
                <Badge variant="outline" className="ml-2">
                  <Activity className="w-3 h-3 mr-1" />
                  30-Day View
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredMaps.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No routes found</p>
                  <p className="text-sm text-gray-400">Routes will appear here when drivers start pickup sessions</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedMaps).map(([groupKey, routes]) => (
                    <div key={groupKey} className="space-y-2">
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {groupKey} ({(routes as RouteMap[]).length})
                      </h3>
                      <div className="space-y-2">
                        {(routes as RouteMap[]).map((route: RouteMap) => (
                          <div
                            key={route.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedRoute === route.sessionId
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedRoute(route.sessionId)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-600" />
                                <span className="font-medium text-sm">{route.firstName} {route.lastName}</span>
                                {route.currentLatitude && route.currentLongitude && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                                    Live
                                  </Badge>
                                )}
                              </div>
                              <Badge 
                                variant={route.sessionStatus === 'completed' ? 'default' : 'secondary'}
                                className={getStatusColor(route.sessionStatus)}
                              >
                                {getStatusText(route.sessionStatus)}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{route.routeName}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(route.startTime)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {formatDuration(route.totalDurationMinutes)}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {route.pathPointsCount} pts
                              </div>
                              <div className="flex items-center gap-1">
                                <School className="w-3 h-3" />
                                {route.stopsCount} stops
                              </div>
                            </div>
                            
                            {/* Real-time location indicator */}
                            {route.currentLatitude && route.currentLongitude && (
                              <div className="mt-2 p-2 bg-green-50 rounded-md">
                                <div className="flex items-center gap-2">
                                  <Target className="w-3 h-3 text-green-600" />
                                  <span className="text-xs text-green-700">
                                    Live: {typeof route.currentLatitude === 'number' ? route.currentLatitude.toFixed(4) : Number(route.currentLatitude || 0).toFixed(4)}, {typeof route.currentLongitude === 'number' ? route.currentLongitude.toFixed(4) : Number(route.currentLongitude || 0).toFixed(4)}
                                  </span>
                                </div>
                                {route.lastLocationUpdate && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Updated: {formatTime(route.lastLocationUpdate)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Real-time Active Drivers Summary */}
        <div className="col-span-1 lg:col-span-2">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                Real-time Driver Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const activeDrivers = filteredMaps.filter(route => 
                  route.sessionStatus === 'in_progress' && route.currentLatitude && route.currentLongitude
                );
                
                if (activeDrivers.length === 0) {
                  return (
                    <div className="text-center py-4">
                      <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No active drivers with live location</p>
                    </div>
                  );
                }
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeDrivers.map((driver) => (
                      <div key={driver.id} className="p-3 border rounded-lg bg-green-50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="font-medium">{driver.firstName} {driver.lastName}</span>
                          <Badge variant="outline" className="text-xs">Live</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{driver.routeName}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>Lat: {typeof driver.currentLatitude === 'number' ? driver.currentLatitude.toFixed(4) : Number(driver.currentLatitude || 0).toFixed(4)}</div>
                          <div>Lng: {typeof driver.currentLongitude === 'number' ? driver.currentLongitude.toFixed(4) : Number(driver.currentLongitude || 0).toFixed(4)}</div>
                        </div>
                        {driver.lastLocationUpdate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Updated: {formatTime(driver.lastLocationUpdate)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Route Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedRoute ? (
            <>
              {/* Route Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="w-5 h-5" />
                    Route Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const route = filteredMaps.find((r: RouteMap) => r.sessionId === selectedRoute);
                    if (!route) return <p>Route not found</p>;
                    
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-blue-600">Start Time</p>
                          <p className="text-lg font-bold text-blue-900">{formatTime(route.startTime)}</p>
                        </div>
                        
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-green-600">Duration</p>
                          <p className="text-lg font-bold text-green-900">{formatDuration(route.totalDurationMinutes)}</p>
                        </div>
                        
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-purple-600">Distance</p>
                          <p className="text-lg font-bold text-purple-900">
                            {route.totalDistanceMiles ? `${Number(route.totalDistanceMiles).toFixed(1)} mi` : 'N/A'}
                          </p>
                        </div>
                        
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-orange-600">Status</p>
                          <p className="text-lg font-bold text-orange-900">{getStatusText(route.completionStatus)}</p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* School Stops */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <School className="w-5 h-5" />
                    School Stops Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStops ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading stop details...</p>
                    </div>
                  ) : routeStops.length === 0 ? (
                    <div className="text-center py-8">
                      <School className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No stops recorded</p>
                      <p className="text-sm text-gray-400">Stop data will appear when drivers visit schools</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {routeStops.map((stop: RouteStop, index: number) => (
                        <div key={stop.id} className="border-l-4 border-blue-500 pl-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{stop.schoolName}</h4>
                              <p className="text-sm text-gray-600">{stop.schoolAddress}</p>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              Stop {index + 1}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500">Arrival Time</p>
                              <p className="text-sm text-gray-900">{formatTime(stop.arrivalTime)}</p>
                            </div>
                            
                            <div>
                              <p className="text-xs font-medium text-gray-500">Students Picked Up</p>
                              <p className="text-sm text-gray-900">{stop.studentsPickedUp} / {stop.totalStudents}</p>
                            </div>
                            
                            <div>
                              <p className="text-xs font-medium text-gray-500">Coordinates</p>
                              <p className="text-sm text-gray-900 font-mono">
                                {stop.latitude ? Number(stop.latitude).toFixed(4) : 'N/A'}, {stop.longitude ? Number(stop.longitude).toFixed(4) : 'N/A'}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-xs font-medium text-gray-500">Duration at Stop</p>
                              <p className="text-sm text-gray-900">
                                {stop.departureTime 
                                  ? formatDuration(Math.round((new Date(stop.departureTime).getTime() - new Date(stop.arrivalTime).getTime()) / 60000))
                                  : 'In progress'
                                }
                              </p>
                            </div>
                          </div>
                          
                          {stop.notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                              <strong>Notes:</strong> {stop.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Route Path Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Route Path Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const route = filteredMaps.find((r: RouteMap) => r.sessionId === selectedRoute);
                    if (!route || !route.routePath || route.routePath.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No GPS path data available</p>
                          <p className="text-sm text-gray-400">Path coordinates will appear when GPS tracking is active</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total GPS Points</p>
                            <p className="text-xl font-bold text-gray-900">{route.routePath.length}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">First Point</p>
                            <p className="text-sm text-gray-900">{formatTime(route.routePath[0].timestamp)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Last Point</p>
                            <p className="text-sm text-gray-900">
                              {formatTime(route.routePath[route.routePath.length - 1].timestamp)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                              <tr>
                                <th className="text-left p-2">Time</th>
                                <th className="text-left p-2">Latitude</th>
                                <th className="text-left p-2">Longitude</th>
                              </tr>
                            </thead>
                            <tbody>
                              {route.routePath.slice(0, 50).map((point, index) => (
                                <tr key={index} className="border-t">
                                  <td className="p-2">{formatTime(point.timestamp)}</td>
                                  <td className="p-2 font-mono">{point.latitude ? Number(point.latitude).toFixed(6) : 'N/A'}</td>
                                  <td className="p-2 font-mono">{point.longitude ? Number(point.longitude).toFixed(6) : 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {route.routePath.length > 50 && (
                            <p className="text-center text-gray-500 p-2">
                              ... and {route.routePath.length - 50} more points
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Route</h3>
                <p className="text-gray-600">Choose a route from the list to view detailed tracking information</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detailed Route View Modal */}
      <Dialog open={showRouteDetails} onOpenChange={closeRouteDetails}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Detailed Route Tracking
              <Button
                variant="ghost"
                size="sm"
                onClick={closeRouteDetails}
                className="ml-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {loadingDetailRoute ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading detailed route data...</p>
              </div>
            ) : detailRouteData ? (
              <RouteMapViewer
                detailRouteData={detailRouteData}
                onClose={closeRouteDetails}
              />
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No detailed route data available</p>
                <p className="text-sm text-gray-400">Unable to load route tracking information</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}