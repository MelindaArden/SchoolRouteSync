import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, Plus, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface StudentPickup {
  id: number;
  sessionId: number;
  studentId: number;
  schoolId: number;
  pickedUpAt: string | null;
  status: 'pending' | 'picked_up' | 'absent' | 'no_show';
  driverNotes: string | null;
}

interface StudentListProps {
  students: any[];
  isActive: boolean;
  sessionId?: number;
}

export default function StudentList({ students, isActive, sessionId }: StudentListProps) {
  const [pickupStates, setPickupStates] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  console.log('StudentList - Session debug:', { 
    students: students?.length || 0, 
    isActive, 
    sessionId,
    studentsData: students 
  });

  // Fetch student pickups for this session
  const { data: studentPickups = [] } = useQuery<StudentPickup[]>({
    queryKey: [`/api/student-pickups?sessionId=${sessionId}`],
    queryFn: () => fetch(`/api/student-pickups?sessionId=${sessionId}`).then(res => res.json()),
    enabled: !!sessionId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch today's student absences
  const today = new Date().toISOString().split('T')[0];
  const { data: todaysAbsences = [] } = useQuery({
    queryKey: [`/api/student-absences/date/${today}`],
    enabled: !!sessionId,
  });

  // Update pickup states when student pickups data changes
  useEffect(() => {
    if (studentPickups && Array.isArray(studentPickups) && studentPickups.length > 0) {
      const newStates: Record<number, boolean> = {};
      studentPickups.forEach((pickup: StudentPickup) => {
        newStates[pickup.studentId] = pickup.status === "picked_up";
      });
      setPickupStates(newStates);
    }
  }, [studentPickups, sessionId]);

  // Helper function to format pickup time
  const formatPickupTime = (pickedUpAt: string | null) => {
    if (!pickedUpAt) return null;
    const date = new Date(pickedUpAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to check if student is absent today
  const isStudentAbsent = (studentId: number) => {
    return todaysAbsences.some((absence: any) => absence.studentId === studentId);
  };

  // Get pickup data for a student
  const getStudentPickup = (studentId: number): StudentPickup | undefined => {
    return studentPickups.find(pickup => pickup.studentId === studentId);
  };

  const handleTogglePickup = async (student: any) => {
    if (!isActive || !sessionId) {
      console.log('Cannot toggle pickup - not active or no session ID', { isActive, sessionId });
      return;
    }

    const isPickedUp = pickupStates[student.id];
    const newStatus = isPickedUp ? "pending" : "picked_up";

    try {
      // Find the pickup record for this student and session
      const pickup = studentPickups.find((p: StudentPickup) => p.studentId === student.id && p.sessionId === sessionId);
      console.log('Looking for pickup record:', { studentId: student.id, sessionId, pickup, studentPickups });
      
      if (pickup) {
        await apiRequest("PATCH", `/api/student-pickups/${pickup.id}`, {
          status: newStatus,
          pickedUpAt: newStatus === "picked_up" ? new Date().toISOString() : null,
          driverNotes: newStatus === "picked_up" ? "Student picked up successfully" : "",
        });

        setPickupStates(prev => ({
          ...prev,
          [student.id]: !isPickedUp
        }));

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/student-pickups?sessionId=${sessionId}`] });

        toast({
          title: isPickedUp ? "Student marked as not picked up" : "Student picked up",
          description: `${student.firstName} ${student.lastName}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update pickup status",
        variant: "destructive",
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const isPickedUp = pickupStates[student.id];
        const pickup = getStudentPickup(student.id);
        const pickupTime = pickup?.pickedUpAt ? formatPickupTime(pickup.pickedUpAt) : null;
        
        return (
          <div key={student.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {getInitials(student.firstName, student.lastName)}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-xs text-gray-500">Grade {student.grade}</p>
                {isPickedUp && pickupTime && (
                  <p className="text-xs text-green-600 font-medium">
                    Picked up at {pickupTime}
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleTogglePickup(student)}
              disabled={!isActive}
              className={`w-8 h-8 rounded-full p-0 ${
                isPickedUp
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "border-2 border-gray-300 text-gray-400 hover:border-gray-400"
              }`}
            >
              {isPickedUp ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      })}
      
      {students.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No students assigned to this school</p>
        </div>
      )}
    </div>
  );
}
