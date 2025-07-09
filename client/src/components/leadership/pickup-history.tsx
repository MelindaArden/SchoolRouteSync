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

  // CSV Download functionality
  const downloadCSVLog = () => {
    try {
      const csvData = generateCSVData();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `pickup_transportation_log_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Complete",
        description: "Transportation log has been downloaded successfully."
      });
    } catch (error) {
      console.error('CSV download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to generate transportation log.",
        variant: "destructive"
      });
    }
  };

  const generateCSVData = () => {
    // CSV Headers matching the requested information
    const headers = [
      "Child's Name",
      "Pick-Up Location", 
      "Pick-Up Time",
      "Drop-Off Location",
      "Drop-Off Time", 
      "Driver's Name",
      "Vehicle Information",
      "Parent/Guardian Contact Information",
      "Date",
      "Route Name",
      "Status",
      "Driver Notes",
      "Session ID"
    ];

    let csvContent = headers.join(',') + '\n';

    // Process each history record
    filteredHistory.forEach((record: any) => {
      let pickupDetails = [];
      try {
        pickupDetails = record.pickupDetails ? JSON.parse(record.pickupDetails) : [];
      } catch (e) {
        console.error('Error parsing pickup details:', e);
      }

      // If no pickup details, create a summary row
      if (pickupDetails.length === 0) {
        const row = [
          "No students recorded",
          "Multiple locations",
          record.completedAt ? format(new Date(record.completedAt), 'h:mm a') : 'N/A',
          "Aftercare facilities",
          record.completedAt ? format(new Date(record.completedAt), 'h:mm a') : 'N/A',
          `${record.driver?.firstName || ''} ${record.driver?.lastName || ''}`.trim(),
          `Vehicle ID: ${record.driver?.id || 'N/A'}`,
          record.driver?.phone || 'N/A',
          format(new Date(record.date), 'MM/dd/yyyy'),
          record.route?.name || 'Unknown Route',
          'Completed',
          record.notes || 'No notes',
          record.sessionId?.toString() || 'N/A'
        ];
        csvContent += row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        return;
      }

      // Create a row for each student pickup
      pickupDetails.forEach((pickup: any) => {
        const student = students.find((s: any) => s.id === pickup.studentId);
        const school = schools.find((s: any) => s.id === student?.schoolId);
        
        const childName = student ? `${student.firstName} ${student.lastName}` : 'Unknown Student';
        const pickupLocation = school?.name || 'Unknown School';
        const pickupTime = pickup.pickedUpAt ? format(new Date(pickup.pickedUpAt), 'h:mm a') : 'Not picked up';
        const dropOffLocation = "Aftercare Facility"; // Default destination
        const dropOffTime = pickup.pickedUpAt ? format(new Date(new Date(pickup.pickedUpAt).getTime() + 30*60000), 'h:mm a') : 'N/A'; // Estimated 30 min later
        const driverName = `${record.driver?.firstName || ''} ${record.driver?.lastName || ''}`.trim();
        const vehicleInfo = `Driver ID: ${record.driver?.id || 'N/A'}, Phone: ${record.driver?.phone || 'N/A'}`;
        const parentContact = student?.contactPhone || student?.emergencyContact || 'Contact not available';
        const date = format(new Date(record.date), 'MM/dd/yyyy');
        const routeName = record.route?.name || 'Unknown Route';
        const status = pickup.status === 'picked_up' ? 'Transported' : 
                     pickup.status === 'absent' ? 'Absent' : 
                     pickup.status === 'no_show' ? 'No Show' : 'Pending';
        const driverNotes = pickup.driverNotes || record.notes || 'No notes';
        const sessionId = record.sessionId?.toString() || 'N/A';

        const row = [
          childName,
          pickupLocation,
          pickupTime,
          dropOffLocation,
          dropOffTime,
          driverName,
          vehicleInfo,
          parentContact,
          date,
          routeName,
          status,
          driverNotes,
          sessionId
        ];

        csvContent += row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
      });
    });

    return csvContent;
  };



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

  // Group history by time periods for organization
  const groupHistoryByPeriod = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const grouped = {
      today: [] as any[],
      thisWeek: [] as any[],
      thisMonth: [] as any[],
      older: [] as any[]
    };
    
    history.forEach((record: any) => {
      const recordDate = new Date(record.completedAt);
      const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
      
      if (recordDateOnly.getTime() === today.getTime()) {
        grouped.today.push(record);
      } else if (recordDate >= thisWeek) {
        grouped.thisWeek.push(record);
      } else if (recordDate >= thisMonth) {
        grouped.thisMonth.push(record);
      } else {
        grouped.older.push(record);
      }
    });
    
    return grouped;
  };

  const groupedHistory = groupHistoryByPeriod();

  // RouteHistoryCard component for consistent display
  const RouteHistoryCard = ({ record, onSelect }: { record: any; onSelect: (record: any) => void }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <RouteIcon className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">
                  {record.route?.name || `Route ${record.routeId}`}
                </h3>
                <p className="text-sm text-gray-600">
                  Driver: {record.driver?.firstName} {record.driver?.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  Completed: {formatTime(record.completedAt)}
                </p>
                {/* Show school and student info */}
                {record.pickupDetails && record.pickupDetails.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-gray-400">
                      Schools: {[...new Set(record.pickupDetails.map((p: any) => p.schoolName).filter(Boolean))].join(', ')}
                    </p>
                    <p className="text-xs text-gray-400">
                      Students: {record.pickupDetails.map((p: any) => p.studentName).filter(Boolean).slice(0, 3).join(', ')}
                      {record.pickupDetails.length > 3 ? '...' : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{record.studentsPickedUp}</span>
              </div>
              <p className="text-xs text-gray-500">picked up</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">{record.totalStudents - record.studentsPickedUp}</span>
              </div>
              <p className="text-xs text-gray-500">missed</p>
            </div>
            
            <div className="text-center">
              <Badge variant={record.studentsPickedUp === record.totalStudents ? "default" : "secondary"}>
                {Math.round((record.studentsPickedUp / record.totalStudents) * 100)}%
              </Badge>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onSelect(record)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Route Completion Repository</h2>
        <div className="flex items-center gap-2">
          <Button 
            onClick={downloadCSVLog} 
            className="flex items-center gap-2"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            Download Transportation Log
          </Button>
          <Select value={selectedRecord ? "detailed" : "overview"} onValueChange={(value) => {
            if (value === "overview") setSelectedRecord(null);
            else {
              const record = history.find((h: any) => h.id.toString() === value);
              if (record) setSelectedRecord(record);
            }
          }}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">History Overview</SelectItem>
              {history.map((record: any) => {
                let pickupDetails = [];
                try {
                  pickupDetails = record.pickupDetails ? JSON.parse(record.pickupDetails) : [];
                } catch (e) {
                  console.error('Error parsing pickup details:', e);
                }
                
                // Get student names and schools from the pickup details
                const studentsWithPickup = pickupDetails.map((pickup: any) => {
                  const student = students.find((s: any) => s.id === pickup.studentId);
                  const school = schools.find((s: any) => s.id === student?.schoolId);
                  return {
                    studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
                    schoolName: school?.name || 'Unknown School',
                    status: pickup.status,
                    pickedUp: pickup.status === 'picked_up'
                  };
                });
                
                const schoolsInRoute = [...new Set(studentsWithPickup.map(s => s.schoolName).filter(Boolean))];
                const pickedUpStudents = studentsWithPickup.filter(s => s.pickedUp);
                const missedStudents = studentsWithPickup.filter(s => !s.pickedUp);
                
                return (
                  <SelectItem key={record.id} value={record.id.toString()}>
                    <div className="flex flex-col">
                      <span>{record.route?.name || `Route ${record.routeId}`} - {record.driver?.firstName} {record.driver?.lastName}</span>
                      <span className="text-xs">{format(new Date(record.completedAt), 'MMM d, yyyy')}</span>
                      {schoolsInRoute.length > 0 && (
                        <span className="text-xs text-gray-500">
                          Schools: {schoolsInRoute.join(', ')}
                        </span>
                      )}
                      {pickedUpStudents.length > 0 && (
                        <span className="text-xs text-green-600">
                          ✓ Picked up: {pickedUpStudents.map(s => s.studentName).slice(0, 2).join(', ')}{pickedUpStudents.length > 2 ? '...' : ''}
                        </span>
                      )}
                      {missedStudents.length > 0 && (
                        <span className="text-xs text-red-600">
                          ✗ Missed: {missedStudents.map(s => s.studentName).slice(0, 2).join(', ')}{missedStudents.length > 2 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

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

      {/* Time-based History Organization */}
      <div className="space-y-6">
        {/* Today's History */}
        {groupedHistory.today.length > 0 && (
          <Collapsible open={expandedRoutes.has(-1)} onOpenChange={() => toggleRouteExpansion(-1)}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedRoutes.has(-1) ? 'rotate-180' : ''}`} />
              <h3 className="font-semibold text-blue-900">Today ({groupedHistory.today.length} routes)</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {groupedHistory.today.map((record: any) => (
                <RouteHistoryCard key={record.id} record={record} onSelect={setSelectedRecord} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* This Week's History */}
        {groupedHistory.thisWeek.length > 0 && (
          <Collapsible open={expandedRoutes.has(-2)} onOpenChange={() => toggleRouteExpansion(-2)}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedRoutes.has(-2) ? 'rotate-180' : ''}`} />
              <h3 className="font-semibold text-green-900">This Week ({groupedHistory.thisWeek.length} routes)</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {groupedHistory.thisWeek.map((record: any) => (
                <RouteHistoryCard key={record.id} record={record} onSelect={setSelectedRecord} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* This Month's History */}
        {groupedHistory.thisMonth.length > 0 && (
          <Collapsible open={expandedRoutes.has(-3)} onOpenChange={() => toggleRouteExpansion(-3)}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedRoutes.has(-3) ? 'rotate-180' : ''}`} />
              <h3 className="font-semibold text-orange-900">This Month ({groupedHistory.thisMonth.length} routes)</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {groupedHistory.thisMonth.map((record: any) => (
                <RouteHistoryCard key={record.id} record={record} onSelect={setSelectedRecord} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Older History */}
        {groupedHistory.older.length > 0 && (
          <Collapsible open={expandedRoutes.has(-4)} onOpenChange={() => toggleRouteExpansion(-4)}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedRoutes.has(-4) ? 'rotate-180' : ''}`} />
              <h3 className="font-semibold text-gray-900">Older ({groupedHistory.older.length} routes)</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {groupedHistory.older.map((record: any) => (
                <RouteHistoryCard key={record.id} record={record} onSelect={setSelectedRecord} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {history.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">No route completion history found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}