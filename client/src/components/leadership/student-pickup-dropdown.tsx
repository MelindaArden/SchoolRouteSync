import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  XCircle, 
  User,
  Clock,
  Phone,
  School
} from "lucide-react";

interface StudentPickupDetail {
  id: number;
  sessionId: number;
  studentId: number;
  schoolId: number;
  status: 'pending' | 'picked_up' | 'absent' | 'no_show';
  pickedUpAt: string | null;
  driverNotes: string | null;
  student: {
    id: number;
    firstName: string;
    lastName: string;
    grade: string;
    phoneNumber: string;
  } | null;
  school: {
    id: number;
    name: string;
    address: string;
  } | null;
}

interface StudentPickupDropdownProps {
  sessionId: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function StudentPickupDropdown({ sessionId, isExpanded, onToggle }: StudentPickupDropdownProps) {
  const { data: studentPickups = [], isLoading } = useQuery<StudentPickupDetail[]>({
    queryKey: [`/api/sessions/${sessionId}/student-pickups-detailed`],
    enabled: isExpanded, // Only fetch when expanded
  });

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'picked_up':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'no_show':
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'picked_up':
        return 'Picked Up';
      case 'no_show':
        return 'No Show';
      case 'absent':
        return 'Absent';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'picked_up':
        return 'bg-green-100 text-green-800';
      case 'no_show':
      case 'absent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Group students by school
  const studentsBySchool = studentPickups.reduce((acc, pickup) => {
    const schoolName = pickup.school?.name || 'Unknown School';
    if (!acc[schoolName]) acc[schoolName] = [];
    acc[schoolName].push(pickup);
    return acc;
  }, {} as Record<string, StudentPickupDetail[]>);

  const pickedUpCount = studentPickups.filter(p => p.status === 'picked_up').length;
  const totalCount = studentPickups.length;

  return (
    <div className="mt-3">
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>Student Pickup Details</span>
          <Badge variant="outline" className="text-xs">
{pickedUpCount}/{totalCount} picked up
          </Badge>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isExpanded && (
        <Card className="mt-2">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading student pickup data...</p>
              </div>
            ) : studentPickups.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No student pickup data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(studentsBySchool).map(([schoolName, pickups]) => (
                  <div key={schoolName} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-1">
                      <School className="h-4 w-4" />
                      <span>{schoolName}</span>
                      <Badge variant="outline" className="text-xs">
                        {pickups.filter(p => p.status === 'picked_up').length}/{pickups.length}
                      </Badge>
                    </div>
                    
                    {pickups.map((pickup) => (
                      <div key={pickup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(pickup.status)}
                          <div>
                            <p className="font-medium text-sm">
                              {pickup.student?.firstName} {pickup.student?.lastName}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Grade {pickup.student?.grade}</span>
                              {pickup.student?.phoneNumber && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{pickup.student.phoneNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge className={`text-xs ${getStatusColor(pickup.status)}`}>
                            {getStatusLabel(pickup.status)}
                          </Badge>
                          {pickup.pickedUpAt && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(pickup.pickedUpAt)}</span>
                            </div>
                          )}
                          {pickup.driverNotes && (
                            <p className="text-xs text-gray-600 mt-1 max-w-32 truncate">
                              Note: {pickup.driverNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}