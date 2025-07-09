import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, School, MapPin, Clock, Users } from "lucide-react";

interface ExpandableRouteCardProps {
  route: any;
  driver: any;
  onEdit: () => void;
}

export default function ExpandableRouteCard({ route, driver, onEdit }: ExpandableRouteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: routeWithSchools } = useQuery({
    queryKey: ['/api/routes/with-schools'],
    select: (data: any) => data.find((r: any) => r.id === route.id),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
  });

  const schools = routeWithSchools?.schools || [];
  const getStudentCount = (schoolId: number) => {
    return students.filter((student: any) => student.schoolId === schoolId).length;
  };

  return (
    <div className="border rounded-lg p-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 h-auto"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <div className="flex-1">
            <p className="font-medium">{route.name}</p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Driver: {driver ? `${driver.firstName} ${driver.lastName}` : 'Unassigned'}</span>
              <span>{schools.length} schools • {schools.reduce((sum, school) => sum + getStudentCount(school.school?.id || 0), 0)} students</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-right text-sm text-gray-600">
            <p>Active: {route.isActive ? 'Yes' : 'No'}</p>
            <p>Created: {new Date(route.createdAt).toLocaleDateString()}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
          >
            Edit
          </Button>
        </div>
      </div>

      {isExpanded && schools.length > 0 && (
        <div className="mt-4 pl-8 border-l-2 border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <School className="h-4 w-4" />
            Assigned Schools
          </h4>
          <div className="space-y-3">
            {schools.map((routeSchool: any) => {
              const school = routeSchool.school;
              if (!school) return null;
              
              const studentCount = getStudentCount(school.id);
              
              return (
                <div key={school.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-gray-800">{school.name}</h5>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                          Order #{routeSchool.order}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {school.address}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          Dismissal: {school.dismissalTime}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          {studentCount} student{studentCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    {school.latitude && school.longitude && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = `https://www.google.com/maps?q=${school.latitude},${school.longitude}`;
                          window.open(url, '_blank');
                        }}
                        className="text-xs"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Map
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isExpanded && schools.length === 0 && (
        <div className="mt-4 pl-8 border-l-2 border-gray-100">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <School className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No schools assigned to this route</p>
            <p className="text-xs text-gray-500 mt-1">Use the edit button to add schools</p>
          </div>
        </div>
      )}
    </div>
  );
}