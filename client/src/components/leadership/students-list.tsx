import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GraduationCap, Phone, Mail, Edit, Plus, Search, Trash2, User, History } from "lucide-react";
import StudentForm from "./student-form";
import StudentHistoryModal from "./student-history-modal";

interface StudentsListProps {
  onAddStudent: () => void;
}

export default function StudentsList({ onAddStudent }: StudentsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [historyStudent, setHistoryStudent] = useState<any>(null);
  const { toast } = useToast();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['/api/students'],
  });

  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
  });

  const filteredStudents = (students as any[]).filter((student: any) =>
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.parentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSchoolName = (schoolId: number) => {
    const school = (schools as any[]).find((s: any) => s.id === schoolId);
    return school?.name || 'Unknown School';
  };

  const handleDeleteStudent = async (studentId: number, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}? This will remove them from all routes and pickup records.`)) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/students/${studentId}`);
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      toast({
        title: "Student Deleted",
        description: `${studentName} has been removed.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (editingStudent) {
    return (
      <StudentForm
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Students Management</h2>
        <Button onClick={onAddStudent} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Student
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search students by name or parent name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Students Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "No students match your search criteria" : "No students have been added yet"}
            </p>
            {!searchTerm && (
              <Button onClick={onAddStudent}>Add First Student</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredStudents.map((student: any) => (
            <Card key={student.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <GraduationCap className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {student.firstName} {student.lastName}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Badge variant="outline">Grade {student.grade}</Badge>
                        <span>• {getSchoolName(student.schoolId)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHistoryStudent(student)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="View Student History"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingStudent(student)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStudent(student.id, `${student.firstName} ${student.lastName}`)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Parent:</span>
                    {student.parentName}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      {student.parentPhone}
                    </div>
                    {student.parentEmail && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        {student.parentEmail}
                      </div>
                    )}
                  </div>

                  {student.emergencyContact && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Emergency Contact</div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{student.emergencyContact}</span>
                        {student.emergencyPhone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {student.emergencyPhone}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Student History Modal */}
      {historyStudent && (
        <StudentHistoryModal
          isOpen={!!historyStudent}
          onClose={() => setHistoryStudent(null)}
          studentId={historyStudent.id}
          studentName={`${historyStudent.firstName} ${historyStudent.lastName}`}
        />
      )}
    </div>
  );
}