import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { School, Users, MapPin, Clock, AlertTriangle, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function UnassignedSchools() {
  const [draggedSchool, setDraggedSchool] = useState<any>(null);
  const [dragOverRoute, setDragOverRoute] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
  });

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['/api/routes'],
  });

  const { data: routeSchools = [] } = useQuery({
    queryKey: ['/api/route-schools'],
  });

  // Get schools that are not assigned to any route
  const getUnassignedSchools = () => {
    const assignedSchoolIds = new Set(routeSchools.map((rs: any) => rs.schoolId));
    return schools.filter((school: any) => !assignedSchoolIds.has(school.id));
  };

  // Get student count for a school
  const getStudentCount = (schoolId: number) => {
    return students.filter((student: any) => student.schoolId === schoolId).length;
  };

  // Get schools with active students only
  const getUnassignedSchoolsWithStudents = () => {
    return getUnassignedSchools().filter((school: any) => getStudentCount(school.id) > 0);
  };

  // Add school to route mutation
  const addSchoolToRouteMutation = useMutation({
    mutationFn: async ({ routeId, schoolId }: { routeId: number; schoolId: number }) => {
      return apiRequest('POST', `/api/routes/${routeId}/schools`, {
        schoolId,
        estimatedArrivalTime: "15:25", // Default arrival time
        alertThresholdMinutes: 10
      });
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Success", 
        description: `School added to route and automatically optimized for efficient pickup order. ${data.studentsAssigned || 0} students assigned.`,
        duration: 5000
      });
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/route-schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/routes/with-schools'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add school to route", 
        variant: "destructive" 
      });
    }
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, school: any) => {
    setDraggedSchool(school);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', school.id.toString());
  };

  const handleDragOver = (e: React.DragEvent, routeId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRoute(routeId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverRoute(null);
    }
  };

  const handleDrop = (e: React.DragEvent, routeId: number) => {
    e.preventDefault();
    setDragOverRoute(null);
    
    if (draggedSchool) {
      addSchoolToRouteMutation.mutate({
        routeId,
        schoolId: draggedSchool.id
      });
    }
    setDraggedSchool(null);
  };

  const handleDragEnd = () => {
    setDraggedSchool(null);
    setDragOverRoute(null);
  };

  const unassignedSchools = getUnassignedSchoolsWithStudents();

  if (unassignedSchools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Unassigned Schools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">All schools with active students are assigned to routes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Unassigned Schools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Unassigned Schools ({unassignedSchools.length})
            </div>
            <Badge variant="outline" className="bg-orange-50 text-orange-600">
              Drag to assign
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {unassignedSchools.map((school: any) => {
              const studentCount = getStudentCount(school.id);
              return (
                <div
                  key={school.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, school)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 border rounded-lg cursor-move hover:shadow-md transition-all ${
                    draggedSchool?.id === school.id 
                      ? 'border-blue-500 bg-blue-50 opacity-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-800">{school.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {school.address}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {school.dismissalTime || '15:00'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {studentCount} student{studentCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-red-50 text-red-600">
                      Unassigned
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Drop Zones - Current Routes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Drop Zones - Current Routes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {routes.map((route: any) => (
              <div
                key={route.id}
                onDragOver={(e) => handleDragOver(e, route.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, route.id)}
                className={`p-4 border-2 border-dashed rounded-lg transition-all ${
                  dragOverRoute === route.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-800">{route.name}</h4>
                    <p className="text-sm text-gray-600">
                      Driver: {route.driverId ? `Driver #${route.driverId}` : 'Unassigned'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {dragOverRoute === route.id ? '⬇️ Drop here' : '📍 Drop zone'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {routes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">No routes available. Create a route first.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}