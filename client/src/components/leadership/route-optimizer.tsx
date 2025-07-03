import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Route, 
  MapPin, 
  Clock, 
  Zap, 
  ArrowRight, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Target,
  TrendingUp
} from "lucide-react";

interface RouteOptimizerProps {
  routeId?: number;
  onSave?: () => void;
}

export default function RouteOptimizer({ routeId, onSave }: RouteOptimizerProps) {
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data for optimization
  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
  }) as { data: any[], isLoading: boolean };

  const { data: drivers = [] } = useQuery({
    queryKey: ['/api/users'],
  }) as { data: any[], isLoading: boolean };

  const { data: existingRoute } = useQuery({
    queryKey: ['/api/routes', routeId],
    enabled: !!routeId,
  });

  // Load existing route data if editing
  useEffect(() => {
    if (existingRoute && (existingRoute as any).schools) {
      const schoolIds = (existingRoute as any).schools.map((s: any) => s.schoolId);
      setSelectedSchools(schoolIds);
      setSelectedDriver((existingRoute as any).driverId);
    }
  }, [existingRoute]);

  // Save optimized route mutation
  const saveRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      if (routeId) {
        // Update existing route
        await apiRequest('PUT', `/api/routes/${routeId}`, data.route);
        
        // Update route schools
        await apiRequest('DELETE', `/api/routes/${routeId}/schools`);
        for (const school of data.schools) {
          await apiRequest('POST', `/api/routes/${routeId}/schools`, school);
        }
      } else {
        // Create new route
        const newRoute: any = await apiRequest('POST', '/api/routes', data.route);
        for (const school of data.schools) {
          await apiRequest('POST', `/api/routes/${newRoute.id}/schools`, {
            ...school,
            routeId: newRoute.id
          });
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Route saved", description: "Optimized route has been saved successfully." });
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      if (onSave) onSave();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save route.", variant: "destructive" });
    }
  });

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Optimize route using Traveling Salesman Problem approximation
  const optimizeRoute = () => {
    if (selectedSchools.length < 2) {
      toast({ title: "Error", description: "Please select at least 2 schools to optimize.", variant: "destructive" });
      return;
    }

    setIsOptimizing(true);

    // Get selected school data with coordinates
    const schoolsToOptimize = selectedSchools.map(id => {
      const school = schools.find(s => s.id === id);
      return {
        ...school,
        lat: parseFloat(school.latitude || '0'),
        lng: parseFloat(school.longitude || '0'),
        dismissalTime: school.dismissalTime || '15:30'
      };
    }).filter(s => s.lat && s.lng);

    if (schoolsToOptimize.length < 2) {
      toast({ title: "Error", description: "Selected schools must have valid coordinates.", variant: "destructive" });
      setIsOptimizing(false);
      return;
    }

    // Sort schools by dismissal time first, then optimize within time windows
    const sortedByTime = schoolsToOptimize.sort((a, b) => 
      a.dismissalTime.localeCompare(b.dismissalTime)
    );

    // Apply nearest neighbor algorithm for route optimization
    const optimizedOrder = nearestNeighborTSP(sortedByTime);
    
    // Calculate route metrics
    const metrics = calculateRouteMetrics(optimizedOrder);

    // Generate estimated arrival times based on dismissal times and travel time
    const routeWithTimes = generateArrivalTimes(optimizedOrder);

    setOptimizationResults({
      schools: routeWithTimes,
      metrics,
      totalDistance: metrics.totalDistance,
      totalTime: metrics.totalTime,
      efficiency: metrics.efficiency
    });

    setIsOptimizing(false);

    toast({ 
      title: "Route optimized", 
      description: `Generated route covering ${optimizedOrder.length} schools with ${metrics.totalDistance.toFixed(1)} miles total distance.` 
    });
  };

  // Nearest Neighbor TSP approximation
  const nearestNeighborTSP = (schools: any[]): any[] => {
    if (schools.length <= 1) return schools;

    const unvisited = [...schools];
    const route = [unvisited.shift()!]; // Start with first school

    while (unvisited.length > 0) {
      const current = route[route.length - 1];
      let nearest = unvisited[0];
      let minDistance = calculateDistance(current.lat, current.lng, nearest.lat, nearest.lng);

      for (let i = 1; i < unvisited.length; i++) {
        const distance = calculateDistance(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = unvisited[i];
        }
      }

      route.push(nearest);
      unvisited.splice(unvisited.indexOf(nearest), 1);
    }

    return route;
  };

  // Calculate route metrics
  const calculateRouteMetrics = (schools: any[]) => {
    if (schools.length < 2) return { totalDistance: 0, totalTime: 0, efficiency: 100 };

    let totalDistance = 0;
    for (let i = 1; i < schools.length; i++) {
      const prev = schools[i - 1];
      const curr = schools[i];
      totalDistance += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    }

    const totalTime = Math.round((totalDistance / 25) * 60); // Assuming 25 mph average
    const efficiency = Math.max(0, 100 - (totalDistance * 2)); // Simple efficiency metric

    return { totalDistance, totalTime, efficiency };
  };

  // Generate estimated arrival times
  const generateArrivalTimes = (schools: any[]) => {
    if (schools.length === 0) return [];

    const result = [];
    let currentTime = new Date();
    currentTime.setHours(14, 30, 0, 0); // Start at 2:30 PM

    for (let i = 0; i < schools.length; i++) {
      const school = schools[i];
      
      // Calculate travel time from previous school
      if (i > 0) {
        const prev = schools[i - 1];
        const distance = calculateDistance(prev.lat, prev.lng, school.lat, school.lng);
        const travelTime = Math.round((distance / 25) * 60); // minutes
        currentTime = new Date(currentTime.getTime() + travelTime * 60000);
      }

      // Ensure we don't arrive too early (at least 10 minutes before dismissal)
      const dismissalTime = new Date();
      const [hours, minutes] = school.dismissalTime.split(':');
      dismissalTime.setHours(parseInt(hours), parseInt(minutes) - 10, 0, 0);

      if (currentTime < dismissalTime) {
        currentTime = dismissalTime;
      }

      result.push({
        ...school,
        orderIndex: i + 1,
        estimatedArrivalTime: currentTime.toTimeString().slice(0, 5),
        alertThresholdMinutes: 10
      });

      // Add 5-10 minutes for pickup time at each school
      currentTime = new Date(currentTime.getTime() + 7 * 60000);
    }

    return result;
  };

  // Save the optimized route
  const handleSave = () => {
    if (!optimizationResults || !selectedDriver) {
      toast({ title: "Error", description: "Please optimize route and select a driver first.", variant: "destructive" });
      return;
    }

    const routeName = routeId 
      ? (existingRoute as any)?.name 
      : `Route ${optimizationResults.schools.map((s: any) => s.name.charAt(0)).join('')}`;

    const routeData = {
      route: {
        name: routeName,
        driverId: selectedDriver,
        status: 'active'
      },
      schools: optimizationResults.schools.map((school: any) => ({
        schoolId: school.id,
        orderIndex: school.orderIndex,
        estimatedArrivalTime: school.estimatedArrivalTime,
        alertThresholdMinutes: school.alertThresholdMinutes
      }))
    };

    saveRouteMutation.mutate(routeData);
  };

  const driverOptions = drivers.filter((d: any) => d.role === 'driver');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Route Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* School Selection */}
          <div>
            <Label className="text-sm font-medium">Select Schools for Route</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {schools.map((school: any) => (
                <div key={school.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`school-${school.id}`}
                    checked={selectedSchools.includes(school.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSchools([...selectedSchools, school.id]);
                      } else {
                        setSelectedSchools(selectedSchools.filter(id => id !== school.id));
                      }
                    }}
                    className="rounded"
                  />
                  <label htmlFor={`school-${school.id}`} className="text-sm">
                    {school.name}
                    <span className="text-xs text-gray-500 block">
                      Dismissal: {school.dismissalTime || 'Not set'}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Driver Selection */}
          <div>
            <Label className="text-sm font-medium">Assign Driver</Label>
            <Select value={selectedDriver?.toString() || ""} onValueChange={(value) => setSelectedDriver(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                {driverOptions.map((driver: any) => (
                  <SelectItem key={driver.id} value={driver.id.toString()}>
                    {driver.firstName} {driver.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optimization Button */}
          <Button 
            onClick={optimizeRoute} 
            disabled={selectedSchools.length < 2 || isOptimizing}
            className="w-full"
          >
            {isOptimizing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
          </Button>
        </CardContent>
      </Card>

      {/* Optimization Results */}
      {optimizationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Optimization Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {optimizationResults.totalDistance.toFixed(1)}
                </div>
                <div className="text-sm text-blue-700">Miles</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {optimizationResults.totalTime}
                </div>
                <div className="text-sm text-green-700">Minutes</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">
                  {optimizationResults.efficiency.toFixed(0)}%
                </div>
                <div className="text-sm text-purple-700">Efficiency</div>
              </div>
            </div>

            {/* Optimized Route Order */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Route className="h-4 w-4" />
                Optimized Pickup Order
              </h4>
              <div className="space-y-2">
                {optimizationResults.schools.map((school: any, index: number) => (
                  <div key={school.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h5 className="font-medium">{school.name}</h5>
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {school.address}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {school.estimatedArrivalTime}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Dismissal: {school.dismissalTime}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSave} 
              disabled={saveRouteMutation.isPending || !selectedDriver}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {saveRouteMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {routeId ? 'Update Route' : 'Save Optimized Route'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Optimization Tips */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Optimization Guidelines
          </h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Schools are ordered by dismissal times to prevent early arrivals</p>
            <p>• Route uses traveling salesman algorithm to minimize total distance</p>
            <p>• Estimated arrival times include 10-minute buffer before dismissal</p>
            <p>• System assumes 25 mph average speed for urban driving</p>
            <p>• Alert thresholds are set to 10 minutes before expected arrival</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}