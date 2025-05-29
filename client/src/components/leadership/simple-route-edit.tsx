import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Trash2 } from "lucide-react";

interface SimpleRouteEditProps {
  route: any;
  onClose: () => void;
}

export default function SimpleRouteEdit({ route, onClose }: SimpleRouteEditProps) {
  const [name, setName] = useState(route?.name || "");
  const [driverId, setDriverId] = useState(route?.driverId?.toString() || "0");
  const [isActive, setIsActive] = useState(route?.isActive ?? true);
  const [selectedSchools, setSelectedSchools] = useState<number[]>(
    route?.schools?.map((s: any) => s.schoolId) || []
  );
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Update route mutation
  const updateRouteMutation = useMutation({
    mutationFn: async () => {
      const routeData = {
        name,
        driverId: driverId === "0" ? null : parseInt(driverId),
        isActive,
      };

      await apiRequest(`/api/routes/${route.id}`, "PATCH", routeData);

      // Update schools if changed
      if (JSON.stringify(selectedSchools.sort()) !== JSON.stringify((route?.schools?.map((s: any) => s.schoolId) || []).sort())) {
        await apiRequest(`/api/routes/${route.id}/schools`, "DELETE");

        for (let i = 0; i < selectedSchools.length; i++) {
          await apiRequest(`/api/routes/${route.id}/schools`, "POST", {
            schoolId: selectedSchools[i],
            order: i + 1,
            estimatedArrivalTime: "15:30",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "Route Updated",
        description: "Route has been updated successfully.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update route. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete route mutation
  const deleteRouteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/routes/${route.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      toast({
        title: "Route Deleted",
        description: "Route has been deleted successfully.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete route. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRouteMutation.mutate();
  };

  const handleDeleteRoute = () => {
    if (confirm("Are you sure you want to delete this route? This action cannot be undone.")) {
      deleteRouteMutation.mutate();
    }
  };

  const drivers = users.filter((user: any) => user.role === 'driver');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Edit Route: {route?.name}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="routeName">Route Name</Label>
            <Input
              id="routeName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter route name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver">Assigned Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No driver assigned</SelectItem>
                {drivers.map((driver: any) => (
                  <SelectItem key={driver.id} value={driver.id.toString()}>
                    {driver.firstName} {driver.lastName} ({driver.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked as boolean)}
            />
            <Label htmlFor="isActive">Active Route</Label>
          </div>

          <div className="space-y-3">
            <Label>Assigned Schools</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {schools.map((school: any) => {
                const studentCount = students.filter((s: any) => s.schoolId === school.id).length;
                return (
                  <div key={school.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      checked={selectedSchools.includes(school.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSchools([...selectedSchools, school.id]);
                        } else {
                          setSelectedSchools(selectedSchools.filter(id => id !== school.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{school.name}</p>
                      <p className="text-sm text-gray-600">
                        {school.address} • {studentCount} students • Dismissal: {school.dismissalTime}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteRoute}
              disabled={deleteRouteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Route
            </Button>
            
            <div className="space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateRouteMutation.isPending}
              >
                {updateRouteMutation.isPending ? "Updating..." : "Update Route"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}