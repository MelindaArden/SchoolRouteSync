import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bus, Users, Clock, CheckCircle, XCircle, Fuel, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DriverWelcomeProps {
  user: User;
  onLogout: () => void;
  onProceedToRoute: () => void;
}

export default function DriverWelcome({ user, onLogout, onProceedToRoute }: DriverWelcomeProps) {
  const [gasLevel, setGasLevel] = useState<string>("");
  const [visualInspection, setVisualInspection] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch driver's routes
  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: [`/api/drivers/${user.id}/routes`],
  });

  // Fetch today's absences
  const { data: todaysAbsences = [] } = useQuery({
    queryKey: [`/api/student-absences/date/${new Date().toISOString().split('T')[0]}`],
  });

  // Submit safety checklist
  const submitChecklist = useMutation({
    mutationFn: async (data: { gasLevel: string; visualInspection: string }) => {
      return await apiRequest("POST", "/api/driver-safety-checklist", {
        driverId: user.id,
        gasLevel: data.gasLevel,
        visualInspection: data.visualInspection,
        date: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Safety Checklist Complete",
        description: "You can now proceed to start your route.",
      });
      // Wait a moment for notifications to be sent, then proceed
      setTimeout(() => {
        onProceedToRoute();
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit safety checklist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitChecklist = async () => {
    if (!gasLevel || !visualInspection) {
      toast({
        title: "Incomplete Checklist",
        description: "Please answer both safety questions before proceeding.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitChecklist.mutateAsync({ gasLevel, visualInspection });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (routesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentRoute = routes.length > 0 ? routes[0] : null;
  const totalSchools = currentRoute?.schools?.length || 0;
  const totalStudents = currentRoute?.totalStudents || 0;

  // Calculate estimated route time (5 minutes per school + 3 minutes per student)
  const estimatedMinutes = (totalSchools * 5) + (totalStudents * 3);
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const remainingMinutes = estimatedMinutes % 60;
  const estimatedTime = estimatedHours > 0 
    ? `${estimatedHours}h ${remainingMinutes}m` 
    : `${remainingMinutes}m`;

  // Filter absences for students on this route
  const routeStudentIds = currentRoute?.schools?.flatMap((school: any) => 
    school.students?.map((student: any) => student.id) || []
  ) || [];
  
  const absentStudents = todaysAbsences.filter((absence: any) => 
    routeStudentIds.includes(absence.studentId)
  );

  if (!currentRoute) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Bus className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">Route Runner</h1>
              </div>
              <Button onClick={onLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto pt-20 p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Route Assigned</h3>
              <p className="text-gray-600">
                You don't have any routes assigned yet. Please contact your administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canProceed = gasLevel && visualInspection;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Route Runner</h1>
            </div>
            <Button onClick={onLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Welcome Message */}
        <div className="text-center py-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.firstName}!
          </h2>
          <p className="text-gray-600">Complete your pre-route safety checklist to begin</p>
        </div>

        {/* Route Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bus className="h-5 w-5 mr-2 text-blue-600" />
              Route Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg text-gray-900 mb-2">
                  {currentRoute.name}
                </h3>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{totalStudents}</div>
                  <div className="text-sm text-gray-600">Students</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Bus className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{totalSchools}</div>
                  <div className="text-sm text-gray-600">Schools</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{estimatedTime}</div>
                  <div className="text-sm text-gray-600">Est. Time</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Absent Students */}
        {absentStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <XCircle className="h-5 w-5 mr-2 text-red-600" />
                Students Marked Absent Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {absentStudents.map((absence: any) => (
                  <div key={absence.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{absence.student?.name}</div>
                      <div className="text-sm text-gray-600">{absence.student?.school?.name}</div>
                    </div>
                    <Badge variant="destructive">Absent</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Safety Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-orange-600" />
              Pre-Route Safety Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Gas Level Question */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Fuel className="h-4 w-4 inline mr-2" />
                  1. Current gas level?
                </label>
                <Select value={gasLevel} onValueChange={setGasLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gas level..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full">Full</SelectItem>
                    <SelectItem value="3/4">3/4</SelectItem>
                    <SelectItem value="1/2">1/2</SelectItem>
                    <SelectItem value="1/4">1/4</SelectItem>
                  </SelectContent>
                </Select>
                {gasLevel === "1/4" && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="text-sm text-yellow-800">
                        Low fuel level will trigger admin notifications
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Inspection Question */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  2. Have you visually inspected the van ensuring it appears safe to drive?
                </label>
                <Select value={visualInspection} onValueChange={setVisualInspection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select inspection result..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
                {visualInspection === "No" && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-sm text-red-800">
                        Failed inspection will trigger admin notifications
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmitChecklist}
                disabled={!canProceed || isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting Checklist...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Checklist & Start Route
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}