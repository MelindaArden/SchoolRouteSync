import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Clock, Users, Target, Route, Zap, ExternalLink, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface RouteMapViewerProps {
  detailRouteData: any;
  onClose: () => void;
}

export default function RouteMapViewer({ detailRouteData, onClose }: RouteMapViewerProps) {
  const [showRealTime, setShowRealTime] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showSchools, setShowSchools] = useState(true);
  const [animateRoute, setAnimateRoute] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);

  // Get driver locations for real-time tracking
  const { data: driverLocations = [] } = useQuery({
    queryKey: ['/api/driver-locations'],
    refetchInterval: showRealTime ? 5000 : false,
  });

  // Get route schools for school markers
  const { data: routeSchools = [] } = useQuery({
    queryKey: [`/api/routes/${detailRouteData.routeId}/schools`],
    enabled: !!detailRouteData.routeId,
  });

  // Animation effect for route replay
  useEffect(() => {
    if (animateRoute && detailRouteData.routePath.length > 0) {
      const interval = setInterval(() => {
        setCurrentPointIndex(prev => {
          if (prev >= detailRouteData.routePath.length - 1) {
            setAnimateRoute(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [animateRoute, detailRouteData.routePath.length]);

  const formatTime = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatSpeed = (speed: string | number) => {
    if (!speed) return 'N/A';
    return `${Number(speed).toFixed(1)} mph`;
  };

  // Get center point for map
  const getMapCenter = () => {
    if (detailRouteData.routePath.length > 0) {
      const lastPoint = detailRouteData.routePath[detailRouteData.routePath.length - 1];
      return [lastPoint.latitude, lastPoint.longitude];
    }
    return [33.9519, -84.1776];
  };

  // Current driver location for real-time tracking
  const currentDriverLocation = driverLocations.find(
    (loc: any) => loc.sessionId === detailRouteData.sessionId
  );

  // Route path for display
  const routePath = detailRouteData.routePath || [];
  const animatedPath = animateRoute ? routePath.slice(0, currentPointIndex + 1) : routePath;

  // Generate Google Maps URL for external viewing
  const generateMapUrl = () => {
    const center = getMapCenter();
    const baseUrl = `https://www.google.com/maps/dir/`;
    
    // Add route points
    const waypoints = routePath.map((point: any) => `${point.latitude},${point.longitude}`).join('/');
    
    return `${baseUrl}${waypoints}`;
  };

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Route Map: {detailRouteData.routeName}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={detailRouteData.status === 'in_progress' ? 'default' : 'secondary'}>
                {detailRouteData.status === 'in_progress' ? 'Live Tracking' : 'Historical Route'}
              </Badge>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close Map
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="real-time"
                checked={showRealTime}
                onCheckedChange={setShowRealTime}
              />
              <Label htmlFor="real-time" className="text-sm">Real-time GPS</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-route"
                checked={showRoute}
                onCheckedChange={setShowRoute}
              />
              <Label htmlFor="show-route" className="text-sm">Route Path</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-schools"
                checked={showSchools}
                onCheckedChange={setShowSchools}
              />
              <Label htmlFor="show-schools" className="text-sm">School Markers</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={animateRoute ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAnimateRoute(!animateRoute);
                  setCurrentPointIndex(0);
                }}
                disabled={routePath.length === 0}
              >
                <Zap className="w-4 h-4 mr-1" />
                {animateRoute ? 'Stop' : 'Animate'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              GPS Route Visualization
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(generateMapUrl(), '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View in Google Maps
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-blue-500" />
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Interactive Route Map</h3>
              <p className="text-gray-600 mb-6">
                View the complete GPS route with real-time tracking and school locations
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-lg p-3">
                  <Activity className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-gray-700">GPS Points</p>
                  <p className="text-lg font-bold text-gray-900">{routePath.length}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <Target className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-gray-700">School Stops</p>
                  <p className="text-lg font-bold text-gray-900">{detailRouteData.schoolStops.length}</p>
                </div>
              </div>

              <Button
                onClick={() => window.open(generateMapUrl(), '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Interactive Map
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Driver Status */}
      {showRealTime && currentDriverLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Live Driver Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Driver</p>
                <p className="font-bold text-green-900">{detailRouteData.driverName}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Last Update</p>
                <p className="font-bold text-blue-900">{formatTime(currentDriverLocation.timestamp)}</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600">Latitude</p>
                <p className="font-bold text-purple-900 font-mono text-sm">
                  {parseFloat(currentDriverLocation.latitude).toFixed(6)}
                </p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-600">Longitude</p>
                <p className="font-bold text-orange-900 font-mono text-sm">
                  {parseFloat(currentDriverLocation.longitude).toFixed(6)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            GPS Route Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="gps-points" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gps-points">GPS Points</TabsTrigger>
              <TabsTrigger value="school-stops">School Stops</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gps-points" className="space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {animatedPath.map((point: any, index: number) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      animateRoute && index === currentPointIndex
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{formatTime(point.timestamp)}</p>
                        <p className="text-sm text-gray-600 font-mono">
                          {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatSpeed(point.speed)}</p>
                      {point.bearing && (
                        <p className="text-xs text-gray-500">{Number(point.bearing).toFixed(1)}°</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="school-stops" className="space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {detailRouteData.schoolStops.map((stop: any, index: number) => (
                  <div key={stop.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{stop.schoolName}</p>
                        <p className="text-sm text-gray-600">
                          Arrived: {formatTime(stop.arrivalTime)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {stop.studentsPickedUp}/{stop.totalStudents} students
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {parseFloat(stop.latitude).toFixed(4)}, {parseFloat(stop.longitude).toFixed(4)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {animateRoute && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-600">
                  Route Animation Progress
                </span>
                <span className="text-sm text-yellow-600">
                  {currentPointIndex + 1} / {routePath.length}
                </span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentPointIndex + 1) / routePath.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Route Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Route className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-sm text-blue-600">GPS Points</p>
              <p className="text-xl font-bold text-blue-900">{routePath.length}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Users className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-sm text-green-600">Schools</p>
              <p className="text-xl font-bold text-green-900">{detailRouteData.schoolStops.length}</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600 mx-auto mb-1" />
              <p className="text-sm text-orange-600">Duration</p>
              <p className="text-xl font-bold text-orange-900">
                {detailRouteData.durationMinutes ? `${detailRouteData.durationMinutes}m` : 'Active'}
              </p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Target className="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <p className="text-sm text-purple-600">Status</p>
              <p className="text-xl font-bold text-purple-900 capitalize">{detailRouteData.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}