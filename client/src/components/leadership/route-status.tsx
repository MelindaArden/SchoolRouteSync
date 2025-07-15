import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RouteStatusProps {
  routeName: string;
  driverName: string;
  status: string;
  progress: number;
  currentLocation: string;
  studentsPickedUp: number;
  totalStudents: number;
  sessionId?: number;
  canForceComplete?: boolean;
}

export default function RouteStatus({
  routeName,
  driverName,
  status,
  progress,
  currentLocation,
  studentsPickedUp,
  totalStudents,
  sessionId,
  canForceComplete = false
}: RouteStatusProps) {
  const getStatusConfig = (status: string, progress: number) => {
    if (status === "completed") {
      return { label: "Complete", className: "bg-green-600" };
    }
    if (status === "in_progress") {
      if (progress >= 80) return { label: "On Time", className: "bg-green-600" };
      if (progress >= 50) return { label: "In Progress", className: "bg-blue-600" };
      return { label: "Behind", className: "bg-red-600" };
    }
    return { label: "Pending", className: "bg-gray-400" };
  };

  const statusConfig = getStatusConfig(status, progress);
  const initials = driverName.split(' ').map(n => n[0]).join('').toUpperCase();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Admin force completion mutation
  const forceCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("Session ID required");
      return apiRequest("POST", `/api/pickup-sessions/${sessionId}/complete`, {
        notes: "Route force completed by admin"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pickup-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pickup-sessions/today'] });
      toast({
        title: "Route Completed",
        description: `${routeName} has been force completed successfully`,
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Force Completion Failed",
        description: error instanceof Error ? error.message : "Failed to force complete route",
        variant: "destructive"
      });
    }
  });

  const handleForceComplete = () => {
    if (window.confirm(`Are you sure you want to force complete "${routeName}" for ${driverName}? This action cannot be undone.`)) {
      forceCompleteMutation.mutate();
    }
  };

  return (
    <Card className="shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-white text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-800">{routeName}</p>
              <p className="text-sm text-gray-600">{driverName}</p>
            </div>
          </div>
          <div className="text-right">
            <Badge className={`${statusConfig.className} text-white mb-1`}>
              {statusConfig.label}
            </Badge>
            <p className="text-xs text-gray-500">
              {studentsPickedUp}/{totalStudents} picked up
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3">{currentLocation}</p>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              status === "completed" ? "bg-green-600" :
              progress >= 50 ? "bg-blue-600" : "bg-red-600"
            }`}
            style={{ width: `${Math.max(progress, 0)}%` }}
          />
        </div>

        {canForceComplete && status === "in_progress" && sessionId && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Admin Controls</span>
            </div>
            <Button
              onClick={handleForceComplete}
              disabled={forceCompleteMutation.isPending}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              {forceCompleteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Force Complete
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
