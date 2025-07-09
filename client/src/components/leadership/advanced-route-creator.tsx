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

  // Enhanced clustering using ALL drivers to eliminate late arrivals
  const clusterSchoolsByCapacity = (schoolsData: any[], constraints: CreatorConstraints) => {
    const schoolsWithStudents = schoolsData.map(school => ({
      ...school,
      studentCount: students.filter((s: any) => s.schoolId === school.id).length,
      latitude: parseFloat(school.latitude || '0'),
      longitude: parseFloat(school.longitude || '0'),
      dismissalTime: school.dismissalTime || "15:00",
    })).filter(school => school.studentCount > 0);

    console.log(`🎯 Optimizing for ${constraints.driverCount} drivers to eliminate late arrivals`);

    // Sort by dismissal time FIRST to ensure no late arrivals
    schoolsWithStudents.sort((a, b) => {
      const timeCompare = a.dismissalTime.localeCompare(b.dismissalTime);
      if (timeCompare !== 0) return timeCompare;
      // Secondary sort by proximity (using latitude as rough approximation)
      return a.latitude - b.latitude;
    });

    // Initialize exactly the number of clusters requested by admin
    const clusters: any[][] = Array(constraints.driverCount).fill(null).map(() => []);
    const clusterCapacities = Array(constraints.driverCount).fill(0);
    const clusterTimeRanges: { start: string, end: string }[] = Array(constraints.driverCount).fill(null).map(() => ({ start: "", end: "" }));

    // CRITICAL: Assign schools to ensure maximum on-time pickup coverage
    for (const school of schoolsWithStudents) {
      let bestCluster = -1;
      let bestScore = -Infinity;

      for (let i = 0; i < constraints.driverCount; i++) {
        const remainingCapacity = constraints.seatsPerDriver - clusterCapacities[i];
        if (remainingCapacity >= school.studentCount) {
          let score = 0;
          
          // Priority 1: Time efficiency to prevent late arrivals (80% of score)
          if (clusters[i].length === 0) {
            score += 80; // High bonus for starting new routes
          } else {
            const lastTime = clusterTimeRanges[i].end;
            const timeDiff = Math.abs(
              new Date(`2000-01-01 ${school.dismissalTime}`).getTime() - 
              new Date(`2000-01-01 ${lastTime}`).getTime()
            ) / (1000 * 60); // minutes
            score += Math.max(0, 80 - timeDiff * 2); // Heavy penalty for time gaps
          }
          
          // Priority 2: Capacity efficiency (20% of score)
          score += (school.studentCount / remainingCapacity) * 20;

          if (score > bestScore) {
            bestScore = score;
            bestCluster = i;
          }
        }
      }

      if (bestCluster !== -1) {
        clusters[bestCluster].push(school);
        clusterCapacities[bestCluster] += school.studentCount;
        
        // Update time range for this cluster
        if (clusters[bestCluster].length === 1) {
          clusterTimeRanges[bestCluster].start = school.dismissalTime;
          clusterTimeRanges[bestCluster].end = school.dismissalTime;
        } else {
          if (school.dismissalTime < clusterTimeRanges[bestCluster].start) {
            clusterTimeRanges[bestCluster].start = school.dismissalTime;
          }
          if (school.dismissalTime > clusterTimeRanges[bestCluster].end) {
            clusterTimeRanges[bestCluster].end = school.dismissalTime;
          }
        }
        
        console.log(`📍 Assigned ${school.name} (${school.dismissalTime}) to driver ${bestCluster + 1} - capacity: ${clusterCapacities[bestCluster]}/${constraints.seatsPerDriver}`);
      } else {
        console.warn(`⚠️ Could not assign ${school.name} - all drivers at capacity!`);
      }
    }

    // Always return exactly the number of clusters requested (even if some are empty)
    return clusters;
  };

  // FIX: Enhanced route optimization with dismissal time priority for proper pickup scheduling
  const optimizeClusterRoute = (cluster: any[], constraints: CreatorConstraints) => {
    if (cluster.length <= 1) {
      return cluster.map((school, index) => ({
        ...school,
        orderIndex: index + 1,
        estimatedArrivalTime: calculateEstimatedArrival(school.dismissalTime),
      }));
    }

    // CRITICAL: Sort by dismissal time first to ensure drivers arrive on time for pickup
    const sortedByTime = [...cluster].sort((a, b) => {
      const timeA = a.dismissalTime || "15:00";
      const timeB = b.dismissalTime || "15:00";
      console.log(`📅 Ordering schools: ${a.name} (${timeA}) before ${b.name} (${timeB})`);
      return timeA.localeCompare(timeB);
    });

    return sortedByTime.map((school, index) => ({
      ...school,
      orderIndex: index + 1,
      estimatedArrivalTime: calculateEstimatedArrival(school.dismissalTime),
    }));
  };

  // Enhanced route metrics with individual timing analysis
  const calculateRouteMetrics = (schools: any[], driverIndex: number) => {
    let totalDistance = 0;
    let totalTime = 0;
    const warnings: string[] = [];
    const timingConcerns: string[] = [];

    // Calculate travel time between schools and check pickup timing
    let currentTime = new Date(`2000-01-01 13:30:00`); // Start time 1:30 PM
    
    for (let i = 0; i < schools.length; i++) {
      const school = schools[i];
      const dismissalTime = new Date(`2000-01-01 ${school.dismissalTime}:00`);
      
      if (i > 0) {
        // Calculate travel time from previous school
        const prevSchool = schools[i - 1];
        const dist = calculateDistance(
          prevSchool.latitude,
          prevSchool.longitude,
          school.latitude,
          school.longitude
        );
        totalDistance += dist;
        const travelTime = (dist / 30) * 60; // 30 km/h average speed
        totalTime += travelTime + constraints.bufferTime;
        
        // Add travel time to current time
        currentTime = new Date(currentTime.getTime() + (travelTime + constraints.bufferTime) * 60000);
      }
      
      // Check if driver will arrive on time
      const arrivalTime = currentTime;
      const timeUntilDismissal = (dismissalTime.getTime() - arrivalTime.getTime()) / 60000; // minutes
      
      if (timeUntilDismissal < 0) {
        timingConcerns.push(`${school.name}: Driver arrives ${Math.abs(Math.round(timeUntilDismissal))} minutes LATE (${arrivalTime.toTimeString().slice(0,5)} arrival vs ${school.dismissalTime} dismissal)`);
        warnings.push(`CRITICAL: Late arrival at ${school.name}`);
      } else if (timeUntilDismissal < 5) {
        timingConcerns.push(`${school.name}: Very tight timing - only ${Math.round(timeUntilDismissal)} minutes before dismissal`);
        warnings.push(`TIMING RISK: ${school.name} has very tight timing`);
      }
    }

    // Check for timing conflicts between schools
    for (let i = 0; i < schools.length - 1; i++) {
      const currentDismissal = schools[i].dismissalTime;
      const nextDismissal = schools[i + 1].dismissalTime;
      
      if (currentDismissal && nextDismissal && currentDismissal > nextDismissal) {
        warnings.push(`Timing conflict: ${schools[i].name} dismisses after ${schools[i + 1].name}`);
        timingConcerns.push(`Scheduling conflict: ${schools[i].name} (${currentDismissal}) dismisses after ${schools[i + 1].name} (${nextDismissal})`);
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
      timingConcerns, // New field for detailed timing analysis
    };
  };

  // FIX #1: Enhanced route optimization to use ALL available drivers for maximum efficiency
  const generateOptimizedRoutes = async () => {
    if (constraints.driverCount < 1 || constraints.seatsPerDriver < 1) {
      toast({
        title: "Error",
        description: "Please enter valid driver count and seat capacity.",
        variant: "destructive",
      });
      return;
    }

    // FIX #1: Enhanced validation for optimal route creation
    if (!constraints.startingAddress || !constraints.endingAddress) {
      toast({
        title: "Missing Information",
        description: "Please provide both starting and ending addresses for optimal route calculation.",
        variant: "destructive",
      });
      return;
    }

    console.log('🚀 Starting route optimization with constraints:', constraints);
    console.log('🚌 Available drivers for optimization:', drivers.filter(d => d.role === 'driver'));
    
    // Use admin's specified driver count for route optimization
    const availableDrivers = drivers.filter((d: any) => d.role === 'driver');
    if (availableDrivers.length === 0) {
      toast({
        title: "No Drivers Available",
        description: "No driver accounts found. Please create driver accounts first.",
        variant: "destructive",
      });
      return;
    }

    // Use admin's driver count input, limited by available drivers
    const effectiveDriverCount = Math.min(constraints.driverCount, availableDrivers.length);
    console.log(`🎯 Using ${effectiveDriverCount} drivers as requested by admin (${availableDrivers.length} available)`);

    setIsOptimizing(true);

    try {
      console.log(`✅ Ready to optimize routes for ALL ${effectiveDriverCount} drivers`);

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

      // FIX #1: Use ALL available drivers to create maximum number of routes
      const clusters = clusterSchoolsByCapacity(schools, {
        ...constraints,
        driverCount: effectiveDriverCount // Use ALL available drivers
      });
      console.log(`📊 Generated ${clusters.length} clusters for ${effectiveDriverCount} drivers`);
      
      // Create optimized routes for each cluster using ALL drivers
      const routes: OptimizedRoute[] = [];
      
      for (let i = 0; i < clusters.length && i < effectiveDriverCount; i++) {
        const cluster = clusters[i];
        // FIX: Optimize route considering dismissal times for proper pickup scheduling
        const optimizedSchools = optimizeClusterRoute(cluster, {
          ...constraints,
          driverCount: effectiveDriverCount
        });
        const metrics = calculateRouteMetrics(optimizedSchools, i);
        const driver = availableDrivers[i]; // Use driver from ALL available drivers
        
        console.log(`🚛 Route ${i + 1}: ${driver.firstName} ${driver.lastName} - ${optimizedSchools.length} schools`);
        
        routes.push({
          id: `route-${i + 1}`,
          driverId: driver.id,
          driverName: `${driver.firstName} ${driver.lastName}`,
          schools: optimizedSchools,
          totalStudents: optimizedSchools.reduce((sum, s) => sum + s.studentCount, 0),
          totalDistance: metrics.totalDistance,
          totalTime: metrics.totalTime,
          warnings: metrics.warnings,
          timingConcerns: metrics.timingConcerns || [], // Individual route timing analysis
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

  // FIX #2: Enhanced route saving with comprehensive error handling
  const saveAllRoutes = async () => {
    if (optimizedRoutes.length === 0) {
      toast({ title: "Error", description: "No optimized routes to save.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      console.log('🚀 Starting to save all optimized routes:', optimizedRoutes);
      
      for (const route of optimizedRoutes) {
        console.log('💾 Saving route:', route);
        
        // Create route with proper validation
        const routeData = {
          name: `${route.driverName} Route - ${route.schools.length} Schools`,
          driverId: parseInt(route.driverId),
          isActive: true,
          startingPoint: route.startingPoint || constraints.startingAddress,
          endingPoint: route.endingPoint || constraints.endingAddress,
          description: `Optimized route with ${route.totalStudents} students across ${route.schools.length} schools`
        };

        const newRoute: any = await apiRequest('POST', '/api/routes', routeData);
        console.log('✅ Route created successfully:', newRoute);

        if (!newRoute || !newRoute.id) {
          throw new Error(`Route creation failed for ${route.driverName} - no route ID returned from server`);
        }

        // Add schools to route with proper validation
        for (const school of route.schools) {
          console.log('🏫 Adding school to route:', school);
          
          await apiRequest('POST', `/api/routes/${newRoute.id}/schools`, {
            schoolId: school.id,
            orderIndex: school.orderIndex,
            estimatedArrivalTime: school.estimatedArrivalTime,
            alertThresholdMinutes: 10
          });

          // Create route assignments for students at this school
          const schoolStudents = students.filter((s: any) => s.schoolId === school.id);
          console.log(`👥 Creating assignments for ${schoolStudents.length} students at ${school.name}`);
          
          for (const student of schoolStudents) {
            await apiRequest('POST', '/api/routes/assignments', {
              routeId: newRoute.id,
              studentId: student.id,
              schoolId: school.id
            });
          }
        }
      }

      console.log('✅ All routes saved successfully!');
      toast({ 
        title: "Success", 
        description: `All ${optimizedRoutes.length} routes saved successfully and are now available to drivers!` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      onClose();
      
    } catch (error) {
      console.error('Save error:', error);
      console.error('❌ Error saving routes:', error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save routes. Please try again.", 
        variant: "destructive" 
      });
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

  // FIX #3: Individual route saving handler
  const saveRoute = async (route: OptimizedRoute) => {
    setIsSaving(true);
    
    try {
      console.log('💾 Saving individual route:', route);
      
      const routeData = {
        name: `${route.driverName} Route - ${route.schools.length} Schools`,
        driverId: parseInt(route.driverId),
        isActive: true,
        startingPoint: constraints.startingAddress,
        endingPoint: constraints.endingAddress,
        description: `Optimized route with ${route.totalStudents} students across ${route.schools.length} schools`
      };

      const newRoute: any = await apiRequest('POST', '/api/routes', routeData);
      console.log('✅ Route created successfully:', newRoute);

      if (!newRoute || !newRoute.id) {
        throw new Error('Route creation failed - no route ID returned from server');
      }

      // Add schools to route
      for (const school of route.schools) {
        console.log(`🏫 Adding school ${school.name} to route ${newRoute.id}`);
        await apiRequest('POST', `/api/routes/${newRoute.id}/schools`, {
          schoolId: school.id,
          orderIndex: school.orderIndex,
          estimatedArrivalTime: school.estimatedArrivalTime,
          alertThresholdMinutes: 10
        });

        // Create route assignments for students at this school
        const schoolStudents = students.filter((s: any) => s.schoolId === school.id);
        for (const student of schoolStudents) {
          await apiRequest('POST', '/api/routes/assignments', {
            routeId: newRoute.id,
            studentId: student.id,
            schoolId: school.id
          });
        }
      }

      toast({ 
        title: "Success", 
        description: `Route saved successfully and is now available to ${route.driverName}!` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      
    } catch (error) {
      console.error('❌ Error saving individual route:', error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save route. Please try again.", 
        variant: "destructive" 
      });
    }
    
    setIsSaving(false);
  };

  // FIX #4: Route deletion handler
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