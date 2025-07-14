import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Clock, Route, Users, Navigation, Calendar, Timer, School } from 'lucide-react';
import { format } from 'date-fns';

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

  const { data: routeMaps = [], isLoading: loadingMaps } = useQuery({
    queryKey: ['/api/route-maps'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: routeStops = [], isLoading: loadingStops } = useQuery({
    queryKey: ['/api/route-stops', selectedRoute],
    enabled: !!selectedRoute,
  });

  const filteredMaps = routeMaps.filter((map: RouteMap) => {
    if (viewFilter === 'active') return map.completionStatus === 'in_progress';
    if (viewFilter === 'completed') return map.completionStatus === 'completed';
    return true;
  });

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
  };

  const formatDate = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM d, yyyy');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress': return 'Active';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Route Tracking Map</h1>
          <p className="text-gray-600">Comprehensive driver route tracking with timestamps and stops</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <Select value={viewFilter} onValueChange={(value: any) => setViewFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Routes</SelectItem>
              <SelectItem value="active">Active Routes</SelectItem>
              <SelectItem value="completed">Completed Routes</SelectItem>
            </SelectContent>
          </Select>
          
          <Badge variant="outline" className="px-3 py-1">
            <Timer className="w-4 h-4 mr-1" />
            {filteredMaps.length} Routes
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5" />
                Route History
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
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredMaps.map((route: RouteMap) => (
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
                        <div>
                          <p className="font-medium text-gray-900">{route.routeName}</p>
                          <p className="text-sm text-gray-600">{route.firstName} {route.lastName}</p>
                        </div>
                        <Badge className={`${getStatusColor(route.completionStatus)} text-white`}>
                          {getStatusText(route.completionStatus)}
                        </Badge>
                      </div>
                      
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
                          {route.pathPointsCount || 0} points
                        </div>
                        <div className="flex items-center gap-1">
                          <School className="w-3 h-3" />
                          {route.stopsCount || 0} stops
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-400">
                        {formatDate(route.startTime)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                            {route.totalDistanceMiles ? `${route.totalDistanceMiles.toFixed(1)} mi` : 'N/A'}
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
                                {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
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
                                  <td className="p-2 font-mono">{point.latitude.toFixed(6)}</td>
                                  <td className="p-2 font-mono">{point.longitude.toFixed(6)}</td>
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
    </div>
  );
}