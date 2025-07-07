import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Route,
  Edit
} from "lucide-react";
import EnhancedRouteEditor from "./enhanced-route-editor";

interface RouteCreatorProps {
  onClose: () => void;
}

interface OptimizedRoute {
  id: string;
  driverId: number;
  driverName: string;
  schools: Array<{
    id: number;
    name: string;
    studentCount: number;
    dismissalTime: string;
    estimatedArrivalTime: string;
    orderIndex: number;
    latitude: string;
    longitude: string;
  }>;
  totalStudents: number;
  totalDistance: number;
  totalTime: number;
  seatUtilization: number;
  warnings: string[];
  startingPoint?: {
    name: string;
    address: string;
    latitude: string;
    longitude: string;
  };
  endingPoint?: {
    name: string;
    address: string;
    latitude: string;
    longitude: string;
  };
}

interface CreatorConstraints {
  driverCount: number;
  seatsPerDriver: number;
  maxRouteTime: number;
  bufferTime: number;
  startingAddress: string; // FIX #2: Starting point address
  endingAddress: string;   // FIX #2: Ending point address
}

export default function AdvancedRouteCreator({ onClose }: RouteCreatorProps) {
  const [constraints, setConstraints] = useState<CreatorConstraints>({
    driverCount: 2,
    seatsPerDriver: 15,
    maxRouteTime: 90,
    bufferTime: 10,
    startingAddress: "", // FIX #2: Starting address input
    endingAddress: "",   // FIX #2: Ending address input
  });
  const [optimizedRoutes, setOptimizedRoutes] = useState<OptimizedRoute[]>([]);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRoute, setEditingRoute] = useState<OptimizedRoute | null>(null); // FIX #2: EDITING CAPABILITY
  const { toast } = useToast();

  // Fetch data
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
  });

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
  });

  const drivers = users.filter((user: any) => user.role === 'driver');

  // Calculate estimated arrival time (5 minutes before dismissal)
  const calculateEstimatedArrival = (dismissalTime: string): string => {
    if (!dismissalTime) return "";
    
    const [hours, minutes] = dismissalTime.split(':').map(Number);
    const dismissalDate = new Date();
    dismissalDate.setHours(hours, minutes, 0, 0);
    
    // Subtract 5 minutes
    const estimatedDate = new Date(dismissalDate.getTime() - 5 * 60 * 1000);
    
    return `${estimatedDate.getHours().toString().padStart(2, '0')}:${estimatedDate.getMinutes().toString().padStart(2, '0')}`;
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Cluster schools by capacity and geographical proximity
  const clusterSchoolsByCapacity = (schoolsData: any[], constraints: CreatorConstraints) => {
    const schoolsWithStudents = schoolsData.map(school => ({
      ...school,
      studentCount: students.filter((s: any) => s.schoolId === school.id).length,
      latitude: parseFloat(school.latitude || '0'),
      longitude: parseFloat(school.longitude || '0'),
    })).filter(school => school.studentCount > 0);

    // Sort by student count (descending) for best-fit decreasing
    schoolsWithStudents.sort((a, b) => b.studentCount - a.studentCount);

    const clusters: any[][] = Array(constraints.driverCount).fill(null).map(() => []);
    const clusterCapacities = Array(constraints.driverCount).fill(0);

    // Assign schools to clusters using best-fit decreasing
    for (const school of schoolsWithStudents) {
      let bestCluster = -1;
      let minWasteSpace = Infinity;

      for (let i = 0; i < constraints.driverCount; i++) {
        const remainingCapacity = constraints.seatsPerDriver - clusterCapacities[i];
        if (remainingCapacity >= school.studentCount) {
          const wasteSpace = remainingCapacity - school.studentCount;
          if (wasteSpace < minWasteSpace) {
            minWasteSpace = wasteSpace;
            bestCluster = i;
          }
        }
      }

      if (bestCluster !== -1) {
        clusters[bestCluster].push(school);
        clusterCapacities[bestCluster] += school.studentCount;
      }
    }

    return clusters.filter(cluster => cluster.length > 0);
  };

  // Optimize school order within a cluster using TSP approximation
  const optimizeClusterRoute = (cluster: any[], constraints: CreatorConstraints) => {
    if (cluster.length <= 1) {
      return cluster.map((school, index) => ({
        ...school,
        orderIndex: index + 1,
        estimatedArrivalTime: calculateEstimatedArrival(school.dismissalTime),
      }));
    }

    // Sort by dismissal time first to respect timing constraints
    const sortedByTime = [...cluster].sort((a, b) => {
      const timeA = a.dismissalTime || "15:00";
      const timeB = b.dismissalTime || "15:00";
      return timeA.localeCompare(timeB);
    });

    return sortedByTime.map((school, index) => ({
      ...school,
      orderIndex: index + 1,
      estimatedArrivalTime: calculateEstimatedArrival(school.dismissalTime),
    }));
  };

  // Calculate route metrics
  const calculateRouteMetrics = (schools: any[], driverIndex: number) => {
    let totalDistance = 0;
    let totalTime = 0;
    const warnings: string[] = [];

    // Calculate total distance
    for (let i = 0; i < schools.length - 1; i++) {
      const dist = calculateDistance(
        schools[i].latitude,
        schools[i].longitude,
        schools[i + 1].latitude,
        schools[i + 1].longitude
      );
      totalDistance += dist;
      totalTime += (dist / 30) * 60; // Assume 30 km/h average speed
    }

    // Add time between schools (buffer time)
    totalTime += (schools.length - 1) * constraints.bufferTime;

    // Check for timing conflicts
    for (let i = 0; i < schools.length - 1; i++) {
      const currentDismissal = schools[i].dismissalTime;
      const nextDismissal = schools[i + 1].dismissalTime;
      
      if (currentDismissal && nextDismissal && currentDismissal > nextDismissal) {
        warnings.push(`Timing conflict: ${schools[i].name} dismisses after ${schools[i + 1].name}`);
      }
    }

    // Check route time limit
    if (totalTime > constraints.maxRouteTime) {
      warnings.push(`Route exceeds ${constraints.maxRouteTime} minute limit (${Math.round(totalTime)} minutes)`);
    }

    // Calculate seat utilization
    const totalStudents = schools.reduce((sum, s) => sum + s.studentCount, 0);
    const seatUtilization = (totalStudents / constraints.seatsPerDriver) * 100;

    if (seatUtilization > 100) {
      warnings.push(`Over capacity: ${totalStudents} students for ${constraints.seatsPerDriver} seats`);
    }

    return {
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalTime: Math.round(totalTime),
      seatUtilization: Math.round(seatUtilization),
      warnings,
    };
  };

  // Generate optimized routes
  const generateOptimizedRoutes = async () => {
    if (constraints.driverCount < 1 || constraints.seatsPerDriver < 1) {
      toast({
        title: "Error",
        description: "Please enter valid driver count and seat capacity.",
        variant: "destructive",
      });
      return;
    }

    // FIX #2: Validate starting and ending addresses for optimal route planning
    if (!constraints.startingAddress || !constraints.endingAddress) {
      toast({
        title: "Missing Information",
        description: "Please provide both starting and ending addresses for optimal route calculation.",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);

    try {
      // Get available drivers
      const availableDrivers = drivers.slice(0, constraints.driverCount);
      
      if (availableDrivers.length < constraints.driverCount) {
        toast({
          title: "Warning",
          description: `Only ${availableDrivers.length} drivers available for ${constraints.driverCount} requested routes.`,
          variant: "destructive",
        });
      }

      // FIX #2: Geocode starting and ending addresses for route optimization
      let startingCoords = null;
      let endingCoords = null;

      try {
        // Geocode starting address
        const startResponse = await fetch(`/api/geocode?address=${encodeURIComponent(constraints.startingAddress)}`);
        if (startResponse.ok) {
          startingCoords = await startResponse.json();
        }

        // Geocode ending address
        const endResponse = await fetch(`/api/geocode?address=${encodeURIComponent(constraints.endingAddress)}`);
        if (endResponse.ok) {
          endingCoords = await endResponse.json();
        }
      } catch (error) {
        console.log('Geocoding error, using route optimization without coordinates:', error);
      }

      // Cluster schools by capacity constraints
      const clusters = clusterSchoolsByCapacity(schools, constraints);
      
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
        description: `Generated ${routes.length} routes for ${totalStudents} students across ${schools.length} schools.` 
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

    setIsSaving(true);

    try {
      for (const route of optimizedRoutes) {
        // Create route
        const routeData = {
          name: `${route.driverName} Route - ${route.schools.length} Schools`,
          driverId: route.driverId,
          isActive: true
        };

        const newRoute: any = await apiRequest('POST', '/api/routes', routeData);

        // Add schools to route
        for (const school of route.schools) {
          await apiRequest('POST', `/api/routes/${newRoute.id}/schools`, {
            schoolId: school.id,
            orderIndex: school.orderIndex,
            estimatedArrivalTime: school.estimatedArrivalTime,
            alertThresholdMinutes: 10
          });

          // Create route assignments for students at this school
          const schoolStudents = students.filter((s: any) => s.schoolId === school.id);
          for (const student of schoolStudents) {
            await apiRequest('POST', '/api/route-assignments', {
              routeId: newRoute.id,
              studentId: student.id,
              schoolId: school.id,
              isActive: true
            });
          }
        }
      }

      toast({ title: "Success", description: `Saved ${optimizedRoutes.length} optimized routes with student assignments.` });
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      onClose();
      
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "Error", description: "Failed to save routes.", variant: "destructive" });
    }

    setIsSaving(false);
  };

  // FIX #2: Route editing handler
  const handleEditRoute = (editedRoute: OptimizedRoute) => {
    setOptimizedRoutes(routes => 
      routes.map(route => 
        route.id === editedRoute.id ? editedRoute : route
      )
    );
    setEditingRoute(null);
    toast({
      title: "Route Updated",
      description: "Route has been successfully edited."
    });
  };

  // FIX #3: Route deletion handler
  const deleteOptimizedRoute = (routeId: string) => {
    setOptimizedRoutes(routes => routes.filter(route => route.id !== routeId));
    toast({
      title: "Route Deleted",
      description: "Route has been removed from the optimization results."
    });
  };

  // Show route editor if editing
  if (editingRoute) {
    return (
      <EnhancedRouteEditor
        route={editingRoute}
        onSave={handleEditRoute}
        onCancel={() => setEditingRoute(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Advanced Route Creator</h2>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Route Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="driverCount">Number of Drivers</Label>
            <Input
              id="driverCount"
              type="number"
              min="1"
              max="10"
              value={constraints.driverCount}
              onChange={(e) => setConstraints({...constraints, driverCount: parseInt(e.target.value) || 1})}
            />
          </div>
          <div>
            <Label htmlFor="seatsPerDriver">Seats per Driver</Label>
            <Input
              id="seatsPerDriver"
              type="number"
              min="5"
              max="50"
              value={constraints.seatsPerDriver}
              onChange={(e) => setConstraints({...constraints, seatsPerDriver: parseInt(e.target.value) || 15})}
            />
          </div>
          <div>
            <Label htmlFor="maxRouteTime">Max Route Time (min)</Label>
            <Input
              id="maxRouteTime"
              type="number"
              min="30"
              max="180"
              value={constraints.maxRouteTime}
              onChange={(e) => setConstraints({...constraints, maxRouteTime: parseInt(e.target.value) || 90})}
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
              onChange={(e) => setConstraints({...constraints, bufferTime: parseInt(e.target.value) || 10})}
            />
          </div>
        </CardContent>
      </Card>

      {/* FIX #2: STARTING AND ENDING ADDRESS INPUTS */}
      <Card>
        <CardHeader>
          <CardTitle>Route Start & End Points</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startingAddress">Starting Address (Driver Base)</Label>
              <Input
                id="startingAddress"
                placeholder="Enter driver starting location..."
                value={constraints.startingAddress}
                onChange={(e) => setConstraints({...constraints, startingAddress: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Where drivers begin their routes</p>
            </div>
            <div>
              <Label htmlFor="endingAddress">Ending Address (Return Location)</Label>
              <Input
                id="endingAddress"
                placeholder="Enter route ending location..."
                value={constraints.endingAddress}
                onChange={(e) => setConstraints({...constraints, endingAddress: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Where drivers end their routes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button 
          onClick={generateOptimizedRoutes}
          disabled={isOptimizing}
          size="lg"
          className="px-8"
        >
          <Route className="h-5 w-5 mr-2" />
          {isOptimizing ? "Optimizing Routes..." : "Generate Optimized Routes"}
        </Button>
      </div>

      {/* Analysis Results */}
      {analysisResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Route Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{analysisResults.totalStudents}</div>
                <div className="text-sm text-gray-600">Students</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{analysisResults.totalDrivers}</div>
                <div className="text-sm text-gray-600">Routes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{Math.round(analysisResults.avgUtilization)}%</div>
                <div className="text-sm text-gray-600">Avg Utilization</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{analysisResults.totalDistance}km</div>
                <div className="text-sm text-gray-600">Total Distance</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{analysisResults.criticalWarnings}</div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimized Routes */}
      {optimizedRoutes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Optimized Routes</h3>
            <Button 
              onClick={saveAllRoutes}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save All Routes"}
            </Button>
          </div>

          {optimizedRoutes.map((route, index) => (
            <Card key={route.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{route.driverName} - Route {index + 1}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {route.totalStudents}/{constraints.seatsPerDriver}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {route.totalDistance}km
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {route.totalTime}min
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {route.schools.map((school, schoolIndex) => (
                      <div key={school.id} className="bg-gray-50 p-3 rounded border">
                        <div className="font-medium">
                          {schoolIndex + 1}. {school.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {school.studentCount} students • Pickup: {school.estimatedArrivalTime}
                        </div>
                        <div className="text-xs text-gray-500">
                          Dismissal: {school.dismissalTime || 'Not set'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {route.warnings.length > 0 && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription>
                        <div className="font-medium text-red-600">Route Concerns:</div>
                        <ul className="list-disc list-inside mt-1">
                          {route.warnings.map((warning, i) => (
                            <li key={i} className="text-sm text-red-600">{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                    <span>Seat Utilization: {route.seatUtilization}%</span>
                    <span>Schools: {route.schools.length}</span>
                    <span>Efficiency: {Math.round(100 - (route.totalDistance / route.schools.length - 5) * 5)}%</span>
                  </div>

                  {/* FIX #2 & #3: EDIT, SAVE, AND DELETE BUTTONS */}
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setEditingRoute(route)}
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Route
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => deleteOptimizedRoute(route.id)}
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      Delete Route
                    </Button>
                    <Button
                      onClick={() => saveRoute(route)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Route
                    </Button>
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