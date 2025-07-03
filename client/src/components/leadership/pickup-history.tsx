import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, User, Route as RouteIcon, Calendar, CheckCircle, XCircle, Search, Eye, Download, ChevronDown, CheckSquare, UserX } from "lucide-react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PickupHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const toggleRouteExpansion = (routeId: number) => {
    setExpandedRoutes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(routeId)) {
        newSet.delete(routeId);
      } else {
        newSet.add(routeId);
      }
      return newSet;
    });
  };

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['/api/pickup-history'],
  }) as { data: any[], isLoading: boolean };

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['/api/pickup-sessions/today'],
    refetchInterval: 30000,
  }) as { data: any[], isLoading: boolean };

  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
  }) as { data: any[], isLoading: boolean };

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
  }) as { data: any[], isLoading: boolean };

  // Admin action mutations
  const completeRouteMutation = useMutation({
    mutationFn: (data: { sessionId: number; notes?: string }) =>
      apiRequest('POST', `/api/admin/routes/${data.sessionId}/complete`, data),
    onSuccess: () => {
      toast({ title: "Route marked complete", description: "The route has been successfully completed." });
      queryClient.invalidateQueries({ queryKey: ['/api/pickup-sessions/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pickup-history'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark route complete.", variant: "destructive" });
    }
  });

  const markAbsentMutation = useMutation({
    mutationFn: (data: { studentId: number; sessionId: number; reason?: string }) =>
      apiRequest('POST', `/api/admin/students/${data.studentId}/absent`, data),
    onSuccess: () => {
      toast({ title: "Student marked absent", description: "The student has been marked as absent." });
      queryClient.invalidateQueries({ queryKey: ['/api/pickup-sessions/today'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark student absent.", variant: "destructive" });
    }
  });



  const filteredHistory = history.filter((record: any) =>
    record.driver?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.driver?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.route?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (date: string | Date) => {
    return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
  };

  // Route breakdown component to show students by school
  const RouteBreakdownSection = ({ record, schools, students }: any) => {
    let pickupDetails = [];
    try {
      pickupDetails = record.pickupDetails ? JSON.parse(record.pickupDetails) : [];
    } catch (e) {
      console.error('Error parsing pickup details:', e);
    }

    // Group students by school
    const studentsBySchool = pickupDetails.reduce((acc: any, pickup: any) => {
      const student = students.find((s: any) => s.id === pickup.studentId);
      const school = schools.find((s: any) => s.id === student?.schoolId);
      const schoolName = school?.name || `School ${student?.schoolId}`;
      
      if (!acc[schoolName]) {
        acc[schoolName] = {
          pickedUp: [],
          notPickedUp: []
        };
      }
      
      if (pickup.status === 'picked_up') {
        acc[schoolName].pickedUp.push({ ...pickup, student });
      } else {
        acc[schoolName].notPickedUp.push({ ...pickup, student });
      }
      
      return acc;
    }, {});

    return (
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-gray-800">Student Pickup Details by School</h4>
        {Object.entries(studentsBySchool).map(([schoolName, schoolData]: [string, any]) => (
          <div key={schoolName} className="border rounded-lg p-3 bg-gray-50">
            <h5 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
              <span>{schoolName}</span>
              <Badge variant="outline" className="text-xs">
                {schoolData.pickedUp.length + schoolData.notPickedUp.length} students
              </Badge>
            </h5>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Picked Up Students */}
              <div>
                <h6 className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Picked Up ({schoolData.pickedUp.length})
                </h6>
                <div className="space-y-1">
                  {schoolData.pickedUp.map((pickup: any, idx: number) => (
                    <div key={idx} className="text-xs bg-green-50 border border-green-200 rounded p-2">
                      <p className="font-medium">{pickup.student?.firstName} {pickup.student?.lastName}</p>
                      {pickup.pickedUpAt && (
                        <p className="text-green-600">{formatTime(pickup.pickedUpAt)}</p>
                      )}
                      {pickup.driverNotes && (
                        <p className="text-gray-600 italic">"{pickup.driverNotes}"</p>
                      )}
                    </div>
                  ))}
                  {schoolData.pickedUp.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No students picked up</p>
                  )}
                </div>
              </div>
              
              {/* Not Picked Up Students */}
              <div>
                <h6 className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Picked Up ({schoolData.notPickedUp.length})
                </h6>
                <div className="space-y-1">
                  {schoolData.notPickedUp.map((pickup: any, idx: number) => (
                    <div key={idx} className="text-xs bg-red-50 border border-red-200 rounded p-2">
                      <p className="font-medium">{pickup.student?.firstName} {pickup.student?.lastName}</p>
                      <p className="text-red-600 capitalize">{pickup.status.replace('_', ' ')}</p>
                      {pickup.driverNotes && (
                        <p className="text-gray-600 italic">"{pickup.driverNotes}"</p>
                      )}
                    </div>
                  ))}
                  {schoolData.notPickedUp.length === 0 && (
                    <p className="text-xs text-gray-500 italic">All students picked up</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {Object.keys(studentsBySchool).length === 0 && (
          <p className="text-sm text-gray-500 italic">No pickup details available</p>
        )}
        
        {record.notes && (
          <div className="border-t pt-3">
            <h6 className="text-xs font-medium text-gray-700 mb-1">Route Notes:</h6>
            <p className="text-sm text-gray-600">{record.notes}</p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (selectedRecord) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Pickup Details</h2>
          <Button variant="outline" onClick={() => setSelectedRecord(null)}>
            Back to History
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RouteIcon className="h-5 w-5" />
              {selectedRecord.route?.name} - {formatTime(selectedRecord.completedAt)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Driver</p>
                <p className="font-medium">{selectedRecord.driver?.firstName} {selectedRecord.driver?.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-medium">{selectedRecord.date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Students Picked Up</p>
                <p className="font-medium">{selectedRecord.studentsPickedUp} / {selectedRecord.totalStudents}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="font-medium">{Math.round((selectedRecord.studentsPickedUp / selectedRecord.totalStudents) * 100)}%</p>
              </div>
            </div>

            {selectedRecord.notes && (
              <div>
                <p className="text-sm text-gray-600">Notes</p>
                <p className="font-medium">{selectedRecord.notes}</p>
              </div>
            )}

            <RouteBreakdownSection 
              record={selectedRecord} 
              schools={schools} 
              students={students} 
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate summary statistics
  const totalCompletedRoutes = history.length;
  const totalStudentsPickedUp = history.reduce((sum: number, record: any) => sum + record.studentsPickedUp, 0);
  const totalStudentsAssigned = history.reduce((sum: number, record: any) => sum + record.totalStudents, 0);
  const averageCompletionRate = totalStudentsAssigned > 0 ? Math.round((totalStudentsPickedUp / totalStudentsAssigned) * 100) : 0;
  
  // Get recent activity (last 7 days)
  const recentHistory = history.filter((record: any) => {
    const recordDate = new Date(record.completedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return recordDate >= weekAgo;
  });

  // Export function for CSV download
  const exportToCSV = () => {
    const csvData = history.map((record: any) => ({
      Date: record.date,
      Driver: `${record.driver?.firstName} ${record.driver?.lastName}`,
      Route: record.route?.name || `Route ${record.routeId}`,
      'Completed At': formatTime(record.completedAt),
      'Students Picked Up': record.studentsPickedUp,
      'Total Students': record.totalStudents,
      'Completion Rate': `${Math.round((record.studentsPickedUp / record.totalStudents) * 100)}%`,
      Notes: record.notes || 'None'
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pickup-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Route Completion Repository</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={history.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Badge variant="outline" className="text-sm">
            {totalCompletedRoutes} Total Routes
          </Badge>
        </div>
      </div>

      {/* Active Sessions Management */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Route Sessions - Admin Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSessions.filter((session: any) => session.status === 'in_progress').map((session: any) => (
              <div key={session.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{session.route?.name}</h4>
                    <p className="text-sm text-gray-600">
                      Driver: {session.driver?.firstName} {session.driver?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      Started: {session.startTime ? formatTime(session.startTime) : 'In Progress'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => completeRouteMutation.mutate({ 
                      sessionId: session.id, 
                      notes: "Completed by admin override" 
                    })}
                    disabled={completeRouteMutation.isPending}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                </div>
                
                {/* Show students in this session for absence marking */}
                {session.studentPickups && session.studentPickups.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2">Students on Route:</p>
                    <div className="flex flex-wrap gap-2">
                      {session.studentPickups.map((pickup: any) => {
                        const student = students.find((s: any) => s.id === pickup.studentId);
                        return (
                          <div key={pickup.id} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
                            <span className="text-xs">
                              {student?.firstName} {student?.lastName}
                            </span>
                            <Badge variant={pickup.status === 'picked_up' ? 'default' : 
                                            pickup.status === 'absent' ? 'secondary' : 'outline'}>
                              {pickup.status}
                            </Badge>
                            {pickup.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAbsentMutation.mutate({ 
                                  studentId: pickup.studentId, 
                                  sessionId: session.id,
                                  reason: "Marked absent by admin" 
                                })}
                                disabled={markAbsentMutation.isPending}
                              >
                                <UserX className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <RouteIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{totalCompletedRoutes}</p>
            <p className="text-sm text-gray-600">Completed Routes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{totalStudentsPickedUp}</p>
            <p className="text-sm text-gray-600">Students Picked Up</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{averageCompletionRate}%</p>
            <p className="text-sm text-gray-600">Average Completion</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{recentHistory.length}</p>
            <p className="text-sm text-gray-600">Recent (7 Days)</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by driver name or route..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Pickup History</h3>
            <p className="text-gray-600">
              {searchTerm ? "No records match your search criteria" : "No completed routes found"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredHistory.map((record: any) => (
            <Collapsible key={record.id} open={expandedRoutes.has(record.id)} onOpenChange={() => toggleRouteExpansion(record.id)}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <RouteIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{record.route?.name || `Route ${record.routeId}`}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {record.driver?.firstName} {record.driver?.lastName}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {record.date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(record.completedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{record.studentsPickedUp}/{record.totalStudents}</p>
                        <p className="text-sm text-gray-600">Students</p>
                      </div>
                      <Badge variant={record.studentsPickedUp === record.totalStudents ? "default" : "secondary"}>
                        {Math.round((record.studentsPickedUp / record.totalStudents) * 100)}%
                      </Badge>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${
                            expandedRoutes.has(record.id) ? 'rotate-180' : ''
                          }`} />
                          Details
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent className="pt-4">
                    <RouteBreakdownSection record={record} schools={schools} students={students} />
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}