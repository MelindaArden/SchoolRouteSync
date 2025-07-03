import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, User, Route as RouteIcon, Calendar, CheckCircle, XCircle, Search, Eye, Download } from "lucide-react";
import { format } from "date-fns";

export default function PickupHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['/api/pickup-history'],
  }) as { data: any[], isLoading: boolean };

  const filteredHistory = history.filter((record: any) =>
    record.driver?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.driver?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.route?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (date: string | Date) => {
    return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
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

            {selectedRecord.pickupDetails && selectedRecord.pickupDetails.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">Student Pickup Details</h3>
                <div className="space-y-2">
                  {selectedRecord.pickupDetails.map((pickup: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        {pickup.status === "picked_up" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">Student #{pickup.studentId}</p>
                          <p className="text-sm text-gray-600">School #{pickup.schoolId}</p>
                          {pickup.driverNotes && (
                            <p className="text-xs text-gray-500 mt-1">{pickup.driverNotes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={pickup.status === "picked_up" ? "default" : "destructive"}>
                          {pickup.status}
                        </Badge>
                        {pickup.pickedUpAt && (
                          <p className="text-xs text-gray-600 mt-1">
                            {formatTime(pickup.pickedUpAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Route Completion Repository</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={history.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Badge variant="outline" className="text-sm">
            {totalCompletedRoutes} Total Routes
          </Badge>
        </div>
      </div>

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

      {filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Pickup History</h3>
            <p className="text-gray-600">
              {searchTerm ? "No records match your search criteria" : "No completed routes found"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredHistory.map((record: any) => (
            <Card key={record.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <RouteIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{record.route?.name || `Route ${record.routeId}`}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {record.driver?.firstName} {record.driver?.lastName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {record.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(record.completedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{record.studentsPickedUp}/{record.totalStudents}</p>
                      <p className="text-sm text-gray-600">Students</p>
                    </div>
                    <Badge variant={record.studentsPickedUp === record.totalStudents ? "default" : "secondary"}>
                      {Math.round((record.studentsPickedUp / record.totalStudents) * 100)}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}