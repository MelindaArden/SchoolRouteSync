import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, X } from "lucide-react";

interface RouteFormProps {
  onClose: () => void;
}

export default function RouteForm({ onClose }: RouteFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    driverId: "",
  });
  const [selectedSchools, setSelectedSchools] = useState<Array<{
    schoolId: number;
    estimatedArrivalTime: string;
    orderIndex: number;
  }>>([]);
  const [selectedStudents, setSelectedStudents] = useState<Array<{
    studentId: number;
    schoolId: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch drivers, schools, and students
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

  const addSchool = () => {
    setSelectedSchools([
      ...selectedSchools,
      {
        schoolId: 0,
        estimatedArrivalTime: "",
        orderIndex: selectedSchools.length + 1,
      },
    ]);
  };

  // Calculate estimated arrival time (5 minutes before dismissal)
  const calculateEstimatedArrival = (schoolId: number): string => {
    const school = schools.find((s: any) => s.id === schoolId);
    if (!school?.dismissalTime) return "";
    
    const [hours, minutes] = school.dismissalTime.split(':').map(Number);
    const dismissalDate = new Date();
    dismissalDate.setHours(hours, minutes, 0, 0);
    
    // Subtract 5 minutes
    const estimatedDate = new Date(dismissalDate.getTime() - 5 * 60 * 1000);
    
    return `${estimatedDate.getHours().toString().padStart(2, '0')}:${estimatedDate.getMinutes().toString().padStart(2, '0')}`;
  };

  const removeSchool = (index: number) => {
    const newSchools = selectedSchools.filter((_, i) => i !== index);
    // Update order indices
    const updatedSchools = newSchools.map((school, i) => ({
      ...school,
      orderIndex: i + 1,
    }));
    setSelectedSchools(updatedSchools);
    
    // Remove students from removed school
    const removedSchoolId = selectedSchools[index].schoolId;
    setSelectedStudents(selectedStudents.filter(s => s.schoolId !== removedSchoolId));
  };

  const updateSchool = (index: number, field: string, value: any) => {
    const updated = [...selectedSchools];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate estimated arrival time when school is selected
    if (field === 'schoolId' && value) {
      const estimatedTime = calculateEstimatedArrival(parseInt(value));
      updated[index].estimatedArrivalTime = estimatedTime;
    }
    
    setSelectedSchools(updated);
  };

  const toggleStudent = (studentId: number, schoolId: number) => {
    const exists = selectedStudents.find(s => s.studentId === studentId);
    if (exists) {
      setSelectedStudents(selectedStudents.filter(s => s.studentId !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, { studentId, schoolId }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create route with enhanced error handling
      const routeData = {
        name: formData.name,
        driverId: parseInt(formData.driverId),
        isActive: true,
      };

      // FIX #1: ENHANCED ROUTE CREATION ERROR HANDLING
      console.log('Creating route with data:', routeData);
      const newRoute = await apiRequest("POST", "/api/routes", routeData);
      console.log('Route created successfully:', newRoute);

      if (!newRoute || !newRoute.id) {
        throw new Error('Route creation failed - no route ID returned');
      }

      // Add schools to route with enhanced validation
      for (let i = 0; i < selectedSchools.length; i++) {
        const school = selectedSchools[i];
        if (school.schoolId > 0) {
          console.log(`Adding school ${i + 1}/${selectedSchools.length}:`, school);
          const schoolData = {
            schoolId: school.schoolId,
            orderIndex: school.orderIndex,
            estimatedArrivalTime: school.estimatedArrivalTime || calculateEstimatedArrival(school.schoolId),
            alertThresholdMinutes: 10, // Default 10 minutes alert threshold
          };
          
          console.log('Adding school to route:', schoolData);
          await apiRequest("POST", `/api/routes/${newRoute.id}/schools`, schoolData);
        }
      }

      // Create route assignments for selected students
      for (const student of selectedStudents) {
        const assignmentData = {
          routeId: newRoute.id,
          studentId: student.studentId,
          schoolId: student.schoolId,
          isActive: true,
        };
        
        console.log('Creating route assignment:', assignmentData);
        await apiRequest("POST", "/api/routes/assignments", assignmentData);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      
      toast({
        title: "Success",
        description: "Route created successfully with automatic arrival times",
      });
      
      onClose();
    } catch (error) {
      console.error("Route creation error:", error);
      toast({
        title: "Error",
        description: `Failed to create route: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Route</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Route Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Route A - North Side"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver">Assign Driver</Label>
              <Select value={formData.driverId} onValueChange={(value) => setFormData({ ...formData, driverId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver: any) => (
                    <SelectItem key={driver.id} value={driver.id.toString()}>
                      {driver.firstName} {driver.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Schools & Pickup Order</Label>
              <Button type="button" onClick={addSchool} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add School
              </Button>
            </div>

            {selectedSchools.map((school, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Stop #{school.orderIndex}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSchool(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>School</Label>
                    <Select
                      value={school.schoolId.toString()}
                      onValueChange={(value) => updateSchool(index, 'schoolId', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Estimated Arrival Time</Label>
                    <Input
                      type="time"
                      value={school.estimatedArrivalTime}
                      onChange={(e) => updateSchool(index, 'estimatedArrivalTime', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {school.schoolId > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Students at this school:</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {students
                        .filter((student: any) => student.schoolId === school.schoolId)
                        .map((student: any) => (
                          <div key={student.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`student-${student.id}`}
                              checked={selectedStudents.some(s => s.studentId === student.id)}
                              onCheckedChange={() => toggleStudent(student.id, school.schoolId)}
                            />
                            <Label htmlFor={`student-${student.id}`} className="text-sm">
                              {student.firstName} {student.lastName} ({student.grade})
                            </Label>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Route"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}