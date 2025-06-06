import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { School, MapPin, Phone, Clock, Edit, Plus, Search } from "lucide-react";
import SchoolForm from "./school-form";

interface SchoolsListProps {
  onAddSchool: () => void;
}

export default function SchoolsList({ onAddSchool }: SchoolsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSchool, setEditingSchool] = useState<any>(null);

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ['/api/schools'],
  });

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
  });

  const filteredSchools = schools.filter((school: any) =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStudentCount = (schoolId: number) => {
    return students.filter((student: any) => student.schoolId === schoolId).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (editingSchool) {
    return (
      <SchoolForm 
        school={editingSchool} 
        onClose={() => setEditingSchool(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Schools Management</h2>
        <Button onClick={onAddSchool} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add School
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search schools by name or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredSchools.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Schools Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "No schools match your search criteria" : "No schools have been added yet"}
            </p>
            {!searchTerm && (
              <Button onClick={onAddSchool}>Add First School</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSchools.map((school: any) => (
            <Card key={school.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <School className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{school.name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <MapPin className="h-3 w-3" />
                        {school.address}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {getStudentCount(school.id)} students
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSchool(school)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    Dismissal: {school.dismissalTime}
                  </div>
                  {school.contactPhone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      {school.contactPhone}
                    </div>
                  )}
                </div>
                
                {school.latitude && school.longitude && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `https://www.google.com/maps?q=${school.latitude},${school.longitude}`;
                        window.open(url, '_blank');
                      }}
                      className="flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      View on Map
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}