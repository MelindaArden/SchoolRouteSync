import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Navigation, 
  MapPin, 
  Clock, 
  ArrowRight, 
  ExternalLink,
  RotateCcw,
  Compass,
  Target,
  Route,
  AlertCircle
} from "lucide-react";

interface NavigationViewProps {
  route: any;
  currentLocation: any;
  activeSession: any;
  studentPickups?: any[];
}

export default function NavigationView({ route, currentLocation, activeSession, studentPickups = [] }: NavigationViewProps) {
  const [currentSchoolIndex, setCurrentSchoolIndex] = useState(0);
  const [directions, setDirections] = useState<any[]>([]);

  // Debug logging to understand data structure
  console.log('NavigationView Debug:', {
    route,
    currentLocation,
    activeSession,
    studentPickups,
    routeSchools: route?.schools
  });

  // Get ordered schools for the route
  const orderedSchools = route?.schools?.sort((a: any, b: any) => a.orderIndex - b.orderIndex) || [];

  // Function to check if all students are picked up from a school
  const areAllStudentsPickedUp = (schoolId: number) => {
    // Get students for this school from the route data
    const schoolStudents = [];
    
    // Find the school in the route's schools array and get its students
    const schoolData = route?.schools?.find((s: any) => s.schoolId === schoolId || s.school?.id === schoolId);
    if (schoolData?.students) {
      schoolStudents.push(...schoolData.students);
    }
    
    console.log(`📋 Checking school ${schoolId}:`, {
      studentsCount: schoolStudents.length,
      students: schoolStudents.map((s: any) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }))
    });
    
    if (schoolStudents.length === 0) return true;
    
    return schoolStudents.every((student: any) => {
      const pickup = studentPickups.find((p: any) => p.studentId === student.id);
      const isCompleted = pickup && (pickup.status === 'picked_up' || pickup.status === 'absent' || pickup.status === 'no_show');
      
      console.log(`🎓 Student ${student.firstName} ${student.lastName}:`, {
        id: student.id,
        pickup: pickup ? { status: pickup.status, pickedUpAt: pickup.pickedUpAt } : 'No pickup record',
        isCompleted
      });
      
      return isCompleted;
    });
  };

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

  // Calculate estimated travel time (assuming 25 mph average in city)
  const calculateTravelTime = (distance: number): number => {
    return Math.round((distance / 25) * 60); // Convert to minutes
  };

  // Get next school to visit based on pickup completion
  const getNextSchool = () => {
    console.log('🗺️ Finding next school from ordered schools:', orderedSchools.length);
    
    if (!orderedSchools.length) return null;
    
    // Find first school where not all students are picked up
    for (let i = 0; i < orderedSchools.length; i++) {
      const school = orderedSchools[i];
      const schoolId = school.schoolId || school.school?.id;
      const allPickedUp = areAllStudentsPickedUp(schoolId);
      
      console.log(`🏫 School ${i + 1}/${orderedSchools.length}:`, {
        name: school.school?.name || school.name,
        id: schoolId,
        orderIndex: school.orderIndex,
        allPickedUp
      });
      
      if (!allPickedUp) {
        console.log(`🎯 Next destination: ${school.school?.name || school.name} (index ${i})`);
        return { school, index: i };
      }
    }
    
    console.log('✅ All schools completed! Route is finished.');
    // If all schools are completed, return null to indicate route completion
    return null;
  };

  const nextSchool = getNextSchool();

  // Generate turn-by-turn directions based on route order
  const generateDirections = () => {
    if (!orderedSchools.length || !currentLocation) return [];

    const directions = [];
    let currentLat = currentLocation.latitude;
    let currentLng = currentLocation.longitude;

    for (let i = 0; i < orderedSchools.length; i++) {
      const school = orderedSchools[i];
      const schoolLat = parseFloat(school.school?.latitude || school.latitude || '0');
      const schoolLng = parseFloat(school.school?.longitude || school.longitude || '0');

      if (schoolLat && schoolLng) {
        const distance = calculateDistance(currentLat, currentLng, schoolLat, schoolLng);
        const travelTime = calculateTravelTime(distance);

        // Simple direction calculation (this would be enhanced with real routing API)
        const bearing = calculateBearing(currentLat, currentLng, schoolLat, schoolLng);
        const direction = getDirectionFromBearing(bearing);

        directions.push({
          schoolName: school.school?.name || school.name,
          address: school.school?.address || school.address,
          distance: distance.toFixed(1),
          travelTime,
          direction,
          orderIndex: school.orderIndex || (i + 1),
          estimatedArrival: school.estimatedArrivalTime || 'TBD',
          dismissalTime: school.school?.dismissalTime || school.dismissalTime,
          latitude: schoolLat,
          longitude: schoolLng
        });

        currentLat = schoolLat;
        currentLng = schoolLng;
      }
    }

    return directions;
  };

  // Calculate bearing between two points
  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  // Convert bearing to cardinal direction
  const getDirectionFromBearing = (bearing: number): string => {
    const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  };

  // Open in external navigation app
  const openInMaps = (school: any) => {
    const destination = `${school.latitude},${school.longitude}`;
    const appleMapsUrl = `maps://maps.apple.com/?daddr=${destination}`;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    
    // Try Apple Maps first (iOS), fall back to Google Maps
    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
      window.open(appleMapsUrl, '_system');
    } else {
      window.open(googleMapsUrl, '_blank');
    }
  };

  useEffect(() => {
    if (currentLocation && orderedSchools.length) {
      setDirections(generateDirections());
    }
  }, [currentLocation, orderedSchools]);

  if (!route) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Route Available</h3>
            <p className="text-gray-600">Please start a route from the Route tab to begin navigation.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orderedSchools.length) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Schools Found</h3>
            <p className="text-gray-600">No schools are assigned to this route yet. Contact your administrator.</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Route: {route.name}</p>
              <p>Debug: {JSON.stringify(route.schools || 'No schools property')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Route Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Route Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'America/New_York'
              })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Started Time:</span>
            <span className="font-medium">
              {activeSession?.startTime ? new Date(activeSession.startTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'America/New_York'
              }) : 'Not Started'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Schools:</span>
            <span className="font-medium">{orderedSchools.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Auto Navigation - Next School */}
      {nextSchool && (
        <Card className="border-green-500 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Target className="h-5 w-5 text-green-600" />
              🎯 Auto Navigation - Next School
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex-1">
                <h3 className="font-semibold text-xl text-green-800">{nextSchool.school.school?.name || nextSchool.school.name}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{nextSchool.school.school?.address || nextSchool.school.address}</span>
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                    Stop #{nextSchool.school.orderIndex || (nextSchool.index + 1)} of {orderedSchools.length}
                  </Badge>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Arrival: {nextSchool.school.estimatedArrivalTime || 'TBD'}
                  </span>
                </div>
              </div>
              <Button 
                onClick={() => openInMaps({
                  latitude: nextSchool.school.school?.latitude || nextSchool.school.latitude,
                  longitude: nextSchool.school.school?.longitude || nextSchool.school.longitude
                })}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Navigate
              </Button>
            </div>

            {currentLocation && (nextSchool.school.school?.latitude || nextSchool.school.latitude) && (
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm space-y-2 sm:space-y-0">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">
                      {calculateDistance(
                        currentLocation.latitude,
                        currentLocation.longitude,
                        parseFloat(nextSchool.school.school?.latitude || nextSchool.school.latitude),
                        parseFloat(nextSchool.school.school?.longitude || nextSchool.school.longitude)
                      ).toFixed(1)} miles
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">
                      ~{calculateTravelTime(calculateDistance(
                        currentLocation.latitude,
                        currentLocation.longitude,
                        parseFloat(nextSchool.school.school?.latitude || nextSchool.school.latitude),
                        parseFloat(nextSchool.school.school?.longitude || nextSchool.school.longitude)
                      ))} min
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Route Completion Message */}
      {!nextSchool && orderedSchools.length > 0 && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="p-6 text-center">
            <div className="text-green-600">
              <Target className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-green-800 mb-2">🎉 Route Complete!</h3>
              <p className="text-green-700">All students have been picked up from all schools. You can complete this route in the Route tab.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Route Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Complete Route
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {directions.map((direction, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-3 ${index === nextSchool?.index ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index === nextSchool?.index ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {direction.orderIndex}
                    </div>
                    <div>
                      <h4 className="font-medium">{direction.schoolName}</h4>
                      <p className="text-xs text-gray-600">{direction.address}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {direction.distance} mi • {direction.travelTime} min
                        </span>
                        <Badge variant={index === nextSchool?.index ? "default" : "secondary"} className="text-xs">
                          {direction.estimatedArrival}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInMaps(direction)}
                    >
                      <Navigation className="h-3 w-3" />
                    </Button>
                    {index < directions.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tips */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Navigation Tips
          </h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Schools are ordered by pickup time for maximum efficiency</p>
            <p>• Tap "Navigate" to open turn-by-turn directions in your preferred maps app</p>
            <p>• Arrival times are estimates - adjust for traffic conditions</p>
            <p>• Contact admin if school locations seem incorrect</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}