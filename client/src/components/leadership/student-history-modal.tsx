import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Clock, MapPin, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface StudentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
  studentName: string;
}

export default function StudentHistoryModal({ isOpen, onClose, studentId, studentName }: StudentHistoryModalProps) {
  // Fetch student absences
  const { data: absences = [], isLoading: absencesLoading } = useQuery({
    queryKey: ['/api/students', studentId, 'absences'],
    enabled: isOpen && studentId > 0,
  });

  // Fetch pickup history where student was not picked up
  const { data: pickupHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['/api/pickup-history'],
    enabled: isOpen,
  });

  // Filter pickup history for this student where they were not picked up
  const studentMissedPickups = pickupHistory.filter((record: any) => {
    if (!record.pickupDetails) return false;
    try {
      const pickupDetails = typeof record.pickupDetails === 'string' 
        ? JSON.parse(record.pickupDetails) 
        : record.pickupDetails;
      
      return pickupDetails.some((pickup: any) => 
        pickup.studentId === studentId && pickup.status !== 'picked_up'
      );
    } catch (error) {
      return false;
    }
  });

  const formatDate = (dateStr: string) => {
    try {
      if (!dateStr) return 'Invalid Date';
      const date = new Date(dateStr + 'T00:00:00'); // Add time to prevent timezone issues
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'absent':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Absent</Badge>;
      case 'no_show':
        return <Badge variant="destructive">No Show</Badge>;
      case 'picked_up':
        return <Badge variant="default" className="bg-green-100 text-green-800">Picked Up</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = absencesLoading || historyLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {studentName} - Absence & Pickup History
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="text-center py-8">Loading student history...</div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Absences</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{absences.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Marked absent from school
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Missed Pickups</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{studentMissedPickups.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Not picked up on route
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{absences.length + studentMissedPickups.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Combined attendance issues
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Absence History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  School Absences ({absences.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {absences.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No school absences recorded</p>
                ) : (
                  <div className="space-y-3">
                    {absences.map((absence: any) => (
                      <div key={absence.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{formatDate(absence.absenceDate)}</div>
                          {absence.reason && (
                            <div className="text-sm text-gray-600">Reason: {absence.reason}</div>
                          )}
                          {absence.notes && (
                            <div className="text-sm text-gray-600">Notes: {absence.notes}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge('absent')}
                          {absence.createdAt && (
                            <div className="text-xs text-gray-500">
                              {format(new Date(absence.createdAt), 'MMM d, h:mm a')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Missed Pickup History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Missed Pickups ({studentMissedPickups.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {studentMissedPickups.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No missed pickups recorded</p>
                ) : (
                  <div className="space-y-3">
                    {studentMissedPickups.map((record: any) => {
                      if (!Array.isArray(record.pickupDetails)) return null;
                      
                      const studentPickup = record.pickupDetails.find((pickup: any) => pickup.studentId === studentId);
                      
                      return (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{formatDate(record.completedAt)}</div>
                            <div className="text-sm text-gray-600">Route: {record.routeName}</div>
                            <div className="text-sm text-gray-600">Driver: {record.driverName}</div>
                            {studentPickup?.notes && (
                              <div className="text-sm text-gray-600">Notes: {studentPickup.notes}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(studentPickup?.status || 'no_show')}
                            {record.completedAt && !isNaN(new Date(record.completedAt).getTime()) && (
                              <div className="text-xs text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {format(new Date(record.completedAt), 'h:mm a')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}