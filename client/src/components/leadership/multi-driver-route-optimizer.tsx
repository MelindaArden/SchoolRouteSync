import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  TrendingUp,
  Users,
  Car,
  Timer,
  Info
} from "lucide-react";

interface OptimizedRoute {
  id: string;
  driverId: number;
  driverName: string;
  schools: OptimizedSchool[];
  totalStudents: number;
  totalDistance: number;
  totalTime: number;
  warnings: string[];
  seatUtilization: number;
}

interface OptimizedSchool {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  dismissalTime: string;
  studentCount: number;
  orderIndex: number;
  estimatedArrivalTime: string;
  alertThresholdMinutes: number;
}

interface RouteConstraints {
  driverCount: number;
  vehicleCapacity: number;
  maxRouteTime: number; // minutes
  bufferTime: number; // minutes between schools
}

export default function MultiDriverRouteOptimizer() {
  const [constraints, setConstraints] = useState<RouteConstraints>({
    driverCount: 2,
    vehicleCapacity: 12,
    maxRouteTime: 120,
    bufferTime: 10
  });
  const [optimizedRoutes, setOptimizedRoutes] = useState<OptimizedRoute[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data for optimization
  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
  }) as { data: any[], isLoading: boolean };

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
  }) as { data: any[], isLoading: boolean };

  const { data: drivers = [] } = useQuery({
    queryKey: ['/api/users'],
  }) as { data: any[], isLoading: boolean };

  const availableDrivers = drivers.filter((d: any) => d.role === 'driver');

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

  // Get student count per school
  const getSchoolStudentCount = (schoolId: number): number => {
    return students.filter((s: any) => s.schoolId === schoolId).length;
  };

  // Prepare schools with student counts and coordinates
  const prepareSchoolsData = () => {
    return schools.map(school => ({
      id: school.id,
      name: school.name,
      address: school.address,
      latitude: parseFloat(school.latitude || '0'),
      longitude: parseFloat(school.longitude || '0'),
      dismissalTime: school.dismissalTime || '15:30',
      studentCount: getSchoolStudentCount(school.id)
    })).filter(s => s.latitude && s.longitude && s.studentCount > 0);
  };

  // Cluster schools using capacity constraints
  const clusterSchoolsByCapacity = (schoolsData: any[], constraints: RouteConstraints): any[][] => {
    const clusters: any[][] = [];
    const remainingSchools = [...schoolsData].sort((a, b) => b.studentCount - a.studentCount); // Start with highest capacity schools
    
    for (let i = 0; i < constraints.driverCount; i++) {
      clusters.push([]);
    }

    // Assign schools to clusters using best-fit decreasing algorithm
    for (const school of remainingSchools) {
      let bestClusterIndex = -1;
      let bestScore = -1;

      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        const currentCapacity = cluster.reduce((sum, s) => sum + s.studentCount, 0);
        
        if (currentCapacity + school.studentCount <= constraints.vehicleCapacity) {
          // Calculate score based on proximity and capacity utilization
          let score = constraints.vehicleCapacity - (currentCapacity + school.studentCount); // Prefer fuller clusters
          
          if (cluster.length > 0) {
            // Add proximity bonus
            const avgLat = cluster.reduce((sum, s) => sum + s.latitude, 0) / cluster.length;
            const avgLng = cluster.reduce((sum, s) => sum + s.longitude, 0) / cluster.length;
            const proximity = 1 / (1 + calculateDistance(school.latitude, school.longitude, avgLat, avgLng));
            score += proximity * 10;
          }

          if (score > bestScore) {
            bestScore = score;
            bestClusterIndex = i;
          }
        }
      }

      if (bestClusterIndex >= 0) {
        clusters[bestClusterIndex].push(school);
      } else {
        // School doesn't fit in any existing cluster - need more drivers or larger capacity
        clusters.push([school]);
      }
    }

    return clusters.filter(cluster => cluster.length > 0);
  };

  // Optimize route within a cluster using TSP
  const optimizeClusterRoute = (cluster: any[], constraints: RouteConstraints): OptimizedSchool[] => {
    if (cluster.length <= 1) return cluster.map((s, i) => ({ ...s, orderIndex: i + 1, estimatedArrivalTime: s.dismissalTime, alertThresholdMinutes: 10 }));

    // Sort by dismissal time first
    const sortedByTime = cluster.sort((a, b) => a.dismissalTime.localeCompare(b.dismissalTime));
    
    // Apply nearest neighbor TSP within time constraints
    const optimized = nearestNeighborTSP(sortedByTime);
    
    // Generate arrival times
    return generateArrivalTimes(optimized, constraints);
  };

  // Nearest Neighbor TSP approximation
  const nearestNeighborTSP = (schools: any[]): any[] => {
    if (schools.length <= 1) return schools;

    const unvisited = [...schools];
    const route = [unvisited.shift()!]; // Start with earliest dismissal time

    while (unvisited.length > 0) {
      const current = route[route.length - 1];
      let nearest = unvisited[0];
      let minDistance = calculateDistance(current.latitude, current.longitude, nearest.latitude, nearest.longitude);

      for (let i = 1; i < unvisited.length; i++) {
        const distance = calculateDistance(current.latitude, current.longitude, unvisited[i].latitude, unvisited[i].longitude);
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

  // Generate arrival times with time constraints
  const generateArrivalTimes = (schools: any[], constraints: RouteConstraints): OptimizedSchool[] => {
    if (schools.length === 0) return [];

    const result = [];
    let currentTime = new Date();
    const earliestDismissal = Math.min(...schools.map(s => {
      const [hours, minutes] = s.dismissalTime.split(':');
      return hours * 60 + parseInt(minutes);
    }));
    
    currentTime.setHours(Math.floor(earliestDismissal / 60), (earliestDismissal % 60) - 15, 0, 0); // Start 15 min before earliest

    for (let i = 0; i < schools.length; i++) {
      const school = schools[i];
      
      // Calculate travel time from previous school
      if (i > 0) {
        const prev = schools[i - 1];
        const distance = calculateDistance(prev.latitude, prev.longitude, school.latitude, school.longitude);
        const travelTime = Math.round((distance / 20) * 60); // Assuming 20 mph in school zones
        currentTime = new Date(currentTime.getTime() + (travelTime + constraints.bufferTime) * 60000);
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

      // Add pickup time at school (proportional to student count)
      const pickupTime = Math.max(5, Math.min(15, school.studentCount * 2));
      currentTime = new Date(currentTime.getTime() + pickupTime * 60000);
    }

    return result;
  };

  // Calculate route metrics and warnings
  const calculateRouteMetrics = (schools: OptimizedSchool[], driverId: number): { totalDistance: number; totalTime: number; warnings: string[]; seatUtilization: number } => {
    let totalDistance = 0;
    const warnings = [];
    const totalStudents = schools.reduce((sum, s) => sum + s.studentCount, 0);

    // Calculate total distance
    for (let i = 1; i < schools.length; i++) {
      const prev = schools[i - 1];
      const curr = schools[i];
      totalDistance += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }

    // Calculate total time
    const startTime = new Date(`2024-01-01 ${schools[0]?.estimatedArrivalTime}:00`);
    const endTime = new Date(`2024-01-01 ${schools[schools.length - 1]?.estimatedArrivalTime}:00`);
    const totalTime = (endTime.getTime() - startTime.getTime()) / 60000;

    // Seat utilization
    const seatUtilization = (totalStudents / constraints.vehicleCapacity) * 100;

    // Generate warnings
    if (seatUtilization > 90) {
      warnings.push(`High capacity utilization (${seatUtilization.toFixed(0)}%) - consider reducing students`);
    }

    if (totalTime > constraints.maxRouteTime) {
      warnings.push(`Route exceeds maximum time (${totalTime.toFixed(0)} min > ${constraints.maxRouteTime} min)`);
    }

    if (totalDistance > 30) {
      warnings.push(`Long route distance (${totalDistance.toFixed(1)} miles) - fuel and driver fatigue concerns`);
    }

    // Check for tight timing between schools
    for (let i = 1; i < schools.length; i++) {
      const prev = schools[i - 1];
      const curr = schools[i];
      const prevDismissal = new Date(`2024-01-01 ${prev.dismissalTime}:00`);
      const currArrival = new Date(`2024-01-01 ${curr.estimatedArrivalTime}:00`);
      const timeDiff = (currArrival.getTime() - prevDismissal.getTime()) / 60000;
      
      if (timeDiff < 10) {
        warnings.push(`Tight timing between ${prev.name} and ${curr.name} (${timeDiff.toFixed(0)} min gap)`);
      }
    }

    return { totalDistance, totalTime, warnings, seatUtilization };
  };

  // Main optimization function
  const optimizeRoutes = () => {
    if (constraints.driverCount < 1 || constraints.vehicleCapacity < 1) {
      toast({ title: "Error", description: "Please enter valid driver count and vehicle capacity.", variant: "destructive" });
      return;
    }

    if (availableDrivers.length < constraints.driverCount) {
      toast({ title: "Warning", description: `Only ${availableDrivers.length} drivers available, but ${constraints.driverCount} requested.`, variant: "destructive" });
      return;
    }

    setIsOptimizing(true);

    try {
      const schoolsData = prepareSchoolsData();
      
      if (schoolsData.length === 0) {
        toast({ title: "Error", description: "No schools with valid coordinates and students found.", variant: "destructive" });
        setIsOptimizing(false);
        return;
      }

      // Cluster schools by capacity constraints
      const clusters = clusterSchoolsByCapacity(schoolsData, constraints);
      
      // Create optimized routes for each cluster
      const routes: OptimizedRoute[] = [];
      
      for (let i = 0; i < clusters.length && i < constraints.driverCount; i++) {
        const cluster = clusters[i];
        const optimizedSchools = optimizeClusterRoute(cluster, constraints);
        const metrics = calculateRouteMetrics(optimizedSchools, i);
        const driver = availableDrivers[i];
        
        routes.push({
          id: `route-${i + 1}`,
          driverId: driver?.id || 0,
          driverName: driver ? `${driver.firstName} ${driver.lastName}` : `Driver ${i + 1}`,
          schools: optimizedSchools,
          totalStudents: optimizedSchools.reduce((sum, s) => sum + s.studentCount, 0),
          totalDistance: metrics.totalDistance,
          totalTime: metrics.totalTime,
          warnings: metrics.warnings,
          seatUtilization: metrics.seatUtilization
        });
      }

      setOptimizedRoutes(routes);
      
      // Generate overall analysis
      const totalStudents = routes.reduce((sum, r) => sum + r.totalStudents, 0);
      const totalDistance = routes.reduce((sum, r) => sum + r.totalDistance, 0);
      const allWarnings = routes.flatMap(r => r.warnings);
      
      setAnalysisResults({
        totalStudents,
        totalDistance,
        totalDrivers: routes.length,
        avgUtilization: routes.reduce((sum, r) => sum + r.seatUtilization, 0) / routes.length,
        criticalWarnings: allWarnings.length,
        efficiency: Math.max(0, 100 - (totalDistance / routes.length - 15) * 2)
      });

      toast({ 
        title: "Routes optimized", 
        description: `Generated ${routes.length} routes for ${totalStudents} students across ${schoolsData.length} schools.` 
      });

    } catch (error) {
      console.error('Optimization error:', error);
      toast({ title: "Error", description: "Failed to optimize routes. Please check your inputs.", variant: "destructive" });
    }

    setIsOptimizing(false);
  };

  // Save all optimized routes
  const saveAllRoutes = async () => {
    if (optimizedRoutes.length === 0) {
      toast({ title: "Error", description: "No optimized routes to save.", variant: "destructive" });
      return;
    }

    try {
      for (const route of optimizedRoutes) {
        // Create route
        const routeData = {
          name: `${route.driverName} Route - ${route.schools.length} Schools`,
          driverId: route.driverId,
          status: 'active'
        };

        const newRoute: any = await apiRequest('POST', '/api/routes', routeData);

        // Add schools to route
        for (const school of route.schools) {
          await apiRequest('POST', `/api/routes/${newRoute.id}/schools`, {
            schoolId: school.id,
            orderIndex: school.orderIndex,
            estimatedArrivalTime: school.estimatedArrivalTime,
            alertThresholdMinutes: school.alertThresholdMinutes
          });
        }
      }

      toast({ title: "Success", description: `Saved ${optimizedRoutes.length} optimized routes.` });
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "Error", description: "Failed to save routes.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Multi-Driver Route Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="driverCount">Number of Drivers</Label>
              <Input
                id="driverCount"
                type="number"
                min="1"
                max={availableDrivers.length}
                value={constraints.driverCount}
                onChange={(e) => setConstraints(prev => ({ ...prev, driverCount: parseInt(e.target.value) || 1 }))}
              />
              <p className="text-xs text-gray-500 mt-1">{availableDrivers.length} drivers available</p>
            </div>
            
            <div>
              <Label htmlFor="vehicleCapacity">Vehicle Seat Capacity</Label>
              <Input
                id="vehicleCapacity"
                type="number"
                min="1"
                max="50"
                value={constraints.vehicleCapacity}
                onChange={(e) => setConstraints(prev => ({ ...prev, vehicleCapacity: parseInt(e.target.value) || 12 }))}
              />
            </div>
            
            <div>
              <Label htmlFor="maxRouteTime">Max Route Time (min)</Label>
              <Input
                id="maxRouteTime"
                type="number"
                min="30"
                max="240"
                value={constraints.maxRouteTime}
                onChange={(e) => setConstraints(prev => ({ ...prev, maxRouteTime: parseInt(e.target.value) || 120 }))}
              />
            </div>
            
            <div>
              <Label htmlFor="bufferTime">Buffer Time (min)</Label>
              <Input
                id="bufferTime"
                type="number"
                min="5"
                max="30"
                value={constraints.bufferTime}
                onChange={(e) => setConstraints(prev => ({ ...prev, bufferTime: parseInt(e.target.value) || 10 }))}
              />
            </div>
          </div>
          
          <Button 
            onClick={optimizeRoutes} 
            disabled={isOptimizing}
            className="w-full"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Optimizing Routes...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Optimize Routes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Summary */}
      {analysisResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Optimization Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analysisResults.totalStudents}</div>
                <div className="text-sm text-gray-500">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analysisResults.totalDrivers}</div>
                <div className="text-sm text-gray-500">Routes Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{analysisResults.totalDistance.toFixed(1)}</div>
                <div className="text-sm text-gray-500">Total Miles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{analysisResults.avgUtilization.toFixed(0)}%</div>
                <div className="text-sm text-gray-500">Avg Capacity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analysisResults.criticalWarnings}</div>
                <div className="text-sm text-gray-500">Warnings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimized Routes */}
      {optimizedRoutes.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Optimized Routes</h3>
            <Button onClick={saveAllRoutes}>
              <Save className="h-4 w-4 mr-2" />
              Save All Routes
            </Button>
          </div>
          
          {optimizedRoutes.map((route, index) => (
            <Card key={route.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Route {index + 1}: {route.driverName}
                  </div>
                  <Badge variant={route.seatUtilization > 90 ? "destructive" : route.seatUtilization > 75 ? "default" : "secondary"}>
                    {route.seatUtilization.toFixed(0)}% Capacity
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Route Metrics */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {route.totalStudents} students
                  </div>
                  <div className="flex items-center gap-1">
                    <Route className="h-4 w-4" />
                    {route.totalDistance.toFixed(1)} miles
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    {route.totalTime.toFixed(0)} minutes
                  </div>
                </div>
                
                {/* Warnings */}
                {route.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {route.warnings.map((warning, i) => (
                          <div key={i}>• {warning}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* School Sequence */}
                <div>
                  <Label className="text-sm font-medium">School Pickup Sequence</Label>
                  <div className="mt-2 space-y-2">
                    {route.schools.map((school, schoolIndex) => (
                      <div key={school.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{school.orderIndex}</Badge>
                          <div>
                            <div className="font-medium">{school.name}</div>
                            <div className="text-xs text-gray-500">{school.studentCount} students</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{school.estimatedArrivalTime}</div>
                          <div className="text-xs text-gray-500">Dismissal: {school.dismissalTime}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}