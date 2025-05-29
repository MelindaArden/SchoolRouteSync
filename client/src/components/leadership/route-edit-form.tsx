import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Plus, Trash2 } from "lucide-react";

const routeEditSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  driverId: z.number().optional(),
  isActive: z.boolean(),
});

interface RouteEditFormProps {
  route: any;
  onClose: () => void;
}

export default function RouteEditForm({ route, onClose }: RouteEditFormProps) {
  const [selectedSchools, setSelectedSchools] = useState<number[]>(
    route.schools?.map((s: any) => s.schoolId) || []
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

  const form = useForm({
    resolver: zodResolver(routeEditSchema),
    defaultValues: {
      name: route.name || "",
      driverId: route.driverId || undefined,
      isActive: route.isActive ?? true,
    },
  });

  // Update route mutation
  const updateRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/routes/${route.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
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

  // Update route schools mutation
  const updateSchoolsMutation = useMutation({
    mutationFn: async (schoolIds: number[]) => {
      // First delete existing route schools
      await apiRequest(`/api/routes/${route.id}/schools`, {
        method: "DELETE",
      });

      // Then add new ones
      for (let i = 0; i < schoolIds.length; i++) {
        await apiRequest(`/api/routes/${route.id}/schools`, {
          method: "POST",
          body: JSON.stringify({
            schoolId: schoolIds[i],
            order: i + 1,
            estimatedArrivalTime: "15:30", // Default time
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
    },
  });

  // Delete route mutation
  const deleteRouteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/routes/${route.id}`, {
        method: "DELETE",
      });
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

  const onSubmit = async (data: any) => {
    try {
      // Update route basic info
      await updateRouteMutation.mutateAsync(data);
      
      // Update school assignments
      await updateSchoolsMutation.mutateAsync(selectedSchools);
    } catch (error) {
      // Error handling is done in mutations
    }
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
          <CardTitle>Edit Route: {route.name}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter route name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Driver</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No driver assigned</SelectItem>
                      {drivers.map((driver: any) => (
                        <SelectItem key={driver.id} value={driver.id.toString()}>
                          {driver.firstName} {driver.lastName} ({driver.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active Route</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Assigned Schools</FormLabel>
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
                  disabled={updateRouteMutation.isPending || updateSchoolsMutation.isPending}
                >
                  {updateRouteMutation.isPending || updateSchoolsMutation.isPending ? "Updating..." : "Update Route"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}