import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";

export default function AbsenceExport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch all absence data
  const { data: absences = [], isLoading } = useQuery({
    queryKey: ['/api/student-absences'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch students and schools for lookup
  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
  });

  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  // Helper functions
  const getStudentName = (studentId: number) => {
    const student = students.find((s: any) => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : `Student #${studentId}`;
  };

  const getSchoolName = (studentId: number) => {
    const student = students.find((s: any) => s.id === studentId);
    const school = schools.find((s: any) => s.id === student?.schoolId);
    return school ? school.name : 'Unknown School';
  };

  const getMarkedByName = (markedBy: number) => {
    const user = users.find((u: any) => u.id === markedBy);
    return user ? `${user.firstName} ${user.lastName}` : `User #${markedBy}`;
  };

  // Filter absences by date range
  const getFilteredAbsences = () => {
    let filtered = [...absences];
    
    if (startDate) {
      filtered = filtered.filter(absence => 
        new Date(absence.absenceDate) >= new Date(startDate)
      );
    }
    
    if (endDate) {
      filtered = filtered.filter(absence => 
        new Date(absence.absenceDate) <= new Date(endDate)
      );
    }
    
    return filtered.sort((a, b) => new Date(b.absenceDate).getTime() - new Date(a.absenceDate).getTime());
  };

  // Generate CSV content
  const generateCSV = () => {
    const filteredAbsences = getFilteredAbsences();
    
    const headers = [
      'Student Name',
      'School',
      'Absence Date',
      'Reason',
      'Notes',
      'Marked By',
      'Date Submitted',
      'Student Grade',
      'Student Contact',
      'Emergency Contact'
    ];

    let csvContent = headers.join(',') + '\n';

    filteredAbsences.forEach((absence: any) => {
      const student = students.find((s: any) => s.id === absence.studentId);
      const studentName = getStudentName(absence.studentId);
      const schoolName = getSchoolName(absence.studentId);
      const absenceDate = format(new Date(absence.absenceDate), 'MM/dd/yyyy');
      const reason = absence.reason || 'Not specified';
      const notes = absence.notes || '';
      const markedBy = getMarkedByName(absence.markedBy);
      const dateSubmitted = format(new Date(absence.createdAt), 'MM/dd/yyyy h:mm a');
      const grade = student?.grade || '';
      const contact = student?.contactPhone || '';
      const emergencyContact = student?.emergencyContact || '';

      const row = [
        studentName,
        schoolName,
        absenceDate,
        reason,
        notes,
        markedBy,
        dateSubmitted,
        grade,
        contact,
        emergencyContact
      ];

      csvContent += row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });

    return csvContent;
  };

  // Download CSV file
  const downloadCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const now = new Date();
    const timestamp = format(now, 'yyyy-MM-dd_HH-mm');
    const dateRange = startDate && endDate ? `_${startDate}_to_${endDate}` : '';
    const filename = `absence_log${dateRange}_${timestamp}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const filteredAbsences = getFilteredAbsences();
  const totalAbsences = absences.length;
  const filteredCount = filteredAbsences.length;

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
        <h2 className="text-xl font-semibold">Absence Log Export</h2>
        <Badge variant="outline" className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {totalAbsences} total records
        </Badge>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filter & Export Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date (Optional)</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date (Optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {filteredCount} records selected
              </Badge>
              {(startDate || endDate) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
            
            <Button 
              onClick={downloadCSV}
              disabled={filteredCount === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview of filtered data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview - Most Recent Absences</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAbsences.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No absences found for the selected date range</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredAbsences.slice(0, 20).map((absence: any) => (
                <div key={absence.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{getStudentName(absence.studentId)}</div>
                    <div className="text-sm text-gray-600">{getSchoolName(absence.studentId)}</div>
                    {absence.reason && (
                      <div className="text-sm text-gray-600">Reason: {absence.reason}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {format(new Date(absence.absenceDate), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-gray-500">
                      by {getMarkedByName(absence.markedBy)}
                    </div>
                  </div>
                </div>
              ))}
              {filteredAbsences.length > 20 && (
                <div className="text-center py-4 text-gray-500">
                  ... and {filteredAbsences.length - 20} more records (download CSV to see all)
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}