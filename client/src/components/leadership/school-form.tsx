import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, MapPin, Loader2 } from "lucide-react";

const schoolSchema = z.object({
  name: z.string().min(1, "School name is required"),
  address: z.string().min(1, "Address is required"),
  dismissalTime: z.string().min(1, "Dismissal time is required"),
  contactPhone: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

interface SchoolFormProps {
  onClose: () => void;
  school?: any; // For editing existing schools
}

export default function SchoolForm({ onClose, school }: SchoolFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!school;
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<string>("");

  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: school?.name || "",
      address: school?.address || "",
      dismissalTime: school?.dismissalTime || "",
      contactPhone: school?.contactPhone || "",
      latitude: school?.latitude || "",
      longitude: school?.longitude || "",
    },
  });

  const createSchoolMutation = useMutation({
    mutationFn: async (data: SchoolFormData) => {
      return apiRequest("POST", "/api/schools", data);
    },
    onSuccess: () => {
      toast({
        title: "School Created",
        description: "School has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create school. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSchoolMutation = useMutation({
    mutationFn: async (data: SchoolFormData) => {
      return apiRequest("PATCH", `/api/schools/${school.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "School Updated",
        description: "School has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update school. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Geocoding function
  const geocodeAddress = async (address: string) => {
    if (!address || address.trim().length < 10) return;
    
    setIsGeocoding(true);
    setGeocodeStatus("Looking up GPS coordinates...");
    
    try {
      const response = await apiRequest("POST", "/api/geocode", { address });
      
      if (response.success) {
        form.setValue("latitude", response.latitude);
        form.setValue("longitude", response.longitude);
        setGeocodeStatus(`✓ GPS coordinates found: ${response.latitude}, ${response.longitude}`);
        
        toast({
          title: "Address Geocoded",
          description: "GPS coordinates automatically found for this address!",
        });
      } else {
        setGeocodeStatus("Could not find GPS coordinates for this address");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setGeocodeStatus("Error finding GPS coordinates");
    } finally {
      setIsGeocoding(false);
      // Clear status after 3 seconds
      setTimeout(() => setGeocodeStatus(""), 3000);
    }
  };

  // Watch address field and auto-geocode
  const watchedAddress = form.watch("address");
  useEffect(() => {
    const delayTimeout = setTimeout(() => {
      if (watchedAddress && watchedAddress.trim().length > 10 && !isEditing) {
        // Only auto-geocode for new schools, not when editing
        geocodeAddress(watchedAddress);
      }
    }, 2000); // Wait 2 seconds after user stops typing

    return () => clearTimeout(delayTimeout);
  }, [watchedAddress, isEditing]);

  const onSubmit = (data: SchoolFormData) => {
    if (isEditing) {
      updateSchoolMutation.mutate(data);
    } else {
      createSchoolMutation.mutate(data);
    }
  };

  const isPending = createSchoolMutation.isPending || updateSchoolMutation.isPending;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{isEditing ? "Edit School" : "Add New School"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update school information" : "Enter details for the new school"}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Elementary School Name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input {...field} placeholder="123 School Street, City, State" />
                      {geocodeStatus && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {isGeocoding && <Loader2 className="h-4 w-4 animate-spin" />}
                          <MapPin className="h-4 w-4" />
                          <span>{geocodeStatus}</span>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => geocodeAddress(field.value)}
                        disabled={!field.value || field.value.length < 10 || isGeocoding}
                      >
                        {isGeocoding ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Finding GPS...
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4 mr-2" />
                            Find GPS Coordinates
                          </>
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dismissalTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dismissal Time</FormLabel>
                  <FormControl>
                    <Input {...field} type="time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(555) 123-4567" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude (Auto-populated)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Auto-filled from address" 
                        className={field.value ? "bg-green-50 border-green-200" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude (Auto-populated)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Auto-filled from address" 
                        className={field.value ? "bg-green-50 border-green-200" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {form.watch("latitude") && form.watch("longitude") && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">
                  ✓ GPS coordinates ready for route planning and navigation
                </span>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? "Saving..." : isEditing ? "Update School" : "Add School"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}