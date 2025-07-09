import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, UserX, Plus, Trash2, Clock, AlertCircle, Download } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const absenceFormSchema = z.object({
  studentId: z.number().min(1, "Please select a student"),
  absenceDate: z.string().min(1, "Please select an absence date"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export default function StudentAbsenceManagement() {
  // Get current date from server to ensure accuracy
  const { data: serverDate } = useQuery({
    queryKey: ['/api/student-absences/date'],
    refetchInterval: 60000, // Refresh every minute to keep date current
  });
  
  const currentDate = serverDate?.date || format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(currentDate);

  // Update selectedDate when server date is available
  React.useEffect(() => {
    if (serverDate?.date) {
      setSelectedDate(serverDate.date);
    }
  }, [serverDate?.date]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof absenceFormSchema>>({
    resolver: zodResolver(absenceFormSchema),
    defaultValues: {
      absenceDate: currentDate,
      reason: '',
      notes: '',
    }
  });

  // Update form default date when server date is available
  React.useEffect(() => {
    if (serverDate?.date) {
      form.setValue('absenceDate', serverDate.date);
      setSelectedDate(serverDate.date);
    }
  }, [serverDate?.date, form]);

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
  });

  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
  });

  // Create lookup for school names
  const getSchoolName = (schoolId: number) => {
    const school = schools.find((s: any) => s.id === schoolId);
    return school ? school.name : 'Unknown School';
  };

  // FIX #4: Show absence date instead of submission date
  const formatAbsenceDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  // FIX #5: ABSENCES NOT SHOWING - ENHANCED REAL-TIME REFRESH
  const { data: allAbsences = [], isLoading } = useQuery({
    queryKey: ['/api/student-absences'],
    refetchInterval: 5000, // Faster refresh every 5 seconds
    staleTime: 0, // Always refetch for immediate updates
  });

  // Filter absences to only show today and future dates (past absences are available in student history)
  const absences = allAbsences.filter((absence: any) => {
    try {
      const absenceDate = new Date(absence.absenceDate).toISOString().split('T')[0];
      return absenceDate >= currentDate; // Only show today and future
    } catch (error) {
      return false;
    }
  });

  // Now absences is already filtered to only show current and future dates
  const filteredAbsences = absences;

  // Get absences for the selected date (used in the date picker section)
  const getSelectedDateAbsences = () => {
    try {
      const targetDate = selectedDate; // Use the selected date from the date picker
      const filtered = allAbsences.filter(absence => {
        try {
          const absenceDate = new Date(absence.absenceDate).toISOString().split('T')[0];
          return absenceDate === targetDate;
        } catch (error) {
          console.error('Error filtering selected date absences:', error, absence);
          return false;
        }
      });
      return filtered;
    } catch (error) {
      console.error('Error getting selected date absences:', error);
      return [];
    }
  };

  // Get ONLY today's absences (used for the main "Today's Absences" section)
  const getTodaysAbsences = () => {
    try {
      const todayDate = currentDate; // Always use current date, not selected date
      const filtered = allAbsences.filter(absence => {
        try {
          const absenceDate = new Date(absence.absenceDate).toISOString().split('T')[0];
          return absenceDate === todayDate;
        } catch (error) {
          console.error('Error filtering today absences:', error, absence);
          return false;
        }
      });
      return filtered;
    } catch (error) {
      console.error('Error getting today absences:', error);
      return [];
    }
  };

  const getUpcomingAbsences = () => {
    try {
      const todayStr = currentDate; // Use server-provided current date
      return absences.filter(absence => {
        try {
          const absenceDate = new Date(absence.absenceDate).toISOString().split('T')[0];
          // Only show future absences (after today)
          return absenceDate > todayStr;
        } catch (error) {
          console.error('Error filtering upcoming absences:', error, absence);
          return false;
        }
      });
    } catch (error) {
      console.error('Error getting upcoming absences:', error);
      return [];
    }
  };

  const { data: todaysAbsences = [], refetch: refetchTodaysAbsences } = useQuery({
    queryKey: ['/api/student-absences/date', selectedDate],
    refetchInterval: 3000, // Very fast refresh every 3 seconds for today's absences
    staleTime: 0, // Always refetch for immediate updates
  });

  const createAbsenceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof absenceFormSchema>) => {
      console.log('Creating absence with data:', data);
      return apiRequest('POST', '/api/student-absences', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Student absence marked successfully" });
      // FIX #5: FORCE IMMEDIATE REFRESH TO SHOW ABSENCES
      queryClient.invalidateQueries({ queryKey: ['/api/student-absences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student-absences/date'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student-absences/date', selectedDate] });
      // Force immediate refetch to ensure absences show immediately
      refetchTodaysAbsences();
      setIsDialogOpen(false);
      form.reset({
        absenceDate: format(new Date(), 'yyyy-MM-dd'),
        reason: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      console.error('Absence creation error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to mark student absence. Please ensure you're logged in and try again.", 
        variant: "destructive" 
      });
    }
  });

  const deleteAbsenceMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/student-absences/${id}`),
    onSuccess: () => {
      toast({ title: "Success", description: "Student absence removed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/student-absences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/student-absences/date'] });
      // Force refresh of current date view for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/student-absences/date', selectedDate] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove student absence", variant: "destructive" });
    }
  });

  const onSubmit = (data: z.infer<typeof absenceFormSchema>) => {
    createAbsenceMutation.mutate(data);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };

  const getStudentName = (studentId: number) => {
    const student = students.find((s: any) => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : `Student #${studentId}`;
  };

  const getStudentSchool = (studentId: number) => {
    const student = students.find((s: any) => s.id === studentId);
    return student ? getSchoolName(student.schoolId) : 'Unknown School';
  };

  // FIX #4: Show upcoming absences using absence date instead of creation date
  const upcomingAbsences = getUpcomingAbsences();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Student Absence Management</h2>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Mark Student Absent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark Student Absent</DialogTitle>
              </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((student: any) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.firstName} {student.lastName} - {getSchoolName(student.schoolId)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="absenceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Absence Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Sick, appointment, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createAbsenceMutation.isPending}>
                    {createAbsenceMutation.isPending ? "Marking..." : "Mark Absent"}
                  </Button>
                </div>
              </form>
            </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Absences</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTodaysAbsences().length}</div>
            <p className="text-xs text-muted-foreground">
              Students marked absent today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Absences</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAbsences.length}</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">
              Students in system
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Absences (actual today) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Today's Absences - {currentDate ? format(new Date(currentDate + 'T00:00:00'), 'MMMM d, yyyy') : 'Loading...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getTodaysAbsences().length === 0 ? (
            <p className="text-center text-gray-500 py-8">No absences marked for today</p>
          ) : (
            <div className="space-y-3">
              {getTodaysAbsences().map((absence: any) => (
                <div key={absence.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{getStudentName(absence.studentId)}</div>
                    <div className="text-sm text-gray-600">{getStudentSchool(absence.studentId)}</div>
                    {absence.reason && (
                      <div className="text-sm text-gray-600">Reason: {absence.reason}</div>
                    )}
                    {absence.notes && (
                      <div className="text-sm text-gray-600">Notes: {absence.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <Calendar className="h-3 w-3 mr-1" />
                      Absent Today
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAbsenceMutation.mutate(absence.id)}
                      disabled={deleteAbsenceMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Picker Section for viewing specific dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            View Absences by Date - {selectedDate ? format(new Date(selectedDate + 'T00:00:00'), 'MMMM d, yyyy') : 'Loading...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="date-select">Select Date (Current: {currentDate}):</Label>
            <Input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />

          </div>
          
          {getSelectedDateAbsences().length === 0 ? (
            <p className="text-center text-gray-500 py-8">No absences marked for this date</p>
          ) : (
            <div className="space-y-3">
              {getSelectedDateAbsences().map((absence: any) => (
                <div key={absence.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{getStudentName(absence.studentId)}</div>
                    <div className="text-sm text-gray-600">{getStudentSchool(absence.studentId)}</div>
                    {absence.reason && (
                      <div className="text-sm text-gray-600">Reason: {absence.reason}</div>
                    )}
                    {absence.notes && (
                      <div className="text-sm text-gray-600">Notes: {absence.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <Calendar className="h-3 w-3 mr-1" />
                      Absent: {formatAbsenceDate(absence.absenceDate)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAbsenceMutation.mutate(absence.id)}
                      disabled={deleteAbsenceMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Absences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Absences (Next 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAbsences.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No upcoming absences</p>
          ) : (
            <div className="space-y-3">
              {upcomingAbsences.map((absence: any) => (
                <div key={absence.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{getStudentName(absence.studentId)}</div>
                    <div className="text-sm text-gray-600">{getStudentSchool(absence.studentId)}</div>
                    {absence.reason && (
                      <div className="text-sm text-gray-600">Reason: {absence.reason}</div>
                    )}
                    {absence.notes && (
                      <div className="text-sm text-gray-600">Notes: {absence.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      Absent: {formatAbsenceDate(absence.absenceDate)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAbsenceMutation.mutate(absence.id)}
                      disabled={deleteAbsenceMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}