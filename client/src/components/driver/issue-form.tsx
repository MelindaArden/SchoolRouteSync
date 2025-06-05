import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, Wrench, X } from "lucide-react";

const issueFormSchema = z.object({
  type: z.enum(["issue", "maintenance"]),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

type IssueFormData = z.infer<typeof issueFormSchema>;

interface IssueFormProps {
  driverId: number;
  issueType: "issue" | "maintenance";
  onClose: () => void;
}

export default function IssueForm({ driverId, issueType, onClose }: IssueFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<IssueFormData>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      type: issueType,
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const onSubmit = async (data: IssueFormData) => {
    setIsSubmitting(true);
    
    try {
      await apiRequest("POST", "/api/issues", {
        ...data,
        driverId,
      });

      toast({
        title: "Report Submitted",
        description: `Your ${issueType} report has been submitted and admins have been notified.`,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to submit ${issueType} report. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMaintenanceReport = issueType === "maintenance";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isMaintenanceReport ? (
                <Wrench className="h-5 w-5 text-orange-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <CardTitle className="text-lg">
                {isMaintenanceReport ? "Van Maintenance Request" : "Report Issue"}
              </CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isMaintenanceReport ? "Maintenance Issue" : "Issue Title"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={
                          isMaintenanceReport 
                            ? "e.g., Brake pads need replacement" 
                            : "e.g., Student safety concern"
                        }
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low - Can wait</SelectItem>
                        <SelectItem value="medium">Medium - Normal priority</SelectItem>
                        <SelectItem value="high">High - Needs attention soon</SelectItem>
                        <SelectItem value="urgent">Urgent - Immediate attention required</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={
                          isMaintenanceReport
                            ? "Describe the maintenance issue in detail. Include any symptoms, when you noticed it, and any safety concerns..."
                            : "Describe the issue in detail. Include when it happened, who was involved, and any safety concerns..."
                        }
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 ${
                    isMaintenanceReport 
                      ? "bg-orange-600 hover:bg-orange-700" 
                      : "bg-red-600 hover:bg-red-700"
                  } text-white`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}