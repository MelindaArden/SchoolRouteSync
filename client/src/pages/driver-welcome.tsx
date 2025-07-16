import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bus, Users, Clock, CheckCircle, XCircle, Fuel, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DriverWelcomeProps {
  user: User;
  onLogout: () => void;
  onProceedToRoute: () => void;
  hideHeader?: boolean;
}

export default function DriverWelcome({ user, onLogout, onProceedToRoute, hideHeader }: DriverWelcomeProps) {
  const [gasLevel, setGasLevel] = useState<string>("");
  const [visualInspection, setVisualInspection] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolsExpanded, setSchoolsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch driver's routes with detailed information
  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: [`/api/drivers/${user.id}/routes`],
  });

  // Fetch today's absences
  const { data: todaysAbsences = [] } = useQuery({
    queryKey: [`/api/student-absences/date/${new Date().toISOString().split('T')[0]}`],
  });

  // Get route overview data
  const primaryRoute = routes.length > 0 ? routes[0] : null;
  const totalSchools = primaryRoute?.schools?.length || 0;
  const totalStudents = primaryRoute?.schools?.reduce((sum: number, school: any) => 
    sum + (school.students?.length || 0), 0) || 0;
  
  // Calculate absent students for this route
  const absentStudentsInRoute = todaysAbsences.filter((absence: any) => 
    primaryRoute?.schools?.some((school: any) => 
      school.students?.some((student: any) => student.id === absence.studentId)
    )
  ).length;
  
  const presentStudents = totalStudents - absentStudentsInRoute;
  
  // Calculate estimated route time (5 minutes per school + travel time estimate)
  const estimatedRouteTime = totalSchools > 0 ? (totalSchools * 5) + (totalSchools * 3) : 0;
  
  // Check if user can proceed with checklist
  const canProceed = gasLevel && visualInspection;

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
      // Call the onProceedToRoute callback to navigate to route page
      onProceedToRoute();
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
      <div className={hideHeader ? "" : "min-h-screen bg-gray-50"}>
        {!hideHeader && (
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
        )}

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

  return (
    <div className={hideHeader ? "" : "min-h-screen bg-gray-50"}>
      {/* Header - only show if not hidden */}
      {!hideHeader && (
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
      )}

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
              Today's Route Overview - {currentRoute.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{totalStudents}</div>
                  <div className="text-sm text-gray-600">Total Students</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{totalStudents - absentStudents.length}</div>
                  <div className="text-sm text-gray-600">Present</div>
                </div>
                
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <XCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{absentStudents.length}</div>
                  <div className="text-sm text-gray-600">Absent</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{estimatedTime}</div>
                  <div className="text-sm text-gray-600">Est. Time</div>
                </div>
              </div>

              {/* Schools Details */}
              {currentRoute.schools && currentRoute.schools.length > 0 && (
                <Collapsible open={schoolsExpanded} onOpenChange={setSchoolsExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2">
                      <h4 className="font-medium text-gray-900 text-lg">Schools on Your Route ({currentRoute.schools.length})</h4>
                      {schoolsExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-3 mt-3">
                      {currentRoute.schools.map((school: any, index: number) => {
                    const schoolStudents = school.students || [];
                    const schoolAbsentCount = absentStudents.filter((absence: any) => 
                      schoolStudents.some((student: any) => student.id === absence.studentId)
                    ).length;
                    const schoolPresentCount = schoolStudents.length - schoolAbsentCount;
                    
                    return (
                      <div key={school.id} className="bg-gray-50 border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                              {index + 1}
                            </div>
                            <div>
                              <h5 className="font-semibold text-gray-900">{school.name}</h5>
                              <p className="text-sm text-gray-600">
                                📍 {school.address || 'Address not available'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="bg-blue-100 px-3 py-1 rounded-full">
                              <span className="text-sm font-medium text-blue-800">
                                Pickup: {school.dismissalTime}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="bg-green-100 p-2 rounded">
                            <div className="text-lg font-bold text-green-700">{schoolPresentCount}</div>
                            <div className="text-xs text-green-600">Present</div>
                          </div>
                          <div className="bg-yellow-100 p-2 rounded">
                            <div className="text-lg font-bold text-yellow-700">{schoolAbsentCount}</div>
                            <div className="text-xs text-yellow-600">Absent</div>
                          </div>
                          <div className="bg-blue-100 p-2 rounded">
                            <div className="text-lg font-bold text-blue-700">{schoolStudents.length}</div>
                            <div className="text-xs text-blue-600">Total</div>
                          </div>
                        </div>

                        {/* Student Names Preview */}
                        {schoolStudents.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Students to pickup:</p>
                            <div className="flex flex-wrap gap-1">
                              {schoolStudents.slice(0, 3).map((student: any) => (
                                <span key={student.id} className="text-xs bg-white px-2 py-1 rounded border text-gray-700">
                                  {student.first_name} {student.last_name}
                                </span>
                              ))}
                              {schoolStudents.length > 3 && (
                                <span className="text-xs text-gray-500 px-2 py-1">
                                  +{schoolStudents.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
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