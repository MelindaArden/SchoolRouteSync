import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users } from "lucide-react";

export default function SchoolsList() {
  // Fetch schools
  const { data: schools = [], isLoading: schoolsLoading } = useQuery({
    queryKey: ['/api/schools'],
  });

  // Fetch students to count per school
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/students'],
  });

  if (schoolsLoading || studentsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const schoolsWithStudentCount = schools.map((school: any) => {
    const studentCount = students.filter((student: any) => student.schoolId === school.id).length;
    return { ...school, studentCount };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Schools ({schools.length})</h3>
      </div>

      {schoolsWithStudentCount.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No schools added yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schoolsWithStudentCount.map((school: any) => (
            <Card key={school.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{school.name}</h4>
                      <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>{school.address}</span>
                      </div>
                    </div>
                    <Badge 
                      variant={school.isActive ? "default" : "secondary"}
                      className={school.isActive ? "bg-green-600" : ""}
                    >
                      {school.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Dismissal: {school.dismissalTime}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{school.studentCount} students</span>
                      </div>
                    </div>
                    
                    {school.contactPhone && (
                      <div className="text-gray-600">
                        <span>{school.contactPhone}</span>
                      </div>
                    )}
                  </div>

                  {school.studentCount > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex flex-wrap gap-1">
                        {students
                          .filter((student: any) => student.schoolId === school.id)
                          .slice(0, 3)
                          .map((student: any) => (
                            <span
                              key={student.id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                            >
                              {student.firstName} {student.lastName}
                            </span>
                          ))}
                        {school.studentCount > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                            +{school.studentCount - 3} more
                          </span>
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
    </div>
  );
}