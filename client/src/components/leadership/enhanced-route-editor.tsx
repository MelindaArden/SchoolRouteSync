import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Save, X, MapPin, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RouteEditorProps {
  route: any;
  onSave: (route: any) => void;
  onCancel: () => void;
}

interface RoutePoint {
  id: string;
  type: 'start' | 'school' | 'end';
  name: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  orderIndex: number;
  studentCount?: number;
  dismissalTime?: string;
  estimatedArrivalTime?: string;
}

// FIX #2: ROUTE EDITING CAPABILITIES BEFORE FINALIZING
export default function EnhancedRouteEditor({ route, onSave, onCancel }: RouteEditorProps) {
  const { toast } = useToast();
  
  // FIX #4: STARTING AND ENDING POINTS
  const [startingPoint, setStartingPoint] = useState({
    name: route.startingPoint?.name || "Driver Home Base",
    address: route.startingPoint?.address || "",
    latitude: route.startingPoint?.latitude || "",
    longitude: route.startingPoint?.longitude || ""
  });
  
  const [endingPoint, setEndingPoint] = useState({
    name: route.endingPoint?.name || "Return Location", 
    address: route.endingPoint?.address || "",
    latitude: route.endingPoint?.latitude || "",
    longitude: route.endingPoint?.longitude || ""
  });
  
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>(() => {
    const points: RoutePoint[] = [];
    
    // Starting point
    points.push({
      id: 'start',
      type: 'start',
      name: startingPoint.name,
      address: startingPoint.address,
      orderIndex: 0
    });
    
    // School points
    route.schools?.forEach((school: any, index: number) => {
      points.push({
        id: `school-${school.id}`,
        type: 'school',
        name: school.name,
        address: school.address,
        latitude: school.latitude,
        longitude: school.longitude,
        orderIndex: index + 1,
        studentCount: school.studentCount,
        dismissalTime: school.dismissalTime,
        estimatedArrivalTime: school.estimatedArrivalTime
      });
    });
    
    // Ending point
    points.push({
      id: 'end',
      type: 'end',
      name: endingPoint.name,
      address: endingPoint.address,
      orderIndex: (route.schools?.length || 0) + 1
    });
    
    return points;
  });

  const movePointUp = (index: number) => {
    if (index <= 1) return; // Can't move start point or first school
    
    const newPoints = [...routePoints];
    [newPoints[index], newPoints[index - 1]] = [newPoints[index - 1], newPoints[index]];
    
    // Update order indices
    newPoints.forEach((point, idx) => {
      point.orderIndex = idx;
    });
    
    setRoutePoints(newPoints);
  };

  const movePointDown = (index: number) => {
    if (index >= routePoints.length - 2) return; // Can't move end point or last school
    
    const newPoints = [...routePoints];
    [newPoints[index], newPoints[index + 1]] = [newPoints[index + 1], newPoints[index]];
    
    // Update order indices
    newPoints.forEach((point, idx) => {
      point.orderIndex = idx;
    });
    
    setRoutePoints(newPoints);
  };

  const handleSave = () => {
    const editedRoute = {
      ...route,
      startingPoint,
      endingPoint,
      schools: routePoints
        .filter(p => p.type === 'school')
        .map((p, index) => ({
          id: parseInt(p.id.replace('school-', '')),
          name: p.name,
          address: p.address,
          latitude: p.latitude,
          longitude: p.longitude,
          orderIndex: index,
          studentCount: p.studentCount,
          dismissalTime: p.dismissalTime,
          estimatedArrivalTime: p.estimatedArrivalTime
        }))
    };
    
    onSave(editedRoute);
    toast({
      title: "Route Updated",
      description: "Route has been successfully edited with starting/ending points and reordered schools."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit Route: {route.driverName}</h3>
        <div className="space-x-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* FIX #4: STARTING AND ENDING POINTS INPUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Starting Point</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="start-name">Location Name</Label>
              <Input
                id="start-name"
                value={startingPoint.name}
                onChange={(e) => setStartingPoint(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Driver Home Base"
              />
            </div>
            <div>
              <Label htmlFor="start-address">Address</Label>
              <Input
                id="start-address"
                value={startingPoint.address}
                onChange={(e) => setStartingPoint(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter starting address"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ending Point</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="end-name">Location Name</Label>
              <Input
                id="end-name"
                value={endingPoint.name}
                onChange={(e) => setEndingPoint(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., School District Office"
              />
            </div>
            <div>
              <Label htmlFor="end-address">Address</Label>
              <Input
                id="end-address"
                value={endingPoint.address}
                onChange={(e) => setEndingPoint(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter ending address"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Order Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Route Sequence (Drag to Reorder)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {routePoints.map((point, index) => (
              <div 
                key={point.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  point.type === 'start' ? 'bg-green-50 border-green-200' :
                  point.type === 'end' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Badge variant={point.type === 'start' ? 'default' : point.type === 'end' ? 'secondary' : 'outline'}>
                    {index + 1}
                  </Badge>
                  
                  <div>
                    <p className="font-medium">{point.name}</p>
                    {point.address && <p className="text-sm text-gray-600">{point.address}</p>}
                    {point.studentCount && (
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {point.studentCount} students
                        </span>
                        {point.dismissalTime && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {point.dismissalTime}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {point.type === 'school' && (
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePointUp(index)}
                      disabled={index <= 1}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePointDown(index)}
                      disabled={index >= routePoints.length - 2}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}